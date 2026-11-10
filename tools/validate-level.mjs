#!/usr/bin/env node
// Checks Feed Squeek level files before they go into the game. Node 18 or newer, no install.
//   node tools/validate-level.mjs levels/<id>.js [more files]
//   node tools/validate-level.mjs --json levels/<id>.js      one JSON result per file, for tools/ingest.mjs
// A level file is public code that runs in every player's browser, so the check is strict: one FeedSqueek.level({...})
// call with literal data, and a room painter that may only compute and draw (LEVELS.md, "What the check allows"). It
// then runs the painter against a recording canvas at two screen sizes. Exit code 0 means every file passed.
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as acorn from "./vendor/acorn.mjs";
import { CTX_FN, CTX_PROP, makeKit, mulberry, seedOf } from "./level-kit.mjs";

const MAX_BYTES = 64 * 1024;
const MAX_DRAW_CALLS = 120_000;
const SIZES = [[1440, 900], [390, 844]];
const KEYS = ["id", "name", "cue", "start", "speed", "order", "weapon", "paint"];
const REQUIRED = ["id", "name", "cue", "start", "speed", "paint"];
const ORDER_KEYS = { job: "uuid", theme: 140, weapon: 100, snacks: "int", faster: "int" };
export const WEAPON = {
  name: ["string", 40], reload: ["number", 0.06, 1.2], auto: ["boolean"], pellets: ["int", 1, 8], spread: ["number", 0, 80],
  radius: ["number", 0.5, 2.5], recoil: ["number", 0, 2], sound: ["enum", "shot", "auto"],
  reticle: ["enum", "cross", "dot", "ring", "chevron"], tint: ["color"],
};
// The only global names a painter may use. They cannot be declared, and Math can only be read as Math.name.
const GLOBALS = new Set(["Math", "Infinity", "NaN", "undefined"]);
// Property names that lead from a value to its constructor, prototype, the canvas or the page.
const DENY_PROPS = new Set(["constructor", "__proto__", "prototype", "__defineGetter__", "__defineSetter__", "__lookupGetter__",
  "__lookupSetter__", "caller", "callee", "arguments", "call", "apply", "bind", "canvas", "ownerDocument", "defaultView", "getRootNode",
  "globalThis", "self", "window", "document", "importScripts", "postMessage", "fetch", "eval"]);
const NODES = new Set(["BlockStatement", "ExpressionStatement", "VariableDeclaration", "VariableDeclarator", "FunctionDeclaration",
  "FunctionExpression", "ArrowFunctionExpression", "ReturnStatement", "IfStatement", "ForStatement", "ForOfStatement", "WhileStatement",
  "DoWhileStatement", "BreakStatement", "ContinueStatement", "SwitchStatement", "SwitchCase", "EmptyStatement", "Identifier", "Literal",
  "TemplateLiteral", "TemplateElement", "ArrayExpression", "ObjectExpression", "Property", "SpreadElement", "RestElement", "ArrayPattern",
  "ObjectPattern", "AssignmentPattern", "MemberExpression", "CallExpression", "BinaryExpression", "LogicalExpression", "UnaryExpression",
  "UpdateExpression", "AssignmentExpression", "ConditionalExpression", "SequenceExpression"]);
// Operators whose result is always a number.
const NUM_OPS = new Set(["-", "*", "/", "%", "**", "|", "&", "^", "<<", ">>", ">>>"]);

const isStr = (n) => n && n.type === "Literal" && typeof n.value === "string";
const isNum = (n) => n && n.type === "Literal" && typeof n.value === "number";
const keyName = (p) => (p.key.type === "Identifier" ? p.key.name : String(p.key.value));
const at = (n) => (n && n.loc ? ` (line ${n.loc.start.line})` : "");
// Text a player sees: no links, markup or control characters.
export const textOk = (t) => !/[<>\u0000-\u001f]|https?:|www\.|\.(com|xyz|io|fun|net|org|app|site|link|gg|me|co)\b/i.test(t);

const patternNames = (pt, out = []) => {
  if (!pt) return out;
  if (pt.type === "Identifier") out.push(pt.name);
  else if (pt.type === "ArrayPattern") pt.elements.forEach((e) => patternNames(e, out));
  else if (pt.type === "ObjectPattern") pt.properties.forEach((q) => patternNames(q.type === "RestElement" ? q.argument : q.value, out));
  else if (pt.type === "AssignmentPattern") patternNames(pt.left, out);
  else if (pt.type === "RestElement") patternNames(pt.argument, out);
  return out;
};
const literalObject = (node) => Object.fromEntries(node.properties.map((p) => [keyName(p), p.value.value]));

export function checkSource(src, stem) {
  const errs = [];
  const fail = (m) => { errs.push(m); };
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: "script", locations: true }); }
  catch (e) { return { errors: [`does not parse: ${e.message}`] }; }

  // 1. The shape: FeedSqueek.level({ ... }) and nothing else, with literal data.
  const st = ast.body;
  const call = st.length === 1 && st[0].type === "ExpressionStatement" ? st[0].expression : null;
  if (!call || call.type !== "CallExpression" || call.callee.type !== "MemberExpression" || call.callee.computed ||
      call.callee.object.type !== "Identifier" || call.callee.object.name !== "FeedSqueek" || call.callee.property.name !== "level" ||
      call.arguments.length !== 1 || call.arguments[0].type !== "ObjectExpression") {
    return { errors: ["the file must contain exactly one statement: FeedSqueek.level({ ... })"] };
  }
  const def = {};
  for (const p of call.arguments[0].properties) {
    if (p.type !== "Property" || p.computed || p.kind !== "init") { fail("every field of the level must be a plain key: value"); continue; }
    const k = keyName(p);
    if (!KEYS.includes(k)) fail(`unknown field "${k}"`);
    else if (def[k]) fail(`field "${k}" appears twice`);
    else def[k] = p.value;
  }
  for (const k of REQUIRED) if (!def[k]) fail(`missing field "${k}"`);
  if (errs.length) return { errors: errs };

  if (!isStr(def.id) || def.id.value !== stem) fail(`id must be the string "${stem}", the file name without .js`);
  for (const k of ["name", "cue"]) if (!isStr(def[k]) || !def[k].value.trim() || def[k].value.length > 40 || !textOk(def[k].value)) fail(`${k} must be a string of 1-40 characters with no links or markup`);
  if (!isNum(def.start) || !Number.isInteger(def.start.value) || def.start.value < 8 || def.start.value > 40) fail("start must be a whole number from 8 to 40");
  if (!isNum(def.speed) || def.speed.value < 1 || def.speed.value > 2) fail("speed must be a number from 1 to 2 (1 + faster percent / 100)");
  if (def.order) {
    if (def.order.type !== "ObjectExpression") fail("order must be an object");
    else for (const p of def.order.properties) {
      const k = p.type === "Property" && !p.computed && p.kind === "init" ? keyName(p) : null, rule = ORDER_KEYS[k];
      if (!rule) { fail(`unknown order field "${k}"`); continue; }
      const v = p.value;
      if (rule === "uuid" ? !(isStr(v) && /^[0-9a-f-]{36}$/.test(v.value)) : rule === "int" ? !(isNum(v) && Number.isInteger(v.value)) :
          !(isStr(v) && v.value.length <= rule && textOk(v.value))) fail(`order.${k} is not valid`);
    }
  }
  if (def.weapon) {
    if (def.weapon.type !== "ObjectExpression") fail("weapon must be an object");
    else for (const p of def.weapon.properties) {
      const k = p.type === "Property" && !p.computed && p.kind === "init" ? keyName(p) : null, rule = WEAPON[k], v = p.value;
      if (!rule) { fail(`unknown weapon field "${k}"`); continue; }
      const [t, a, b] = rule;
      const ok = t === "string" ? isStr(v) && v.value.trim() && v.value.length <= a && textOk(v.value)
        : t === "number" ? isNum(v) && v.value >= a && v.value <= b
        : t === "int" ? isNum(v) && Number.isInteger(v.value) && v.value >= a && v.value <= b
        : t === "boolean" ? v.type === "Literal" && typeof v.value === "boolean"
        : t === "enum" ? isStr(v) && rule.slice(1).includes(v.value)
        : isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v.value);
      if (!ok) fail(`weapon.${k} is out of range (LEVELS.md, "Weapon")`);
    }
  }
  const paint = def.paint;
  if (!["FunctionExpression", "ArrowFunctionExpression"].includes(paint.type) || paint.async || paint.generator) fail("paint must be a function (c, r, k) { ... }");
  else if (paint.params.length > 3 || paint.params.some((q) => q.type !== "Identifier")) fail("paint takes up to three plain parameters: (c, r, k)");
  else if (paint.body.type !== "BlockStatement") fail("paint must have a { ... } body");
  if (errs.length) return { errors: errs };

  // 2. The painter may only compute and draw.
  // Every name must resolve to a parameter or a let, const or function of an enclosing scope, or to GLOBALS. A computed
  // index x[i] must be a number, so each variable is tracked as "only ever holds numbers" or not. The walk runs twice:
  // the first pass links names to their variables, the second checks with the number tracking settled.
  const walkAll = (n, fn) => {
    if (!n || typeof n.type !== "string") return;
    fn(n);
    for (const k of Object.keys(n)) {
      if (k === "loc") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === "string" && walkAll(x, fn));
      else if (v && typeof v.type === "string") walkAll(v, fn);
    }
  };
  const scopes = new Map(), refs = new Map(), vars = [], strings = [];
  let checking = false;
  const vfail = (m) => { if (checking) fail(m); };
  const isNumericExpr = (e) => {
    if (!e) return false;
    switch (e.type) {
      case "Literal": return typeof e.value === "number";
      case "Identifier": { const v = refs.get(e); return !!v && v.numeric; }
      case "UnaryExpression": return ["-", "+", "~"].includes(e.operator);
      case "UpdateExpression": return true;
      case "BinaryExpression": return NUM_OPS.has(e.operator) || (e.operator === "+" && isNumericExpr(e.left) && isNumericExpr(e.right));
      case "ConditionalExpression": return isNumericExpr(e.consequent) && isNumericExpr(e.alternate);
      case "CallExpression": return e.callee.type === "MemberExpression" && !e.callee.computed && e.callee.object.type === "Identifier" && e.callee.object.name === "Math";
      default: return false;
    }
  };
  // entries: [name, numeric candidate]. Only a plain `let x = ...` or `const x = ...` can hold only numbers.
  const blockDecls = (stmts, out = []) => {
    for (const s of stmts) {
      if (s.type === "VariableDeclaration") s.declarations.forEach((d) => patternNames(d.id).forEach((x) => out.push([x, d.id.type === "Identifier"])));
      else if (s.type === "FunctionDeclaration" && s.id) out.push([s.id.name, false]);
    }
    return out;
  };
  const scope = (parent, decls, node) => {
    let m = scopes.get(node);
    if (!m) {
      m = new Map();
      for (const [x, num] of decls) { const v = { numeric: num, inits: [], writes: [] }; m.set(x, v); vars.push(v); }
      scopes.set(node, m);
    }
    for (const [x] of decls) if (GLOBALS.has(x) || DENY_PROPS.has(x)) vfail(`the name "${x}" cannot be declared${at(node)}`);
    return { parent, names: m };
  };
  const lookup = (s, name) => { for (; s; s = s.parent) if (s.names.has(name)) return s.names.get(name); return null; };
  const notNumeric = (s, names) => names.forEach((x) => { const v = lookup(s, x); if (v) v.numeric = false; });
  // A write may not change Math.
  const checkTarget = (t) => walkAll(t, (n) => {
    if (n.type === "MemberExpression" && n.object.type === "Identifier" && n.object.name === "Math") vfail(`Math cannot be changed${at(n)}`);
  });
  const visitPattern = (p, s, isWrite) => {
    if (!p) return;
    if (!NODES.has(p.type)) return vfail(`${p.type} is not allowed in paint${at(p)}`);
    switch (p.type) {
      case "Identifier": if (isWrite) visit(p, s, null); return;
      case "MemberExpression": if (!isWrite) vfail(`a declaration cannot name a property${at(p)}`); visit(p, s, null); return;
      case "ObjectPattern":
        for (const q of p.properties) {
          if (q.type === "RestElement") { visitPattern(q.argument, s, isWrite); continue; }
          if (q.computed) { if (!isNumericExpr(q.key)) vfail(`computed keys need a number${at(q)}`); visit(q.key, s, q); }
          else if (DENY_PROPS.has(keyName(q))) vfail(`the key "${keyName(q)}" is not allowed${at(q)}`);
          visitPattern(q.value, s, isWrite);
        }
        return;
      case "ArrayPattern": p.elements.forEach((e) => visitPattern(e, s, isWrite)); return;
      case "AssignmentPattern": visitPattern(p.left, s, isWrite); visit(p.right, s, p); return;
      case "RestElement": visitPattern(p.argument, s, isWrite); return;
      default: vfail(`${p.type} cannot be assigned to${at(p)}`);
    }
  };
  const visitFunction = (n, s) => {
    if (n.async || n.generator) vfail(`async and generator functions are not allowed${at(n)}`);
    const decls = n.params.flatMap((q) => patternNames(q)).map((x) => [x, false]);
    if (n.type === "FunctionExpression" && n.id) decls.push([n.id.name, false]);
    if (n.body.type === "BlockStatement") blockDecls(n.body.body, decls);
    const fs = scope(s, decls, n);
    n.params.forEach((q) => visitPattern(q, fs, false));
    if (n.body.type === "BlockStatement") n.body.body.forEach((x) => visit(x, fs, n.body));
    else visit(n.body, fs, n);
  };
  const visit = (n, s, parent) => {
    if (!n) return;
    if (!NODES.has(n.type)) return vfail(`${n.type} is not allowed in paint${at(n)}`);
    switch (n.type) {
      case "FunctionDeclaration": case "FunctionExpression": case "ArrowFunctionExpression": return visitFunction(n, s);
      case "BlockStatement": { const bs = scope(s, blockDecls(n.body), n); n.body.forEach((x) => visit(x, bs, n)); return; }
      case "ForStatement": {
        const fs = scope(s, n.init && n.init.type === "VariableDeclaration" ? blockDecls([n.init]) : [], n);
        visit(n.init, fs, n); visit(n.test, fs, n); visit(n.update, fs, n); visit(n.body, fs, n); return;
      }
      case "ForOfStatement": {
        const decl = n.left.type === "VariableDeclaration", fs = scope(s, decl ? blockDecls([n.left]).map(([x]) => [x, false]) : [], n);
        if (decl) visit(n.left, fs, n);
        else { checkTarget(n.left); visitPattern(n.left, fs, true); notNumeric(fs, patternNames(n.left)); }
        visit(n.right, fs, n); visit(n.body, fs, n); return;
      }
      case "SwitchStatement": {
        visit(n.discriminant, s, n);
        const cs = scope(s, blockDecls(n.cases.flatMap((c) => c.consequent)), n);
        for (const c of n.cases) { visit(c.test, cs, c); c.consequent.forEach((x) => visit(x, cs, c)); }
        return;
      }
      case "VariableDeclaration":
        if (n.kind !== "let" && n.kind !== "const") vfail(`use let or const, not ${n.kind}${at(n)}`);
        n.declarations.forEach((d) => {
          visitPattern(d.id, s, false); visit(d.init, s, d);
          const v = d.id.type === "Identifier" ? lookup(s, d.id.name) : null;
          if (v && !checking) v.inits.push(d.init);
        });
        return;
      case "Identifier": {
        const v = lookup(s, n.name);
        if (!checking) refs.set(n, v);
        if (!v && !GLOBALS.has(n.name)) vfail(`"${n.name}" is not defined here; paint can use only its parameters, its own variables and Math${at(n)}`);
        if (n.name === "Math" && !(parent && parent.type === "MemberExpression" && parent.object === n && !parent.computed)) vfail(`Math can only be used as Math.name${at(n)}`);
        return;
      }
      case "MemberExpression":
        visit(n.object, s, n);
        if (n.computed) { if (!isNumericExpr(n.property)) vfail(`x[...] needs a number index, such as a loop counter or a literal${at(n)}`); visit(n.property, s, n); }
        else if (DENY_PROPS.has(n.property.name)) vfail(`.${n.property.name} is not allowed${at(n)}`);
        return;
      case "Property":
        if (n.kind !== "init") vfail(`getters and setters are not allowed${at(n)}`);
        if (n.computed) { if (!isNumericExpr(n.key)) vfail(`computed keys need a number${at(n)}`); visit(n.key, s, n); }
        else if (DENY_PROPS.has(keyName(n))) vfail(`the key "${keyName(n)}" is not allowed${at(n)}`);
        visit(n.value, s, n);
        return;
      case "AssignmentExpression":
        checkTarget(n.left);
        if (n.left.type === "Identifier" || n.left.type === "MemberExpression") visit(n.left, s, n);
        else { visitPattern(n.left, s, true); notNumeric(s, patternNames(n.left)); }
        if (n.left.type === "Identifier" && !checking) { const v = lookup(s, n.left.name); if (v) v.writes.push(n); }
        visit(n.right, s, n);
        return;
      case "UpdateExpression": checkTarget(n.argument); visit(n.argument, s, n); return;
      case "UnaryExpression": if (n.operator === "delete") vfail(`delete is not allowed${at(n)}`); visit(n.argument, s, n); return;
      case "Literal":
        if (n.regex || typeof n.value === "bigint") vfail(`regular expressions and BigInt are not allowed${at(n)}`);
        if (typeof n.value === "string" && checking) strings.push(n.value);
        return;
      case "TemplateElement": if (checking) strings.push(n.value.cooked ?? ""); return;
      case "BreakStatement": case "ContinueStatement": if (n.label) vfail(`labels are not allowed${at(n)}`); return;
      case "VariableDeclarator": case "ObjectPattern": case "ArrayPattern": case "AssignmentPattern": case "RestElement":
        return vfail(`${n.type} is not allowed here${at(n)}`);
      default:
        for (const k of Object.keys(n)) {
          if (k === "loc" || k === "type") continue;
          const v = n[k];
          if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === "string" && visit(x, s, n));
          else if (v && typeof v.type === "string") visit(v, s, n);
        }
    }
  };
  visitFunction(paint, null);
  for (let changed = true; changed; ) {
    changed = false;
    for (const v of vars) {
      if (!v.numeric) continue;
      const bad = v.inits.some((e) => e && !isNumericExpr(e)) ||
        v.writes.some((a) => (["=", "+="].includes(a.operator) ? !isNumericExpr(a.right) : ["??=", "||=", "&&="].includes(a.operator)));
      if (bad) { v.numeric = false; changed = true; }
    }
  }
  checking = true;
  visitFunction(paint, null);
  for (const t of strings) if (!textOk(t)) { fail(`the text "${t.slice(0, 40)}" has a link, markup or a control character`); break; }
  if (errs.length) return { errors: errs };

  // 3. Run it: load the file in an empty context and paint at two screen sizes.
  for (const [W, H] of SIZES) {
    const res = runPainter(src, stem, W, H);
    if (res.error) { fail(`paint failed at ${W}x${H}: ${res.error}`); break; }
    if (res.calls < 40) fail(`paint drew almost nothing at ${W}x${H} (${res.calls} drawing calls)`);
    if (!(res.g.pr > 0 && res.g.dripX >= 0 && res.g.dripX <= W && res.g.dripY >= 0 && res.g.dripY <= H * 0.75)) fail(`the drip point (k.G.dripX, dripY, pr) is off the screen at ${W}x${H}`);
  }
  if (errs.length) return { errors: errs };
  const level = { id: def.id.value, name: def.name.value, cue: def.cue.value, start: def.start.value, speed: def.speed.value };
  if (def.weapon) level.weapon = literalObject(def.weapon);
  if (def.order) level.order = literalObject(def.order);
  return { ok: true, level, strings: [...new Set(strings)] };
}

function runPainter(src, stem, W, H) {
  let calls = 0, def = null;
  const count = () => { if (++calls > MAX_DRAW_CALLS) throw new Error(`more than ${MAX_DRAW_CALLS} drawing calls`); };
  const ctx = {};
  for (const f of CTX_FN) ctx[f] = (...a) => {
    count();
    for (const v of a) if (typeof v === "number" && !Number.isFinite(v)) throw new Error(`${f} got a value that is not a finite number`);
    return f.startsWith("create") ? Object.freeze({ addColorStop() {} }) : f === "measureText" ? { width: String(a[0]).length * 8 } : undefined;
  };
  for (const k of CTX_PROP) { let v = null; Object.defineProperty(ctx, k, { get: () => v, set: (x) => { v = x; } }); }
  const { kit, g } = makeKit(W, H);
  const box = vm.createContext({ FeedSqueek: Object.freeze({ level(d) { def = d; } }) });
  try {
    vm.runInContext(src, box, { timeout: 2000 });
    if (!def || typeof def.paint !== "function") throw new Error("the file did not call FeedSqueek.level");
    box.__paint = def.paint; box.__args = [Object.freeze(ctx), mulberry(seedOf(stem)), kit];
    vm.runInContext("__paint(__args[0], __args[1], __args[2])", box, { timeout: 3000 });
  } catch (e) { return { error: String(e && e.message ? e.message : e).slice(0, 200) }; }
  return { calls, g };
}

export function checkFile(file) {
  const name = basename(file), stem = name.replace(/\.js$/, "");
  if (!/^[a-z0-9-]{3,48}\.js$/.test(name)) return { errors: ["the file name must be levels/<id>.js with 3-48 lowercase letters, digits or hyphens"] };
  if (statSync(file).size > MAX_BYTES) return { errors: [`the file is larger than ${MAX_BYTES} bytes`] };
  return checkSource(readFileSync(file, "utf8"), stem);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2), json = args[0] === "--json", files = json ? args.slice(1) : args;
  if (!files.length) { console.error("usage: node tools/validate-level.mjs [--json] levels/<id>.js [more files]"); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    let r;
    try { r = checkFile(f); } catch (e) { r = { errors: [String(e.message || e)] }; }
    if (!r.ok) bad++;
    if (json) console.log(JSON.stringify({ file: f, ...r }));
    else if (r.ok) console.log(`ok   ${f}: "${r.level.name}", ${r.level.start} snacks, +${Math.round((r.level.speed - 1) * 100)}%${r.level.weapon ? `, ${r.level.weapon.name || "custom weapon"}` : ""}`);
    else { console.log(`FAIL ${f}`); for (const m of r.errors) console.log(`  - ${m}`); }
  }
  process.exit(bad ? 1 : 0);
}
