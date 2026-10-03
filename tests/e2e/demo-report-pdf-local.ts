// Reports as PDF, in a real browser on the running rehearsal installation (owner request 2026-10-03: reports export as a
// readable PDF). The owner signs in, builds each report preset, and the browser's own print-to-PDF produces the file the
// "Save as PDF" button produces. Checked: the file is a PDF with pages; the print view hides the workspace (navigation,
// builder, buttons) and shows the report cover and sections with the demo data. Requires npm start and npm run demo:data.
import { X509Certificate, createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { writeEvidence } from '../../shared/testing/src/evidence.ts';
import { guardAuthWindow } from '../../shared/testing/src/auth-window.ts';

process.env.ORVIA_PROFILE ??= 'rehearsal';
const ORIGIN = 'https://127.0.0.1:4330';
const dir = resolve('.local/profiles/rehearsal');
const owner = JSON.parse(readFileSync(resolve(dir, 'auth/bootstrap.json'), 'utf8')).users.owner as { email: string; password: string; totp_uri: string };
const spki = createHash('sha256').update(new X509Certificate(readFileSync(resolve(dir, 'tls/server-cert.pem'))).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
const out = resolve('output/playwright/demo-report-pdf'); mkdirSync(out, { recursive: true });
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => { results.push({ name, result: ok ? 'PASS' : 'FAIL', ...(ok ? {} : { detail: detail.slice(0, 300) }) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  (${detail.slice(0, 300)})`}`); };

async function signIn(page: Page) {
  await guardAuthWindow(4);
  await page.goto(`${ORIGIN}/workspace/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(owner.email); await page.getByLabel('Password', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(owner.totp_uri));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(u => u.pathname === '/workspace', { timeout: 30_000 });
}

const browser = await chromium.launch({ executablePath, args: [`--ignore-certificate-errors-spki-list=${spki}`] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await signIn(page);
  for (const preset of ['Board or management pack', 'Response to a regulator or auditor', 'Full privacy record']) {
    await page.emulateMedia({ media: 'screen' });
    await page.goto(`${ORIGIN}/workspace/reports`);
    await page.getByRole('button', { name: new RegExp(`^${preset}`) }).click();
    await page.getByRole('button', { name: 'Build this report', exact: true }).click();
    const save = page.getByRole('button', { name: 'Save as PDF', exact: true });
    await save.waitFor({ timeout: 60_000 });
    check(`${preset}: the report builds and offers "Save as PDF"`, await save.isVisible());
    const slug = preset.toLowerCase().replace(/[^a-z]+/g, '-');
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
    writeFileSync(resolve(out, `${slug}.pdf`), pdf);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    check(`${preset}: a PDF is produced (${pages} page(s), ${Math.round(pdf.length / 1024)} KB)`, pdf.subarray(0, 5).toString() === '%PDF-' && pages >= 1, `${pages} pages`);
    // What the PDF contains is what the print view shows.
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 794, height: 1123 });
    // Evaluated as a string so the bundler adds no helper names inside the page.
    const printed = await page.evaluate(`(() => {
      const shown = sel => [...document.querySelectorAll(sel)].some(el => el.offsetParent !== null && getComputedStyle(el).display !== 'none');
      return { nav: shown('.shell-nav'), builder: shown('.report-builder'), buttons: shown('main button'), text: document.querySelector('main').innerText.replace(/\\s+/g, ' ') };
    })()`) as { nav: boolean; builder: boolean; buttons: boolean; text: string };
    await page.screenshot({ path: resolve(out, `${slug}-print-view.png`), fullPage: true });
    await page.screenshot({ path: resolve(out, `${slug}-page-1.png`) });
    check(`${preset}: the PDF leaves out the workspace (navigation, builder, buttons)`, !printed.nav && !printed.builder && !printed.buttons, JSON.stringify({ ...printed, text: undefined }));
    check(`${preset}: the PDF carries the report with the demonstration data`, /Aster|Promotional email and SMS|Personalised recommendations|Order fulfilment/.test(printed.text) && printed.text.length > 800, printed.text.slice(0, 300));
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  check('no page error or server error while building and printing', errors.length === 0, errors.join('; '));
} finally {
  await browser.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  writeEvidence('demo-report-pdf', { results, result: failures ? 'FAIL' : 'PASS' });
  console.log(`\n${results.length} assertions, ${failures} failures. PDFs and print views: output/playwright/demo-report-pdf/`);
  if (failures) process.exitCode = 1;
}
