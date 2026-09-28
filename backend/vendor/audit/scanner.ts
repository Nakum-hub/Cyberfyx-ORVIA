import { spawnSync } from 'node:child_process';

/**
 * Malware screening of uploaded evidence before anyone can open it.
 *
 * ORVIA_CLAMSCAN may name a ClamAV `clamdscan`/`clamscan` binary; when set, each
 * file is scanned by it and a non-clean or failed scan refuses the package.
 * The built-in structural screen always runs as well. It is NOT an antivirus
 * engine: it refuses executable formats, the EICAR test file, PDFs with
 * JavaScript, launch or embedded-file actions, and Office documents carrying
 * macros or embedded OLE objects. The engine used is recorded per package.
 */
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
export type ScanVerdict = { clean: boolean; engine: string; reasons: string[] };
export function structuralScan(bytes: Buffer, mediaType: string): string[] {
  const reasons: string[] = [];
  const head = bytes.subarray(0, 4);
  if (head.subarray(0, 2).toString('latin1') === 'MZ') reasons.push('EXECUTABLE_PE');
  if (head.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) reasons.push('EXECUTABLE_ELF');
  if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe].includes(bytes.length >= 4 ? bytes.readUInt32BE(0) : 0)) reasons.push('EXECUTABLE_MACHO');
  if (head.subarray(0, 2).toString('latin1') === '#!') reasons.push('SCRIPT');
  const text = bytes.toString('latin1');
  if (text.includes(EICAR)) reasons.push('EICAR_TEST_SIGNATURE');
  if (mediaType === 'application/pdf' && /\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction\s*<<[^>]*\/JS)\b/.test(text)) reasons.push('PDF_ACTIVE_CONTENT');
  if (mediaType.includes('openxmlformats') && /vbaProject\.bin|vbaData\.xml|\/embeddings\/oleObject|\.bin\b.*activeX/i.test(text)) reasons.push('OFFICE_MACRO_OR_EMBEDDED_OBJECT');
  return reasons;
}
export function scanFile(bytes: Buffer, mediaType: string, env: NodeJS.ProcessEnv = process.env): ScanVerdict {
  const reasons = structuralScan(bytes, mediaType);
  let engine = 'orvia-structural-screen-1';
  const clam = env.ORVIA_CLAMSCAN;
  if (clam) {
    engine += '+' + (clam.split('/').pop() ?? 'clamav');
    const run = spawnSync(clam, ['--no-summary', '-'], { input: bytes, timeout: 60000, maxBuffer: 1024 * 1024 });
    if (run.status === 1) reasons.push('ANTIVIRUS_DETECTION');
    else if (run.status !== 0) reasons.push('ANTIVIRUS_UNAVAILABLE');
  }
  return { clean: reasons.length === 0, engine, reasons };
}
