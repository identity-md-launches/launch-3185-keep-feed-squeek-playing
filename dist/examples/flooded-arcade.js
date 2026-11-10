FeedSqueek.level({
  id: "flooded-arcade",
  name: "Flooded arcade, 1994",
  cue: "Clear the arcade",
  start: 30,
  speed: 1.6,
  weapon: { name: "Nail gun", reload: 0.14, auto: true, pellets: 1, spread: 6, radius: 0.8, recoil: 0.5, sound: "auto", reticle: "chevron", tint: "#4ad6ff" },
  paint: function (c, r, k) {
    const G = k.G, H = k.H, proj = k.proj, ceilY = k.ceilY, sc = k.sc, poly = k.poly, lerp = k.lerp, TAU = k.TAU, ZMAX = k.ZMAX;
    const xL = G.cx - G.hw * G.sFar, xR = G.cx + G.hw * G.sFar, yT = G.yCF, yB = G.yFF, wh = yB - yT, ww = xR - xL;
    const NEON = ["255,80,200", "80,220,255", "255,200,60", "120,255,140"];
    let g;

    /* back wall: dark wallpaper with a 90s confetti print and a neon stripe */
    g = c.createLinearGradient(0, yT, 0, yB); g.addColorStop(0, "#1c1430"); g.addColorStop(1, "#2a1c40"); c.fillStyle = g; c.fillRect(xL, yT, ww, wh);
    for (let i = 0; i < 90; i++) {
      const x = xL + r() * ww, y = yT + r() * wh * 0.55, s = 4 + r() * 8;
      c.fillStyle = i % 2 ? "rgba(80,220,255,.10)" : "rgba(255,80,200,.10)";
      poly(c, [[x, y], [x + s, y + s * 0.6], [x - s * 0.4, y + s]]); c.fill();
    }
    const ny = yT + wh * 0.2;
    c.fillStyle = "#ff4fd8"; c.fillRect(xL, ny, ww, 2.5);
    G.glows.push({ x: G.cx, y: ny, r: ww * 0.45, col: "255,80,210", a: 0.16 });
    c.save(); c.font = `700 ${wh * 0.1}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = "#7af0ff"; c.shadowBlur = 12; c.fillStyle = "#7af0ff"; c.fillText("ARCADE", G.cx, yT + wh * 0.1); c.restore();

    /* a row of cabinets against the back wall */
    const n = 7, cw = ww / (n + 1.5), ch = wh * 0.62;
    for (let i = 0; i < n; i++) {
      const x = xL + cw * 0.83 + i * cw, w = cw * 0.84, y = yB - ch, hue = NEON[i % 4];
      g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#14101c"); g.addColorStop(0.5, "#2b2236"); g.addColorStop(1, "#110d18");
      c.fillStyle = g; c.fillRect(x, y, w, ch);
      c.fillStyle = `rgba(${hue},.85)`; c.fillRect(x + w * 0.08, y + ch * 0.04, w * 0.84, ch * 0.1);
      const sy = y + ch * 0.2, sh = ch * 0.3;
      c.fillStyle = "#06121a"; c.fillRect(x + w * 0.12, sy, w * 0.76, sh);
      g = c.createLinearGradient(0, sy, 0, sy + sh); g.addColorStop(0, `rgba(${hue},.55)`); g.addColorStop(1, "rgba(10,30,40,.6)");
      c.fillStyle = g; c.fillRect(x + w * 0.15, sy + sh * 0.08, w * 0.7, sh * 0.84);
      for (let s = 0; s < 8; s++) { c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x + w * 0.15, sy + sh * (0.1 + s * 0.1), w * 0.7, 1); }
      const py = sy + sh + ch * 0.06;
      c.fillStyle = "#3a2f48"; poly(c, [[x, py], [x + w, py], [x + w * 1.04, py + ch * 0.1], [x - w * 0.04, py + ch * 0.1]]); c.fill();
      for (let b = 0; b < 3; b++) { c.fillStyle = ["#ff3b3b", "#ffd23b", "#3bff8a"][b]; c.beginPath(); c.arc(x + w * (0.5 + b * 0.14), py + ch * 0.05, w * 0.035, 0, TAU); c.fill(); }
      c.fillStyle = "#111"; c.fillRect(x + w * 0.25, py + ch * 0.02, w * 0.04, ch * 0.05);
      G.glows.push({ x: x + w / 2, y: sy + sh / 2, r: w * 0.9, col: hue, a: 0.2 });
      k.addLight(x + w * 0.2, y + ch * 0.09, w * 0.05, i);
    }

    /* side walls with a neon strip and faded posters */
    for (const sgn of [-1, 1]) {
      const xn = G.cx + sgn * G.hw, xf = G.cx + sgn * G.hw * G.sFar;
      poly(c, [[xn, G.yCN], [xf, yT], [xf, yB], [xn, G.yFN]]);
      g = c.createLinearGradient(xn, 0, xf, 0); g.addColorStop(0, "#120c1e"); g.addColorStop(1, "#21173a"); c.fillStyle = g; c.fill();
      c.strokeStyle = sgn < 0 ? "rgba(80,220,255,.7)" : "rgba(255,80,210,.7)"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(xn, lerp(G.yCN, G.yFN, 0.3)); c.lineTo(xf, lerp(yT, yB, 0.3)); c.stroke();
      for (let j = 0; j < 3; j++) {
        const z0 = 0.25 + j * 0.38, z1 = z0 + 0.2, a = G.cx + sgn * G.hw * sc(z0), b = G.cx + sgn * G.hw * sc(z1);
        const t0 = ceilY(z0), f0 = proj(0, z0).y, t1 = ceilY(z1), f1 = proj(0, z1).y;
        poly(c, [[a, lerp(t0, f0, 0.35)], [b, lerp(t1, f1, 0.35)], [b, lerp(t1, f1, 0.62)], [a, lerp(t0, f0, 0.62)]]);
        c.fillStyle = ["#3a1f5c", "#1f3f5c", "#5c1f3a"][j]; c.fill();
      }
    }

    /* dropped ceiling */
    poly(c, [[G.cx - G.hw, G.yCN], [G.cx + G.hw, G.yCN], [xR, yT], [xL, yT]]);
    g = c.createLinearGradient(0, G.yCN, 0, yT); g.addColorStop(0, "#1a1622"); g.addColorStop(1, "#262030"); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(0,0,0,.5)"; c.lineWidth = 1.5;
    for (let z = 0.1; z < ZMAX; z += 0.22) { const s = sc(z), y = ceilY(z); c.beginPath(); c.moveTo(G.cx - G.hw * s, y); c.lineTo(G.cx + G.hw * s, y); c.stroke(); }
    for (let x = -1; x <= 1.01; x += 0.25) { c.beginPath(); c.moveTo(G.cx + x * G.hw, G.yCN); c.lineTo(G.cx + x * G.hw * G.sFar, yT); c.stroke(); }

    /* carpet under an inch of water */
    const floor = [[xL, yB], [xR, yB], [G.cx + G.hw, G.yFN], [G.cx - G.hw, G.yFN]];
    poly(c, floor); g = c.createLinearGradient(0, yB, 0, H); g.addColorStop(0, "#0d2a33"); g.addColorStop(1, "#174652"); c.fillStyle = g; c.fill();
    c.save(); poly(c, floor); c.clip();
    for (let i = 0; i < 260; i++) {
      const p = proj(r() * 2 - 1, r() * ZMAX), s = p.s * (2 + r() * 4);
      c.fillStyle = ["rgba(255,80,200,.18)", "rgba(80,220,255,.18)", "rgba(255,210,60,.16)"][i % 3]; c.fillRect(p.x, p.y, s, s * 0.5);
    }
    for (let i = 0; i < n; i++) {
      const x = xL + cw * 0.83 + i * cw + cw * 0.3;
      g = c.createLinearGradient(0, yB, 0, yB + wh * 0.5); g.addColorStop(0, `rgba(${NEON[i % 4]},.2)`); g.addColorStop(1, "rgba(120,220,255,0)");
      c.fillStyle = g; c.fillRect(x, yB, cw * 0.25, wh * 0.5);
    }
    c.strokeStyle = "rgba(200,240,255,.12)"; c.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const p = proj(r() * 2 - 1, r() * ZMAX), rx = G.hw * p.s * (0.03 + r() * 0.1);
      c.beginPath(); c.ellipse(p.x, p.y, rx, rx * k.squash(p.s), 0, 0, TAU); c.stroke();
    }
    g = c.createLinearGradient(0, yB, 0, yB + wh * 0.2); g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, yB, k.W, wh * 0.2);
    c.restore();

    /* the leaking pipe: the drip falls from its coupling */
    {
      const z = k.DRIP.z, s = sc(z), pr = G.hw * 0.03 * s, cy0 = ceilY(z), y = cy0 + pr * 2.2, dx = proj(k.DRIP.x, z).x;
      for (const fx of [-0.8, -0.2, 0.4, 0.85]) { const x = G.cx + fx * G.hw * s; c.fillStyle = "#15121c"; c.fillRect(x - pr * 0.12, cy0 - 2, pr * 0.24, y - cy0); }
      k.pipeH(c, G.cx - G.hw * s, G.cx + G.hw * s, y, pr, k.PIPE);
      k.pipeH(c, dx - pr * 0.7, dx + pr * 0.7, y, pr * 1.35, k.RUST);
      G.dripX = dx; G.dripY = y + pr * 1.36; G.pr = pr;
    }
  },
});
