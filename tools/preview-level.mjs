#!/usr/bin/env node
// Renders a level's room to a PNG so a builder or reviewer can see it: the 1440x900 room and the 390x844 phone room
// side by side, with the drip point and the glows marked. The file must pass validate-level.mjs first.
//   node tools/preview-level.mjs levels/<id>.js preview.png [--canvas <path to the @napi-rs/canvas package>]
// Needs the npm package @napi-rs/canvas (npm install @napi-rs/canvas), found the normal way or through --canvas.
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { checkFile } from "./validate-level.mjs";
import { makeKit, mulberry, safeCtx, seedOf } from "./level-kit.mjs";

const args = process.argv.slice(2);
const ci = args.indexOf("--canvas");
const canvasPath = ci >= 0 ? resolve(args.splice(ci, 2)[1]) : "@napi-rs/canvas";
const [file, out] = args;
if (!file || !out) { console.error("usage: node tools/preview-level.mjs levels/<id>.js preview.png [--canvas <path>]"); process.exit(2); }
const res = checkFile(file);
if (!res.ok) { console.error(`FAIL ${file}\n  - ${res.errors.join("\n  - ")}`); process.exit(1); }
let createCanvas;
try { ({ createCanvas } = createRequire(import.meta.url)(canvasPath)); }
catch { console.error("preview needs @napi-rs/canvas: npm install @napi-rs/canvas, or pass --canvas <path>"); process.exit(2); }

const src = readFileSync(file, "utf8"), stem = basename(file).replace(/\.js$/, "");
function room(W, H) {
  const cv = createCanvas(W, H), c = cv.getContext("2d");
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  const { kit, g } = makeKit(W, H);
  let def = null;
  const box = vm.createContext({ FeedSqueek: Object.freeze({ level(d) { def = d; } }) });
  vm.runInContext(src, box, { timeout: 2000 });
  box.__paint = def.paint; box.__args = [safeCtx(c), mulberry(seedOf(stem)), kit];
  c.save(); vm.runInContext("__paint(__args[0], __args[1], __args[2])", box, { timeout: 8000 }); c.restore();
  // what the game adds on top when the bulb is on: glows, lights, and the drop forming at the drip point
  c.globalCompositeOperation = "lighter";
  for (const q of (Array.isArray(g.glows) ? g.glows : []).slice(0, 24)) {
    const gr = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); gr.addColorStop(0, `rgba(${q.col},${q.a})`); gr.addColorStop(1, `rgba(${q.col},0)`);
    c.fillStyle = gr; c.fillRect(q.x - q.r, q.y - q.r, 2 * q.r, 2 * q.r);
  }
  for (const l of (Array.isArray(g.lights) ? g.lights : []).slice(0, 120)) { c.fillStyle = `rgb(${l.col})`; c.beginPath(); c.arc(l.x, l.y, Math.max(1.5, l.r), 0, Math.PI * 2); c.fill(); }
  c.globalCompositeOperation = "source-over";
  c.strokeStyle = "#7fd4ff"; c.lineWidth = 2; c.beginPath(); c.arc(g.dripX, g.dripY, Math.max(4, g.pr * 0.6), 0, Math.PI * 2); c.stroke();
  return cv;
}
const wide = room(1440, 900), tall = room(390, 844), th = 900, tw = Math.round(390 * th / 844);
const sheet = createCanvas(1440 + 24 + tw, 900), s = sheet.getContext("2d");
s.fillStyle = "#111"; s.fillRect(0, 0, sheet.width, sheet.height);
s.drawImage(wide, 0, 0); s.drawImage(tall, 1440 + 24, 0, tw, th);
writeFileSync(out, sheet.toBuffer("image/png"));
console.log(`ok   ${file}: wrote ${out}`);
