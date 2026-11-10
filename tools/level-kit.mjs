// The kit a room painter gets as its third argument, built the same way as in painter.js (the game's worker), so the
// check and the preview see what the game sees. Used by validate-level.mjs and preview-level.mjs.
export const CTX_FN = ["fillRect", "strokeRect", "clearRect", "beginPath", "closePath", "moveTo", "lineTo", "arc", "arcTo", "ellipse", "rect",
  "quadraticCurveTo", "bezierCurveTo", "fill", "stroke", "clip", "save", "restore", "translate", "rotate", "scale",
  "createLinearGradient", "createRadialGradient", "fillText", "strokeText", "measureText", "setLineDash"];
export const CTX_PROP = ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "miterLimit", "globalAlpha", "globalCompositeOperation", "font",
  "textAlign", "textBaseline", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY", "lineDashOffset"];
// The same constants as index.html.
export const K = {
  KK: 1, ZMAX: 1.4, DRIP: { x: 0.5, z: 0.6 }, BULB: { x: -0.45, z: 0.5 },
  PIPE: ["#2d3a3b", "#a6bdbb", "#5d7475", "#19201f"], RUST: ["#3a2416", "#c07d48", "#7a4526", "#22130b"],
  IRON: ["#262524", "#8a8782", "#4c4a46", "#151413"], LCOL: ["255,60,50", "60,230,110", "70,130,255", "255,190,60", "255,90,200"],
};

// The room geometry for a W x H screen, as resize() in index.html computes it.
export function geometry(W, H) {
  const sc = (z) => 1 / (1 + z * K.KK);
  const G = { cx: W / 2, hw: W * 0.75, sFar: sc(K.ZMAX), yFN: H * 1.03, yFF: H * 0.5, yCN: -H * 0.05, yCF: H * 0.15 };
  G.unit = Math.max(G.hw * 0.082, 40); G.fy = (G.yFN - G.yFF) / (1 - G.sFar) * K.KK;
  return G;
}

export function mulberry(a) {
  return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function seedOf(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) || 1;
}

// A frozen drawing-only view of a 2D context: the listed methods and properties, nothing that leads to the canvas.
export function safeCtx(c) {
  const o = {};
  for (const f of CTX_FN) o[f] = (...a) => c[f](...a);
  for (const k of CTX_PROP) Object.defineProperty(o, k, { get: () => c[k], set: (v) => { c[k] = v; } });
  return Object.freeze(o);
}

// Returns { kit, g }: g is the object the painter may change (dripX, dripY, pr, lights, glows, fire).
export function makeKit(W, H) {
  const G0 = geometry(W, H), sc = (z) => 1 / (1 + z * K.KK);
  const proj = (x, z) => { const s = sc(z), t = (s - G0.sFar) / (1 - G0.sFar); return { x: G0.cx + x * G0.hw * s, y: G0.yFF + (G0.yFN - G0.yFF) * t, s }; };
  const ceilY = (z) => { const s = sc(z), t = (s - G0.sFar) / (1 - G0.sFar); return G0.yCF + (G0.yCN - G0.yCF) * t; };
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const pipeH = (c, x0, x1, y, r, cols) => {
    const p = Array.isArray(cols) && cols.length === 4 ? cols : K.PIPE, g = c.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, p[0]); g.addColorStop(0.28, p[1]); g.addColorStop(0.62, p[2]); g.addColorStop(1, p[3]);
    c.fillStyle = g; c.fillRect(x0, y - r, x1 - x0, 2 * r);
  };
  const poly = (c, pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
  const lights = [], glows = [];
  const addLight = (x, y, rad, i) => { i = Math.abs(Math.round(+i || 0)); lights.push({ x, y, r: rad, col: K.LCOL[i % 5], sp: 1.5 + ((i * 7) % 5) * 0.7, ph: i * 1.9 }); };
  const z = K.DRIP.z, pr = G0.hw * 0.03 * sc(z);
  const g = { ...G0, dripX: proj(K.DRIP.x, z).x, dripY: ceilY(z) + pr * 3.56, pr, fire: null, lights, glows };
  const kit = Object.freeze({
    W, H, G: g, proj, ceilY, sc, squash: (s) => G0.fy * s / G0.hw, pipeH, poly, addLight, clamp, lerp: (a, b, t) => a + (b - a) * t,
    smooth: (t) => { t = clamp(t); return t * t * (3 - 2 * t); }, TAU: Math.PI * 2, PI: Math.PI, ZMAX: K.ZMAX,
    DRIP: Object.freeze({ ...K.DRIP }), BULB: Object.freeze({ ...K.BULB }),
    PIPE: Object.freeze(K.PIPE.slice()), RUST: Object.freeze(K.RUST.slice()), IRON: Object.freeze(K.IRON.slice()),
  });
  return { kit, g };
}
