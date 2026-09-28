/**
 * Printable shelf labels: one QR per shelf (and per bookcase top), grouped by room and bookcase,
 * three to a row on A4. The QR holds maktabatna://shelf/<id>, which the in-app scanner reads and
 * any camera app opens straight on the shelf page.
 */
import { toArabicDigits } from '@maktabatna/shared';
import makeQr from 'qrcode-generator';

import { shelfLabel } from '@/components/shelf-picker';

type Shelf = { shelfId: string; shelfNumber: number; kind: string; bookcaseId: string; bookcaseNumber: number; bookcaseName: string; roomId: string; roomName: string };

function svg(text: string) {
  const qr = makeQr(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
}

export function labelsHtml(shelves: Shelf[]): string {
  let body = '';
  const rooms = [...new Map(shelves.map((s) => [s.roomId, s.roomName])).entries()];
  for (const [roomId, roomName] of rooms) {
    body += `<h1>${roomName}</h1>`;
    const cases = [...new Map(shelves.filter((s) => s.roomId === roomId).map((s) => [s.bookcaseId, s])).values()];
    for (const b of cases) {
      const list = shelves
        .filter((s) => s.bookcaseId === b.bookcaseId)
        .sort((x, y) => (x.kind === 'top' ? 1 : 0) - (y.kind === 'top' ? 1 : 0) || x.shelfNumber - y.shelfNumber);
      body += `<section><h2>مكتبة ${toArabicDigits(b.bookcaseNumber)}، ${b.bookcaseName}</h2><div class="grid">`;
      for (const s of list) {
        body += `<div class="label"><div class="qr">${svg(`maktabatna://shelf/${s.shelfId}`)}</div><div class="t"><b>${shelfLabel(s.kind, s.shelfNumber)}</b><span>مكتبة ${toArabicDigits(b.bookcaseNumber)}، ${b.bookcaseName}</span><em>${roomName}</em></div></div>`;
      }
      body += `</div></section>`;
    }
  }
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
@page{size:A4;margin:12mm}
body{font-family:sans-serif;color:#2A1A1C;margin:0}
h1{color:#7A2230;font-size:22pt;margin:4mm 0 2mm;border-bottom:1.5pt solid #B98D45;padding-bottom:1mm;page-break-after:avoid}
h1:not(:first-of-type){page-break-before:always}
section{page-break-inside:avoid;margin-bottom:4mm}
h2{font-size:14pt;margin:2mm 0;page-break-after:avoid}
.grid{display:grid;grid-template-columns:repeat(3,1fr)}
.label{display:flex;align-items:center;gap:3mm;border:0.6pt dashed #999;padding:3mm;height:30mm;box-sizing:border-box}
.qr{width:24mm;height:24mm;flex:none}.qr svg{width:100%;height:100%}
.t{display:flex;flex-direction:column;gap:0.5mm}
.t b{font-size:16pt;color:#7A2230}.t span{font-size:8.5pt}.t em{font-style:normal;font-size:8pt;color:#7A6365}
</style></head><body>${body}</body></html>`;
}
