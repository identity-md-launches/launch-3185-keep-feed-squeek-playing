# Feed Squeek levels

This is the format for a level that the IMD swarm builds for a player. A level is one file, `levels/<id>.js`. It
holds the room's look as a small drawing function, the starting snack count, the speed and, if the player asked for
one, a weapon. `examples/flooded-arcade.js` is a complete level: start from it.

Before you finish, run the check. It must print `ok`:

```
node tools/validate-level.mjs levels/<id>.js
```

To see the room, render it (needs the npm package `@napi-rs/canvas`):

```
node tools/preview-level.mjs levels/<id>.js preview.png
```

Write only `levels/<id>.js`. The game's operator adds the level to `levels/index.json` after a review.

## The file

```js
FeedSqueek.level({
  id: "flooded-arcade-1994-7f3a",    // the file name without .js
  name: "Flooded arcade, 1994",      // 1-40 characters, on the level card
  cue: "Clear the arcade",           // 1-40 characters, shown when the level starts
  start: 30,                         // snacks on the floor at the start, 8-40
  speed: 1.6,                        // 1 + faster percent / 100, from 1 to 2
  weapon: { name: "Nail gun", reload: 0.14, auto: true },   // optional, see "Weapon"
  paint: function (c, r, k) {        // draws the room, see "The room"
    // ...
  },
});
```

The file holds this one statement and nothing else. Every value except `paint` is a literal: a string, a number,
`true` or `false`, or for `weapon` an object of those.

## The room

The game calls `paint(c, r, k)` to draw the room on a black canvas of `k.W` x `k.H` CSS pixels. It paints again when
the screen size changes, and a phone screen is tall, so draw from the kit's geometry, never from fixed pixel positions.
The room has the same shape as the built-in rooms (`paintBoiler` and `paintXmas` in `index.html`):

- the back wall, from `k.G.cx - k.G.hw * k.G.sFar` to `k.G.cx + k.G.hw * k.G.sFar` across and from `k.G.yCF` to
  `k.G.yFF` down;
- two side walls, from the screen edges at the front to the back wall;
- the ceiling above and the floor below.

Snacks walk on the floor, so keep it calm and readable. The game hangs the lightbulb and the hamster wheel from the
ceiling at `k.BULB`, so keep that part of the ceiling clear.

### c: the canvas

A 2D canvas context that can only draw. Methods: `fillRect`, `strokeRect`, `clearRect`, `beginPath`, `closePath`,
`moveTo`, `lineTo`, `arc`, `arcTo`, `ellipse`, `rect`, `quadraticCurveTo`, `bezierCurveTo`, `fill`, `stroke`, `clip`,
`save`, `restore`, `translate`, `rotate`, `scale`, `createLinearGradient`, `createRadialGradient`, `fillText`,
`strokeText`, `measureText`, `setLineDash`. Properties: `fillStyle`, `strokeStyle`, `lineWidth`, `lineCap`, `lineJoin`,
`miterLimit`, `globalAlpha`, `globalCompositeOperation`, `font`, `textAlign`, `textBaseline`, `shadowColor`,
`shadowBlur`, `shadowOffsetX`, `shadowOffsetY`, `lineDashOffset`. There are no images and no pixel reads.

Text uses the player's own fonts, so name a generic family: `sans-serif`, `serif` or `monospace`.

### r: random numbers

`r()` returns a number from 0 up to 1. It is seeded from the level id, so the room looks the same every time. Use it
in place of `Math.random`.

### k: the kit

| Name | What it is |
| --- | --- |
| `k.W`, `k.H` | The screen size in CSS pixels. |
| `k.G` | The geometry: `cx` (the middle), `hw` (half the width of the floor's front edge), `sFar` (the scale at the back wall), `yFN` and `yFF` (the floor's y at the front and at the back), `yCN` and `yCF` (the ceiling's y at the front and at the back), `unit` and `fy`. It also holds the outputs below. |
| `k.proj(x, z)` | A point on the floor: `x` from -1 (left wall) to 1 (right wall), `z` from 0 (front) to `k.ZMAX` (back wall). Returns `{ x, y, s }`, where `s` is the scale at that depth. |
| `k.ceilY(z)` | The ceiling's y at depth `z`. |
| `k.sc(z)` | The scale at depth `z`. |
| `k.squash(s)` | How flat a floor circle looks at scale `s`: an ellipse of width `rx` has height `rx * k.squash(s)`. |
| `k.poly(c, points)` | Starts a closed path through `[[x, y], ...]`. Call `c.fill()` or `c.stroke()` after it. |
| `k.pipeH(c, x0, x1, y, radius, shades)` | A horizontal pipe. `shades` is `k.PIPE`, `k.RUST` or `k.IRON`. |
| `k.addLight(x, y, radius, i)` | A small light that twinkles; `i` picks one of five colors. |
| `k.clamp(v, a, b)`, `k.lerp(a, b, t)`, `k.smooth(t)` | Helpers. |
| `k.TAU`, `k.PI`, `k.ZMAX` | Constants. |
| `k.DRIP` | `{ x, z }`: where the leak is, as a floor point under the ceiling. |
| `k.BULB` | `{ x, z }`: where the bulb hangs. |

### What the painter sets

- **The leak.** Every room has a leaking pipe (or something else that drips) on the ceiling above `k.DRIP`. Set
  `k.G.dripX` and `k.G.dripY` to the point where the drop forms and `k.G.pr` to the pipe's radius (more than 0). The
  defaults are the standard spot, and the check needs the point on the screen.
- **Glows** (optional). Push `{ x, y, r, col: "R,G,B", a, fl }` to `k.G.glows` for light sources that brighten with
  the bulb: `a` from 0 to 1, `fl: true` to flicker. Up to 24.
- **Lights** (optional). Call `k.addLight`, or push `{ x, y, r, col: "R,G,B", sp, ph }` to `k.G.lights`. Up to 120.
- **Fire** (optional). Set `k.G.fire = { x, y, w, h }` for a fire that flickers.

## Weapon

A weapon is data. The game fires it with its own shooting code, so a level adds no shooting code. Leave `weapon` out
for the standard bolt-action scope. Every field is optional.

| Field | Value | Standard | What it does |
| --- | --- | --- | --- |
| `name` | 1-40 characters | `Bolt-action scope` | Shown with the cue when the level starts. |
| `reload` | 0.06 to 1.2 | 0.34 | Seconds between shots. |
| `auto` | `true` or `false` | `false` | `true` keeps firing while the trigger is held. |
| `pellets` | 1 to 8 | 1 | Shots per pull. The first goes to the aim point, the rest scatter inside `spread`. |
| `spread` | 0 to 80 | 0 | Scatter radius in pixels, drawn as a dashed circle in the scope. |
| `radius` | 0.5 to 2.5 | 1 | Size of the hit area. |
| `recoil` | 0 to 2 | 1 | Kick after each shot. |
| `sound` | `shot` or `auto` | `shot` | A heavy shot or a light rapid one. |
| `reticle` | `cross`, `dot`, `ring` or `chevron` | `cross` | The scope's crosshair. |
| `tint` | `#rrggbb` | `#ff4a33` | The scope's center dot and reload ring. |

Match the player's weapon text with these fields. For example, a shotgun is `pellets: 6, spread: 40, reload: 0.8`, and
a laser is `reload: 0.08, auto: true, radius: 0.6, recoil: 0, sound: "auto", reticle: "dot"`.

## What the check allows

The level runs in every player's browser, so the painter is plain drawing code:

- It uses only its parameters `c`, `r` and `k`, its own `let`, `const` and function names, and `Math` (read only, as
  `Math.name`). There is no `window`, `document`, `fetch`, `this`, `new`, `var`, `delete`, `try`, `class`, `async`,
  regular expressions or labels.
- `x[i]` needs a number index, such as a loop counter, a literal or arithmetic on them. To pick from a list, write
  `["#111", "#222"][i % 2]`.
- No property named `constructor`, `prototype`, `__proto__`, `call`, `apply`, `bind` or `canvas`, and no getters or
  setters.
- Text has no links, markup or control characters. Keep it family-friendly: a person reviews every level.
- At 1440 x 900 and 390 x 844 the painter makes at least 40 drawing calls, no more than 120,000, and finishes in 3
  seconds. The file is 64 KB or less.

The game also runs each painter in a separate worker with a time limit, and it skips a level whose painter fails.
