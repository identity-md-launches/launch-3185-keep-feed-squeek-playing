#!/usr/bin/env node
// Builds the static export in dist/. Feed Squeek has no compile step: the export is a
// byte-for-byte copy of the files the page loads at run time, at the same relative paths,
// so it plays exactly as the source does from any gateway subpath or ENS name.
//
//   node tools/build.mjs          rebuild dist/
//   node tools/build.mjs --check  exit 1 if dist/ differs from what a rebuild would write

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');

// What the page reaches at run time:
//   index.html                 the game
//   painter.js                 new Worker('painter.js')
//   levels/                    fetch('levels/index.json'), importScripts('levels/<id>.js')
//   agent.md                   the level-order link the game hands to the player's agent
//   LEVELS.md, examples/       read by the swarm worker the agent hires
//   logo.svg, LICENSE, NOTICES.md
const files = ['index.html', 'painter.js', 'logo.svg', 'agent.md', 'LEVELS.md', 'LICENSE', 'NOTICES.md'];
const dirs = ['levels', 'examples'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function sources() {
  const list = files.map((f) => join(root, f));
  for (const d of dirs) list.push(...walk(join(root, d)));
  return list.map((p) => relative(root, p)).sort();
}

const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

if (process.argv.includes('--check')) {
  const want = sources();
  const have = existsSync(out) ? walk(out).map((p) => relative(out, p)).sort() : [];
  const problems = [];
  for (const f of want) {
    if (!have.includes(f)) problems.push(`missing ${f}`);
    else if (hash(join(root, f)) !== hash(join(out, f))) problems.push(`stale ${f}`);
  }
  for (const f of have) if (!want.includes(f)) problems.push(`extra ${f}`);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log(`dist/ is current (${want.length} files)`);
} else {
  rmSync(out, { recursive: true, force: true });
  const list = sources();
  for (const f of list) {
    mkdirSync(dirname(join(out, f)), { recursive: true });
    cpSync(join(root, f), join(out, f));
  }
  console.log(`dist/: ${list.length} files`);
}
