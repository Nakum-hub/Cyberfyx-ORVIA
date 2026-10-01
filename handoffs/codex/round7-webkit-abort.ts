// Browser-only transport experiment: local synthetic HTML, no application or DB.
import { createServer } from 'node:http';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { webkit } from '@playwright/test';
const server=createServer((request,response)=>{
  if(request.url==='/slow'){
    const timer=setTimeout(()=>{response.setHeader('content-type','application/json');response.end('{}');},2000);
    response.on('close',()=>clearTimeout(timer));return;
  }
  response.setHeader('content-type','text/html');
  if(request.url?.startsWith('/start'))response.end(`<main>Start</main><script>
    const controller=new AbortController();
    ${request.url.includes('cancel=1')?"addEventListener('pagehide',()=>controller.abort());":''}
    fetch('/slow',{signal:controller.signal}).catch(()=>{});
  </script>`);
  else response.end('<main>Destination</main>');
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const address=server.address();if(!address||typeof address==='string')throw new Error('Local port missing');
const origin=`http://127.0.0.1:${address.port}`;
const results:unknown[]=[];const browser=await webkit.launch({headless:true});
try{
  for(const cancel of [false,true])for(let repeat=0;repeat<4;repeat++){
    const context=await browser.newContext();const page=await context.newPage();
    const errors:string[]=[];const failures:unknown[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('requestfailed',request=>failures.push({path:new URL(request.url()).pathname,failure:request.failure()?.errorText}));
    const started=page.waitForRequest(request=>request.url().endsWith('/slow'));
    await page.goto(`${origin}/start?cancel=${cancel?1:0}`);await started;
    await page.waitForTimeout(50);await page.goto(`${origin}/destination`);
    await page.waitForTimeout(200);
    results.push({cancel_on_pagehide:cancel,repeat,errors,failures});await context.close();
  }
}finally{await browser.close();server.close();await once(server,'close');}
writeFileSync('handoffs/codex/artifacts/R7V-webkit-abort-experiment.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
