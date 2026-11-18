// main.ts — Porto Alba II entrypoint (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ from beside this file into
// the output directory and writes dossier.json with the kit's buildDossier.
//
// Grader-safe by design: it runs headless in the grader's sandbox (node 22, no
// network, user 65534, read-only filesystem except the output directory, 10 s).
// It never deletes the output directory itself — that would need write access
// to the output directory's parent, which is read-only in the grader. Instead
// it only ever creates the output directory (mkdir -p style, which is a no-op
// when it already exists) and copies files into it, overwriting stale ones.
// Everything here is deterministic: two runs write byte-identical output.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory if it is missing; never remove it or its parent.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (gate.json): only text_max_bytes shapes the bytes; the
// other caps refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; more than 993 files in game/ or 48 MiB of game files in
// all, or a path under game/ over 1000 bytes: game/ counts beside /output's
// own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
