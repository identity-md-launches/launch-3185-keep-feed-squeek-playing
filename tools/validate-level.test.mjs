// node --test tools/
// The example level must pass, and each hostile painter below must be refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkSource } from "./validate-level.mjs";

const example = readFileSync(fileURLToPath(new URL("../examples/flooded-arcade.js", import.meta.url)), "utf8");
// A level whose painter body is `body`, after a room that draws enough to pass the size checks.
const room = "for (let i = 0; i < 50; i++) c.fillRect(i, i, 4, 4);";
const level = (body, extra = "") => `FeedSqueek.level({ id: "t-level", name: "Test", cue: "Clear it", start: 12, speed: 1.2, ${extra}
  paint: function (c, r, k) { ${room} ${body} } });`;
const refused = (src, why) => {
  const res = checkSource(src, "t-level");
  assert.ok(!res.ok, `should be refused: ${why}`);
  return res.errors.join("\n");
};

test("the example level passes", () => {
  const res = checkSource(example, "flooded-arcade");
  assert.ok(res.ok, JSON.stringify(res.errors));
  assert.equal(res.level.weapon.name, "Nail gun");
});

test("a plain room passes", () => {
  assert.ok(checkSource(level(""), "t-level").ok);
});

test("names reused in other scopes keep their own number tracking", () => {
  const src = level("{ const b = k.sc(1); } for (let b = 0; b < 3; b++) c.fillStyle = ['#000', '#111', '#222'][b];");
  const res = checkSource(src, "t-level");
  assert.ok(res.ok, JSON.stringify(res.errors));
});

const hostile = {
  "a string index through .length": "const o = { length: 'constructor' }; const F = k.proj[o.length];",
  "a declared Math": "const Math = { max: () => 'constructor' }; k.proj[Math.max()];",
  "a changed Math": "Math.max = () => 'constructor';",
  "Math passed as a value": "const M = Math; M.max = 1;",
  "a global reached from a name declared in another scope": "function a() { let location = 1; } location.href = 'x';",
  "a global function": "fetch('/');",
  "the constructor": "const F = [].constructor;",
  "a constructor key in a pattern": "const { constructor: F } = k.proj;",
  "a string computed key": "const o = {}; o['__pro' + 'to__'] = 1;",
  "this": "this.x = 1;",
  "new": "const d = new k.proj(1, 2);",
  "var": "var x = 1;",
  "delete": "const o = { a: 1 }; delete o.a;",
  "a getter": "const o = { get a() { return 1; } };",
  "a regular expression": "const x = /a/;",
  "a link in text": "c.fillText('visit example.com', 10, 10);",
  "an endless loop": "while (true) {}",
  "a drip point off the screen": "k.G.dripY = -500;",
  "a label": "outer: for (let i = 0; i < 2; i++) { break outer; }",
  "a try block": "try { c.fill(); } catch (e) {}",
};
for (const [why, body] of Object.entries(hostile)) test(`refuses ${why}`, () => { refused(level(body), why); });

test("refuses a second statement in the file", () => {
  refused(level("") + "\nfetch('/');", "a second statement");
});

test("refuses a weapon out of range and an unknown field", () => {
  refused(level("", "weapon: { reload: 0.01 },"), "reload too fast");
  refused(level("", "script: 1,"), "unknown field");
});

test("refuses a painter that draws almost nothing", () => {
  refused(`FeedSqueek.level({ id: "t-level", name: "Test", cue: "Clear it", start: 12, speed: 1.2, paint: function (c, r, k) { c.fill(); } });`, "too few calls");
});
