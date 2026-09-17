import { createServer } from 'node:http';
let probes=0;
createServer((request,response)=>{if(request.url==='/count'){response.end(JSON.stringify({probes}));return;}probes++;console.log('CONTROLLED_CANARY_REQUEST '+probes);response.end('controlled synthetic endpoint');}).listen(9091,'0.0.0.0');
