import { createServer } from 'node:http';
import { chromium, webkit, firefox } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const server = createServer((request,response) => {
  if(request.url.startsWith('/api/')) {
    response.setHeader('content-type','application/json');
    setTimeout(()=>response.end('{"synthetic":true}'),request.url.includes('slow')?150:0);
  } else { response.setHeader('content-type','text/html');response.end('<main><h1>Synthetic cancellation probe</h1></main>'); }
});
await new Promise(resolve=>server.listen(4368,'127.0.0.1',resolve));
const results=[];
try {
  for(const [engine,kind] of Object.entries({webkit,chromium,firefox})) {
    console.log(`Launching ${engine}`);
    const browser=await kind.launch({headless:true,...(engine==='chromium'?{executablePath:'C:/Cyberfyx-projects/Cyberfyx_ORVIA/.local/tools/playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe'}:{})});
    try {
      for(const mode of ['completed-abort','pending-abort','completed-no-abort']) {
        console.log(`Starting ${engine} ${mode}`);
        const page=await browser.newPage();const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://127.0.0.1:4368');
        let timer;
        const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Probe exceeded 30 seconds: ${engine} ${mode}`)),30000);});
        const result=await Promise.race([deadline,page.evaluate(async mode=>{
          const failures=[];
          for(let n=0;n<12;n++) {
            const c=new AbortController();
            const path='/api/'+(mode==='pending-abort'?'slow':'ready');
            const read=()=>fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([c.signal,AbortSignal.timeout(20000)])}).then(r=>r.json());
            if(mode==='pending-abort') {const first=read().catch(e=>e.name);c.abort();await first;}
            else {await read();if(mode==='completed-abort')c.abort();}
            try{await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000)}).then(r=>r.json());}catch(e){failures.push(e.message);}
          }
          return failures;
        },mode)]).catch(error=>[error.message]);
        clearTimeout(timer);
        results.push({engine,mode,errors,failures:result});console.log(JSON.stringify(results.at(-1)));await page.close();
      }
    } finally {await browser.close();}
  }
} finally {
  writeFileSync('handoffs/codex/artifacts/R8-abort-probe.json',JSON.stringify(results,null,2));
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify(results));
process.exitCode=results.some(r=>r.errors.length||r.failures.length)?1:0;
