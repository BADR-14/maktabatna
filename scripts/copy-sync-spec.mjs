/**
 * The server compiles to CommonJS and can't import the shared ESM package at runtime, so it gets
 * a copy of packages/shared/src/sync.ts. Run `node scripts/copy-sync-spec.mjs` after editing it;
 * `npm test` fails while the copy is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const src = new URL('../packages/shared/src/sync.ts', import.meta.url);
const dst = new URL('../apps/server/src/sync/spec.ts', import.meta.url);
const HEADER = '// GENERATED from packages/shared/src/sync.ts by scripts/copy-sync-spec.mjs. Do not edit.\n';
const want = HEADER + readFileSync(src, 'utf8');

if (process.argv.includes('--check')) {
  let have = '';
  try {
    have = readFileSync(dst, 'utf8');
  } catch {}
  if (have !== want) {
    console.error('apps/server/src/sync/spec.ts is out of date: run node scripts/copy-sync-spec.mjs');
    process.exit(1);
  }
  console.log('sync spec copy is up to date');
} else {
  writeFileSync(dst, want);
  console.log('wrote apps/server/src/sync/spec.ts');
}
