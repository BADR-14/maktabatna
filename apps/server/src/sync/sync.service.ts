import { BadRequestException, Injectable } from '@nestjs/common';
import { mergeRows, SYNC_TABLE_BY_NAME, SYNC_TABLES, type ColType, type SyncTable, type WireRow } from './spec.ts';

import type { Prisma } from '../generated/prisma/client.ts';
import { isAdmin } from '../auth/admins.ts';
import { PrismaService } from '../prisma.service.ts';

/** Pushes and the pull cursor read share this lock, so a pull never skips a push still in flight. */
const SYNC_LOCK = 4242;
/** Most changes one pull returns; the phone asks again while `more` is true. */
const PULL_WINDOW = 3000;
const MAX_PUSH_ROWS = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Tx = Prisma.TransactionClient;
export type PushBody = { tables: Record<string, WireRow[]> };

/** SQL cast for a column, from the shared sync spec. */
function cast(t: ColType): string {
  if (t.startsWith('enum:')) return `"${t.slice(5)}"`;
  return { uuid: 'uuid', text: 'text', int: 'integer', bigint: 'bigint', float: 'double precision', bool: 'boolean', json: 'jsonb' }[t as Exclude<ColType, `enum:${string}`>];
}

/** Postgres value → the phone's shape (numbers, JSON as text, booleans as 0/1). */
function toWire(table: SyncTable, row: Record<string, unknown>): WireRow {
  const out: WireRow = {};
  for (const [col, t] of Object.entries(table.cols)) {
    const v = row[col];
    if (v === null || v === undefined) out[col] = null;
    else if (t === 'bigint') out[col] = Number(v);
    else if (t === 'json') out[col] = typeof v === 'string' ? v : JSON.stringify(v);
    else if (t === 'bool') out[col] = v ? 1 : 0;
    else out[col] = v as string | number;
  }
  return out;
}

/** The phone's shape → a query parameter for the cast above. */
function toParam(t: ColType, v: string | number | null | undefined): unknown {
  if (v === null || v === undefined) return null;
  if (t === 'bool') return v === 1 || v === '1' || v === 'true';
  if (t === 'int' || t === 'bigint' || t === 'float') return Number(v);
  return String(v);
}

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /** Merges a batch of changed rows from a phone, field by field, under row locks. */
  async push(body: PushBody, userId: string) {
    const tables = body?.tables ?? {};
    let total = 0;
    for (const [name, rows] of Object.entries(tables)) {
      const spec = SYNC_TABLE_BY_NAME[name];
      if (!spec || spec.mode === 'pull') throw new BadRequestException(`جدول غير مسموح: ${name}`);
      if (!Array.isArray(rows)) throw new BadRequestException('صيغة غير صحيحة');
      total += rows.length;
      for (const r of rows) if (typeof r?.id !== 'string' || !UUID.test(r.id)) throw new BadRequestException('معرّف غير صحيح');
    }
    if (total > MAX_PUSH_ROWS) throw new BadRequestException('دفعة كبيرة جداً');

    const me = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true, deletedAt: true } });
    const admin = !!me && me.deletedAt === null && isAdmin(me.username);
    let applied = 0;
    const rejected: { table: string; id: string; known: boolean }[] = [];
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYNC_LOCK})`);
        // Parents before children, whatever order the phone sent.
        for (const spec of SYNC_TABLES) {
          const rows = tables[spec.name];
          if (!rows?.length) continue;
          const r = await this.pushTable(tx, spec, rows, userId, admin);
          applied += r.applied;
          rejected.push(...r.rejected.map((x) => ({ table: spec.name, ...x })));
        }
      },
      { timeout: 60_000 },
    );
    return { applied, rejected };
  }

  private async pushTable(tx: Tx, spec: SyncTable, rows: WireRow[], userId: string, admin: boolean) {
    const cols = Object.keys(spec.cols);
    const list = cols.map((c) => `"${c}"`).join(', ');
    const ids = rows.map((r) => String(r.id));
    const found = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${list} FROM "${spec.name}" WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      ids,
    );
    const current = new Map(found.map((r) => [String(r.id), toWire(spec, r)]));
    let applied = 0;
    const rejected: { id: string; known: boolean }[] = [];
    for (const incoming of rows) {
      const existing = current.get(String(incoming.id)) ?? null;
      // Someone else's reading, or a parents-only row from a non-admin: refuse it, and bump the
      // stored row so the phone that sent it pulls the real one back.
      const notMine = spec.owner && (incoming[spec.owner] !== userId || (existing && existing[spec.owner] !== userId));
      if ((spec.adminOnly && !admin) || notMine) {
        rejected.push({ id: String(incoming.id), known: !!existing });
        if (existing) await tx.$executeRawUnsafe(`UPDATE "${spec.name}" SET sync_seq = nextval('sync_seq') WHERE id = $1::uuid`, String(incoming.id));
        continue;
      }
      const merged = mergeRows(spec, existing, incoming);
      if (!merged) continue;
      const params = cols.map((c) => toParam(spec.cols[c], merged[c]));
      const values = cols.map((c, i) => `$${i + 1}::${cast(spec.cols[c])}`);
      if (existing) {
        const set = cols
          .filter((c) => c !== 'id')
          .map((c) => `"${c}" = ${values[cols.indexOf(c)]}`)
          .join(', ');
        await tx.$executeRawUnsafe(`UPDATE "${spec.name}" SET ${set}, sync_seq = nextval('sync_seq') WHERE id = $1::uuid`, ...params);
      } else {
        await tx.$executeRawUnsafe(`INSERT INTO "${spec.name}" (${list}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING`, ...params);
      }
      current.set(String(merged.id), merged);
      applied++;
    }
    return { applied, rejected };
  }

  /** Every change after `since`, oldest first, at most one window at a time. */
  async pull(since: number) {
    const last = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SYNC_LOCK})`);
      const [row] = await tx.$queryRawUnsafe<{ last: bigint }[]>(`SELECT CASE WHEN is_called THEN last_value ELSE 0 END AS last FROM sync_seq`);
      return Number(row.last);
    });
    const upTo = Math.min(last, since + PULL_WINDOW);
    const tables: Record<string, WireRow[]> = {};
    for (const spec of SYNC_TABLES) {
      const list = Object.keys(spec.cols)
        .map((c) => `"${c}"`)
        .join(', ');
      const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${list} FROM "${spec.name}" WHERE sync_seq > $1 AND sync_seq <= $2 ORDER BY sync_seq`,
        since,
        upTo,
      );
      if (rows.length) tables[spec.name] = rows.map((r) => toWire(spec, r));
    }
    return { tables, cursor: upTo, more: upTo < last };
  }
}
