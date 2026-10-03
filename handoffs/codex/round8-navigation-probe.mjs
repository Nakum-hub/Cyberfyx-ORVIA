import { createServer } from 'node:http';
import { chromium, webkit, firefox } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const results=[];
const server=createServer((req,res)=>{
  res.setHeader('content-security-policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'");
  res.setHeader('cross-origin-opener-policy','same-origin');
  if(req.url.startsWith('/api/')) {res.setHeader('content-type','application/json');res.end('{"synthetic":true}');}
  else {res.setHeader('content-type','text/html');setTimeout(()=>res.end('<main><h1>Synthetic navigation probe</h1></main>'),req.url==='/next'?1000:0);}
});
await new Promise(resolve=>server.listen(4368,'127.0.0.1',resolve));
try {
  for(const [engine,kind] of Object.entries({webkit,chromium,firefox})) {
    console.log(`Launching ${engine}`);
    const browser=await kind.launch({headless:true,...(engine==='chromium'?{executablePath:'C:/Cyberfyx-projects/Cyberfyx_ORVIA/.local/tools/playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'}:{})});
    try {
      for(const mode of ['late-refresh','settled-refresh']) {
        const events=[];console.log(`Starting ${engine} ${mode}`);
        const page=await browser.newPage();page.setDefaultTimeout(30000);
        page.on('pageerror',e=>events.push({event:'pageerror',message:e.message}));
        page.on('request',r=>events.push({event:'request',url:r.url()}));
        page.on('requestfailed',r=>events.push({event:'requestfailed',url:r.url(),failure:r.failure()?.errorText}));
        await page.exposeFunction('trace',value=>events.push(value));
        await page.goto('http://127.0.0.1:4368');
        await page.evaluate(async mode=>{
          addEventListener('beforeunload',()=>void window.trace({event:'beforeunload'}));
          addEventListener('pagehide',()=>void window.trace({event:'pagehide'}));
          const read=async()=>{
            void window.trace({event:'refresh-start'});
            try {await fetch('/api/refresh',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(20000)}).then(r=>r.json());void window.trace({event:'refresh-end'});}
            catch(e){void window.trace({event:'refresh-error',name:e.name,message:e.message});}
          };
          await fetch('/api/write',{method:'POST',cache:'no-store'}).then(r=>r.json());
          if(mode==='late-refresh')setTimeout(()=>void read(),25);else await read();
          location.assign('/next');
        },mode);
        await page.waitForURL('**/next');await page.waitForLoadState('load');
        results.push({engine,mode,events});console.log(JSON.stringify(results.at(-1)));await page.close();
      }
    } finally {await browser.close();}
  }
} finally {writeFileSync('handoffs/codex/artifacts/R8-navigation-probe.json',JSON.stringify(results,null,2));server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
