/**
 * Generates drizzle/0003_layout_estimates.sql: room sizes, doors/windows, and each bookcase's
 * wall, size and height from the floor — ESTIMATED from the photos (docs/rooms/) until the real
 * measurements arrive. When they do, put them in a NEW migration (never edit a shipped one).
 *   node scripts/build-layout-sql.mjs
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Must match scripts/build-seed-sql.mjs.
const NAMESPACE = 'maktabatna-seed-v1';
function uuid(key) {
  const h = createHash('sha1').update(`${NAMESPACE}:${key}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`);

// All sizes in cm. offset = distance from the wall's start (back-left corner) to the bookcase edge.
const ROOMS = {
  salon: {
    size: { width: 420, depth: 400, height: 295 },
    openings: [
      { kind: 'door', wall: 'left', offsetCm: 262, widthCm: 90, heightCm: 210, elevationCm: 0 },
      { kind: 'window', wall: 'right', offsetCm: 70, widthCm: 130, heightCm: 130, elevationCm: 90 },
    ],
    finish: 'wood',
    bookcases: {
      1: { wallSide: 'back', offset: 187, width: 208, height: 114, depth: 34, elevation: 156 },
      2: { wallSide: 'back', offset: 38, width: 147, height: 105, depth: 30, elevation: 160 },
      3: { wallSide: 'left', offset: 34, width: 130, height: 105, depth: 30, elevation: 160 },
      4: { wallSide: 'left', offset: 166, width: 90, height: 42, depth: 30, elevation: 225 },
      5: { wallSide: 'left', offset: 258, width: 120, height: 42, depth: 30, elevation: 225 },
      6: { wallSide: 'left', offset: 166, width: 70, height: 62, depth: 30, elevation: 160 },
    },
  },
  qaada: {
    size: { width: 500, depth: 420, height: 300 },
    openings: [{ kind: 'window', wall: 'right', offsetCm: 80, widthCm: 150, heightCm: 140, elevationCm: 80 }],
    finish: 'aluminum',
    bookcases: {
      1: { wallSide: 'back', offset: 356, width: 130, height: 125, depth: 32, elevation: 175 },
      2: { wallSide: 'back', offset: 214, width: 140, height: 100, depth: 30, elevation: 175 },
      3: { wallSide: 'back', offset: 102, width: 110, height: 100, depth: 30, elevation: 175 },
      4: { wallSide: 'back', offset: 30, width: 70, height: 125, depth: 32, elevation: 175 },
    },
  },
};

const out = [];
for (const [key, room] of Object.entries(ROOMS)) {
  out.push(
    `UPDATE \`rooms\` SET \`width_cm\` = ${room.size.width}, \`depth_cm\` = ${room.size.depth}, \`height_cm\` = ${room.size.height}, ` +
      `\`openings\` = ${q(JSON.stringify(room.openings))} WHERE \`id\` = ${q(uuid(`room:${key}`))};`,
  );
  for (const [n, b] of Object.entries(room.bookcases)) {
    out.push(
      `UPDATE \`bookcases\` SET \`wall_side\` = ${q(b.wallSide)}, \`finish\` = ${q(room.finish)}, \`offset_cm\` = ${b.offset}, ` +
        `\`width_cm\` = ${b.width}, \`height_cm\` = ${b.height}, \`depth_cm\` = ${b.depth}, \`elevation_cm\` = ${b.elevation} ` +
        `WHERE \`id\` = ${q(uuid(`bookcase:${key}:${n}`))};`,
    );
  }
}

const target = fileURLToPath(new URL('../drizzle/0003_layout_estimates.sql', import.meta.url));
writeFileSync(target, out.join('\n--> statement-breakpoint\n') + '\n');
console.log(`wrote ${out.length} statements to ${target}`);
