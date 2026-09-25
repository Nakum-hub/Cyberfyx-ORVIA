import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
const browser=await chromium.launch({headless:true,executablePath:resolve('.local/tools/playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe')});
try{
  const page=await browser.newPage();
  await page.goto(pathToFileURL(resolve('tmp/section2-evidence-update.html')).href);
  await page.pdf({path:resolve('output/pdf/ORVIA_Section_2_Evidence_Update_2026-09-25.pdf'),format:'A4',landscape:true,printBackground:true,
    displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-size:8px;color:#60758a;width:100%;text-align:right;margin-right:14mm">ORVIA · Section 2 evidence update · <span class="pageNumber"></span></div>',
    margin:{top:'18mm',right:'15mm',bottom:'17mm',left:'15mm'}});
}finally{await browser.close();}
