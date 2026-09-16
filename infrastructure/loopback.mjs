// Docker Desktop does not publish ports from an internal-only network.
// Fixed local TCP relays; no caller-supplied hosts, URLs or forwarding API.
import { createServer,connect } from 'node:net';
for(const [port,host] of [[5432,'postgres'],[8181,'opa'],[7233,'temporal']]){
  const server=createServer(socket=>{
    const upstream=connect({host,port});
    upstream.setTimeout(300000,()=>upstream.destroy());
    socket.on('error',()=>upstream.destroy());
    upstream.on('error',()=>socket.destroy());
    socket.on('close',()=>upstream.destroy());
    upstream.on('close',()=>socket.destroy());
    socket.pipe(upstream).pipe(socket);
  });
  server.maxConnections=64;
  server.listen(port,'0.0.0.0');
}
