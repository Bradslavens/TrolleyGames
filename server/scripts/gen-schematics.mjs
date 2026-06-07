// Generates one schematic JSON file per line from the signal data.
//
//   node server/scripts/gen-schematics.mjs
//
// Re-run this whenever the signal lists change so the schematics stay in sync.
// (A test also enforces that the committed JSON matches the signal data.)

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { buildSchematic, lineSlug } from '../../public/src/data/schematicLayout.js';
import { correctSignals } from '../../public/src/data/correctSignals.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../../public/src/data/schematics');
mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [line, signals] of Object.entries(correctSignals)) {
  const schematic = buildSchematic(line, signals);
  const file = resolve(outDir, `${lineSlug(line)}.json`);
  writeFileSync(file, JSON.stringify(schematic, null, 2) + '\n');
  console.log(`  wrote ${lineSlug(line)}.json  (${signals.length} signals)`);
  count++;
}
console.log(`Done: ${count} schematic files in ${outDir}`);
