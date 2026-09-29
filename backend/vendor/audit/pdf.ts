/**
 * A minimal, dependency-free PDF writer for audit reports: A4 pages, the
 * standard Helvetica fonts (not embedded, so no font file is fetched), wrapped
 * text, headings. Deterministic: the same lines always produce the same bytes,
 * so the report's PDF hash can be bound into its signed JSON.
 */
export type PdfLine = { text: string; style?: 'title' | 'heading' | 'body' | 'small' };
const STYLE = { title: { font: 'F2', size: 18, lead: 26, width: 60 }, heading: { font: 'F2', size: 12, lead: 18, width: 85 }, body: { font: 'F1', size: 10, lead: 14, width: 100 }, small: { font: 'F1', size: 8, lead: 11, width: 125 } } as const;
const escape = (s: string) => s.replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');

function wrap(text: string, width: number) {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if ((line + ' ' + word).trim().length > width) { if (line) out.push(line); line = word.length > width ? word.slice(0, width) : word; }
      else line = (line + ' ' + word).trim();
    }
    out.push(line);
  }
  return out;
}

export function renderPdf(lines: PdfLine[], footer: string): Buffer {
  const pages: string[][] = [[]]; let y = 800;
  for (const line of lines) {
    const s = STYLE[line.style ?? 'body'];
    if (line.style === 'heading') y -= 6;
    for (const part of wrap(line.text, s.width)) {
      if (y < 70) { pages.push([]); y = 800; }
      pages.at(-1)!.push(`BT /${s.font} ${s.size} Tf 50 ${y} Td (${escape(part)}) Tj ET`);
      y -= s.lead;
    }
  }
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const catalog = add(''); const pageTree = add('');
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids: number[] = [];
  pages.forEach((content, index) => {
    const stream = [...content, `BT /F1 8 Tf 50 40 Td (${escape(`${footer} - page ${index + 1} of ${pages.length}`)}) Tj ET`].join('\n');
    const contents = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contents} 0 R >>`));
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pageTree} 0 R >>`;
  objects[pageTree - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let body = '%PDF-1.4\n'; const offsets: number[] = [];
  objects.forEach((o, i) => { offsets.push(Buffer.byteLength(body, 'latin1')); body += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}
