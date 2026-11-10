# Feed Squeek design

This is the design as it is built. Everything here comes from `index.html`: one file that holds the markup, the
styles in a single `<style>` block, the script and the embedded fonts. `dist/` is a byte-for-byte copy made by
`tools/build.mjs`, so the facts below apply to the export too. Swarm levels paint their own rooms (`levels/*.js`,
format in `LEVELS.md`). They reuse the game's interface and do not add design tokens.

## Overview

Feed Squeek is a one-screen arcade shooter for people playing in a browser. Its look is a dim basement: near-black
ink, bone-coloured type and one warm bulb. The bulb's orange is the only strong accent. It marks the live state
(the light, the selected level, the main button), so it should never be used for decoration. Pages are full-viewport
"screens" (`section.screen`: `#title`, `#end`), and the game canvas (`#game`) sits under a fixed HUD. The body never
scrolls (`body{overflow:hidden}`). A screen scrolls inside itself (`#title{overflow-y:auto}`).

The title screen has three parts. On the left is a stencil headline, a short dek and the light cord (`#start`, the
main action). On the right is the level gallery (`#gallery`, a fan of `button.card`). Last is the level order panel
(`#order`). The end screen reuses the same type for the grade, the score and the leaderboard.

## Colors

Custom properties live in `:root` in `index.html`'s `<style>`. Use them; don't add hex values nearby.

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#050505` | Page and screen background (`body`, `#title`) |
| `--bone` | `#e9e2d2` | Primary text, headline, ghost button text, focus ring on dark |
| `--bulb` | `#ffb45e` | Accent: the lit bulb, primary `.go` button fill, range fills, selected card, focus ring inside `.order` |
| `--bulb-dim` | `#8a5a26` | The bulb and accent when the wheel is idle |
| `--pipe` | `#7f9c9a` | Secondary label colour (`.kicker`, mono `h2` labels) |
| `--pk` | `#ff5fa8` | Hamster and favicon pink (logo eyes) |
| `--blush` | `#ff6b8a` | Hamster blush |
| `--alarm` | `#ff4a33` | Warnings and the losing state |

Fixed surface values used directly in the styles: the panel `#0d0c0b` (`.order`), the hairline `#2c2a25` (`.order`
border, `.box` dividers), the muted label `#a09a8b` (`.lab`), the ghost outline `#6b6558` (`.go.ghost`), and the
modal scrim `rgba(0,0,0,.8)` (`#orderModal`). The room itself is canvas art, and its light follows the live wheel
speed, so no colour contrast over the canvas is fixed.

## Typography

There are two families, both embedded as base64 `@font-face` in `index.html`. No font files or CDN are used.

- Display: `--display: 'Stardos Stencil', 'Rockwell', 'Courier New', serif`, embedded faces 400 and 700. Used for the
  headlines (`#title h1`, `#endTitle`), the score and timer numbers, and `.order h2`.
- Body and interface: `--mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`, three
  faces. Used for the body, labels, buttons, the dek and the HUD.

Weights requested in CSS: 400, 500, 600, 700. Mono has no 700 face, so a mono 700 is synthesised by the browser.

Sizes. The display sizes are fluid `clamp()`s, e.g. the title `h1` is `clamp(54px,10vw,160px)` on desktop and
`clamp(44px,6.6vw,104px)` with `line-height:.9` at ≤820px. The HUD timer and counters use `clamp(40px,6vw,88px)` and
similar. Interface text sits on a small fixed scale: 10.5px (`.lab`), 11px, 12px (`.kicker`, `.go.sm`, mono
`h2`), 13px, 15px (`.dek` on mobile), 26px (`.order h2`). The dek is `clamp(14px,1.25vw,17px)/1.6`, `max-width:54ch`
(62ch with `text-wrap:balance` at ≤820px).

Labels are uppercase and widely tracked (`.lab` `.28em`, `.kicker` `.32em`, cord text `.26em`). That is the
existing identity, and the design review flags it (see `artifacts/VALIDATION.md`). Don't extend it to new running text.

## Layout

- The viewport is the page. `section.screen` is `position:fixed` and fills it. `#hud` is fixed with
  `padding:clamp(14px,2.4vw,30px)` and `justify-content:space-between` (counter left, wheel chip centre, timer right).
- Desktop title: a two-column grid, `minmax(0,1.3fr) minmax(300px,420px)`, gap `clamp(20px,4vw,64px)`. At wider
  layouts it is refined to `minmax(0,1fr) minmax(300px,380px)` with side padding `clamp(20px,4vw,56px)`. `.tcol`
  (headline + gallery) stacks with `gap:20–22px` and `justify-content:space-between`. `#orderSlot` aligns to the
  end of the row.
- Panel rhythm: `.order` `gap:13px`, `padding:20px`. `.box` sections `gap:7px`, `padding-top:11px` over a hairline.
- One breakpoint, `@media (max-width:820px)`: the title becomes one column
  (`grid-template-columns:1fr; align-items:start; align-content:end`), the headline shrinks, the dek widens to 62ch,
  and a `#hud` rule (`padding-left:calc(clamp(12px,2vw,26px) + 70px)`) leaves room on the left for the home button.
- `@media (prefers-reduced-motion:reduce)`: the headline flicker (`animation:warm`) and card transitions are off.
- Known issue at 390×844, as built: with `align-content:end` the one-column title is taller than the screen and
  overflows upwards, where it can't be scrolled to. The headline and the cord render above the top edge. Using
  `align-content:safe end` makes the content scrollable (measured 1257px of content in an 844px screen). Not
  changed in this job, because the brief froze the styles. See `artifacts/VALIDATION.md`.

## Elevation & Depth

- Floating art (gallery cards, cord): soft drop shadows, e.g. `0 14px 30px rgba(0,0,0,.6)`. The selected card
  adds a warm ring, `0 0 0 1px rgba(226,178,90,.4)` plus deep shadows.
- The bulb glow is a stacked warm `box-shadow` (`0 0 14px rgba(255,180,94,.95), 0 0 46px …, 0 0 110px …`). It's
  the one bright light in the system.
- Status dot: `0 0 8px #7ddc6a` (the wheel chip's live dot).
- Panels are flat: `.order` uses a 1px `#2c2a25` border and no shadow. Ghost buttons use an inset 1.5px ring.
- Stacking: canvas `#game` < `#hud` < `#home` (`z-index:5`) < `#orderModal` (`z-index:20`).

## Shapes

The gallery cards use 14px radii. Smaller pieces use 8–9px (chips and card art; the card art is
`9px 9px 11px 11px`), 6px and 4px. The `.order` panel and fields are square, and so is the primary `.go` button
(a `clip-path` notch on the large size, `clip-path:none` on `.sm`). Round shapes (`50%`) are for the scope, the
bulb and dots only.

## Components

| Component | Source | Notes |
| --- | --- | --- |
| Light cord `#start` | `button.cord`, `aria-label="Pull the light cord to start"` | Main action. Swings (animated). Click, tap or pull starts the selected level. |
| Level card | `#fan > button.card`, `.sel` when chosen, `.slot` for "Your level here" | Shows tag, art, name, number, snacks and speed. The slot opens the order panel. |
| Order panel | `section#order.order` with `.box` groups | Labelled `textarea`s `#oTheme`, `#oWeapon`, range "levers" `#oHam`, `#oSpd` with live values, then `#linkGen`. |
| Button | `.go` (bulb fill, dark text), `.go.sm` (compact), `.go.ghost` (outline) | Uppercase, tracked mono label. |
| Agent link | `#linkOut`: readonly `#linkField` + `#linkCopy` | Status text in `#orderStatus`. |
| HUD | `#hud`: `#count`/`#cap` snacks alive, `#wheelChip` wheel status, `#time`, `#kills`, `#born` | Wheel chip says "simulated" when the Squeekchain API can't be read. |
| Order modal | `#orderModal` with `#orderClose` | The order panel shown over the game. |
| End screen | `section#end`: grade, score, stats, gallery, leaderboard `#boardList` | |

Focus: `:focus-visible` gets a 2px `--bone` outline (offset 3–4px), and inside `.order` a 2px `--bulb` outline.

## Do and don't

- Do reuse `--bulb` only for live or primary state. Keep `--bone` on `--ink` for text.
- Do keep all assets local and relative (`painter.js`, `levels/…`), because the site is served from IPFS subpaths.
- Don't add a third typeface or new tracked-caps running text. Don't nest cards inside cards.
- Don't let any screen depend on `align-content:end` for content taller than the viewport (see Layout).

## Build

No dependencies. `node tools/build.mjs` writes `dist/`. `node tools/build.mjs --check` confirms that `dist/` matches
the source. To preview, serve `dist/` with any static server, e.g. `python3 -m http.server -d dist 8080`.
