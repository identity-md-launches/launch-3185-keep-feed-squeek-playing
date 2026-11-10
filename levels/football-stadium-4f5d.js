FeedSqueek.level({
  id: "football-stadium-4f5d",
  name: "Football stadium",
  cue: "Clear the pitch",
  start: 30,
  speed: 1.2,
  weapon: { name: "Football", reload: 0.7, auto: false, pellets: 1, spread: 0, radius: 1.8, recoil: 0.6, sound: "shot", reticle: "ring", tint: "#ffffff" },
  paint: function (c, r, k) {
    const G = k.G, H = k.H, proj = k.proj, ceilY = k.ceilY, sc = k.sc, poly = k.poly, lerp = k.lerp, TAU = k.TAU, ZMAX = k.ZMAX;
    const xL = G.cx - G.hw * G.sFar, xR = G.cx + G.hw * G.sFar, yT = G.yCF, yB = G.yFF, wh = yB - yT, ww = xR - xL;
    const SHIRTS = ["#d8263a", "#f2f2f2", "#2a5fd8", "#ffd23b", "#d8263a", "#1c8a3a"];
    let g;

    /* back wall: tiered stands packed with fans, a scoreboard on top */
    g = c.createLinearGradient(0, yT, 0, yB); g.addColorStop(0, "#1a2333"); g.addColorStop(1, "#2b3446"); c.fillStyle = g; c.fillRect(xL, yT, ww, wh);
    const sbH = wh * 0.2, sbW = ww * 0.34, sbX = G.cx - sbW / 2, sbY = yT + wh * 0.04;
    const rows = 7, standTop = sbY + sbH + wh * 0.05, standBot = yB - wh * 0.14, rh = (standBot - standTop) / rows;
    for (let j = 0; j < rows; j++) {
      const y = standTop + j * rh;
      c.fillStyle = j % 2 ? "#3a4458" : "#333d50"; c.fillRect(xL, y, ww, rh);
      c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(xL, y + rh - 1.5, ww, 1.5);
      const fans = Math.floor(ww / Math.max(4, rh * 0.75));
      for (let i = 0; i < fans; i++) {
        const fx = xL + (i + 0.3 + r() * 0.4) * (ww / fans), hr = rh * 0.18;
        c.fillStyle = SHIRTS[Math.floor(r() * 6)]; c.fillRect(fx - hr, y + rh * 0.45, hr * 2, rh * 0.45);
        c.fillStyle = ["#f1c9a5", "#c68a5c", "#8a5a3a", "#e8b48a"][i % 4]; c.beginPath(); c.arc(fx, y + rh * 0.32, hr, 0, TAU); c.fill();
      }
    }
    /* advertising boards along the front of the stands */
    const adY = standBot, adH = wh * 0.06;
    for (let i = 0; i < 6; i++) {
      const w = ww / 6;
      c.fillStyle = ["#1c4fd8", "#ffd23b", "#d8263a"][i % 3]; c.fillRect(xL + i * w, adY, w, adH);
      c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(xL + i * w + w * 0.2, adY + adH * 0.4, w * 0.6, adH * 0.2);
    }
    c.fillStyle = "#14202a"; c.fillRect(xL, adY + adH, ww, yB - adY - adH);
    /* scoreboard */
    c.fillStyle = "#0b0f14"; c.fillRect(sbX, sbY, sbW, sbH);
    c.strokeStyle = "#8a96a8"; c.lineWidth = 2; c.strokeRect(sbX, sbY, sbW, sbH);
    c.save(); c.font = `700 ${Math.min(sbH * 0.42, sbW * 0.1)}px monospace`; c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = "#ffb23b"; c.shadowBlur = 8; c.fillStyle = "#ffb23b";
    c.fillText("HOME 2 - 1 AWAY", G.cx, sbY + sbH * 0.38);
    c.font = `${sbH * 0.22}px monospace`; c.fillStyle = "#7af07a"; c.fillText("88:00", G.cx, sbY + sbH * 0.78); c.restore();
    G.glows.push({ x: G.cx, y: sbY + sbH / 2, r: sbW * 0.7, col: "255,180,60", a: 0.14 });

    /* the goal at the back of the pitch */
    {
      const gw = ww * 0.22, gh = wh * 0.2, gx = G.cx - gw / 2, gy = yB - gh;
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1;
      for (let i = 1; i < 12; i++) { c.beginPath(); c.moveTo(gx + gw * i / 12, gy); c.lineTo(gx + gw * i / 12, yB); c.stroke(); }
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(gx, gy + gh * i / 5); c.lineTo(gx + gw, gy + gh * i / 5); c.stroke(); }
      c.strokeStyle = "#ffffff"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(gx, yB); c.lineTo(gx, gy); c.lineTo(gx + gw, gy); c.lineTo(gx + gw, yB); c.stroke();
    }

    /* side walls: more stands and a floodlight tower on each */
    for (const sgn of [-1, 1]) {
      const xn = G.cx + sgn * G.hw, xf = G.cx + sgn * G.hw * G.sFar;
      poly(c, [[xn, G.yCN], [xf, yT], [xf, yB], [xn, G.yFN]]);
      g = c.createLinearGradient(xn, 0, xf, 0); g.addColorStop(0, "#1a2130"); g.addColorStop(1, "#2b3446"); c.fillStyle = g; c.fill();
      for (let j = 0; j < 8; j++) {
        const t = 0.3 + j * 0.07;
        c.strokeStyle = j % 2 ? "rgba(90,104,130,.7)" : "rgba(60,72,92,.7)"; c.lineWidth = 2;
        c.beginPath(); c.moveTo(xn, lerp(G.yCN, G.yFN, t)); c.lineTo(xf, lerp(yT, yB, t)); c.stroke();
      }
      for (let i = 0; i < 70; i++) {
        const z = r() * ZMAX, t = 0.3 + r() * 0.52, x = G.cx + sgn * G.hw * sc(z), y = lerp(ceilY(z), proj(0, z).y, t), s = sc(z) * G.hw * 0.012 + 1;
        c.fillStyle = SHIRTS[i % 6]; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
      }
      const z = 0.55, x = G.cx + sgn * G.hw * sc(z), ty = lerp(ceilY(z), proj(0, z).y, 0.12), s = sc(z);
      c.fillStyle = "#596273"; c.fillRect(x - G.hw * 0.06 * s, ty, G.hw * 0.12 * s, G.hw * 0.05 * s);
      for (let b = 0; b < 3; b++) {
        const bx = x + (b - 1) * G.hw * 0.035 * s, by = ty + G.hw * 0.025 * s;
        c.fillStyle = "#fffbe0"; c.beginPath(); c.arc(bx, by, G.hw * 0.012 * s + 1, 0, TAU); c.fill();
        k.addLight(bx, by, G.hw * 0.01 * s + 1, 1 + b);
      }
      G.glows.push({ x: x, y: ty, r: G.hw * 0.35 * s, col: "255,250,220", a: 0.3 });
    }

    /* stadium roof: steel trusses over a night sky */
    poly(c, [[G.cx - G.hw, G.yCN], [G.cx + G.hw, G.yCN], [xR, yT], [xL, yT]]);
    g = c.createLinearGradient(0, G.yCN, 0, yT); g.addColorStop(0, "#0a0e18"); g.addColorStop(1, "#151c2c"); c.fillStyle = g; c.fill();
    c.strokeStyle = "rgba(140,150,170,.35)"; c.lineWidth = 2;
    for (let z = 0.1; z < ZMAX; z += 0.3) { const s = sc(z), y = ceilY(z); c.beginPath(); c.moveTo(G.cx - G.hw * s, y); c.lineTo(G.cx + G.hw * s, y); c.stroke(); }
    c.lineWidth = 1;
    for (let x = -1; x <= 1.01; x += 0.5) { c.beginPath(); c.moveTo(G.cx + x * G.hw, G.yCN); c.lineTo(G.cx + x * G.hw * G.sFar, yT); c.stroke(); }

    /* the pitch: striped grass with white markings */
    const floor = [[xL, yB], [xR, yB], [G.cx + G.hw, G.yFN], [G.cx - G.hw, G.yFN]];
    poly(c, floor); g = c.createLinearGradient(0, yB, 0, H); g.addColorStop(0, "#1f6b2c"); g.addColorStop(1, "#2f8f3c"); c.fillStyle = g; c.fill();
    c.save(); poly(c, floor); c.clip();
    for (let i = 0; i < 10; i++) {
      if (i % 2) continue;
      const z0 = ZMAX * i / 10, z1 = ZMAX * (i + 1) / 10, a = proj(-1, z0), b = proj(1, z0), d = proj(1, z1), e = proj(-1, z1);
      c.fillStyle = "rgba(255,255,255,.06)"; poly(c, [[a.x, a.y], [b.x, b.y], [d.x, d.y], [e.x, e.y]]); c.fill();
    }
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 2;
    const line = (pts) => { c.beginPath(); for (let i = 0; i < pts.length; i++) { const p = proj(pts[i][0], pts[i][1]); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } c.stroke(); };
    const zh = ZMAX * 0.45;
    line([[-0.9, 0], [-0.9, ZMAX * 0.98], [0.9, ZMAX * 0.98], [0.9, 0]]);
    line([[-0.9, zh], [0.9, zh]]);
    { const p = proj(0, zh), rx = G.hw * p.s * 0.28; c.beginPath(); c.ellipse(p.x, p.y, rx, rx * k.squash(p.s), 0, 0, TAU); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.ellipse(p.x, p.y, 3, 3 * k.squash(p.s), 0, 0, TAU); c.fill(); }
    line([[-0.45, ZMAX * 0.98], [-0.45, ZMAX * 0.8], [0.45, ZMAX * 0.8], [0.45, ZMAX * 0.98]]);
    for (let i = 0; i < 160; i++) {
      const p = proj(r() * 2 - 1, r() * ZMAX), s = p.s * (1 + r() * 2);
      c.fillStyle = i % 2 ? "rgba(10,60,20,.25)" : "rgba(120,200,110,.18)"; c.fillRect(p.x, p.y, s * 0.5, s * 2);
    }
    g = c.createLinearGradient(0, yB, 0, yB + wh * 0.2); g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, yB, k.W, wh * 0.2);
    c.restore();

    /* the leaking pipe under the roof: the drip falls from its rusty joint */
    {
      const z = k.DRIP.z, s = sc(z), pr = G.hw * 0.03 * s, cy0 = ceilY(z), y = cy0 + pr * 2.2, dx = proj(k.DRIP.x, z).x;
      for (const fx of [-0.8, -0.2, 0.4, 0.85]) { const x = G.cx + fx * G.hw * s; c.fillStyle = "#1a1f28"; c.fillRect(x - pr * 0.12, cy0 - 2, pr * 0.24, y - cy0); }
      k.pipeH(c, G.cx - G.hw * s, G.cx + G.hw * s, y, pr, k.IRON);
      k.pipeH(c, dx - pr * 0.7, dx + pr * 0.7, y, pr * 1.35, k.RUST);
      G.dripX = dx; G.dripY = y + pr * 1.36; G.pr = pr;
    }
  },
});
