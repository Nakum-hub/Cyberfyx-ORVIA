// Docker Desktop does not publish ports from an internal-only network.
// Fixed local TCP relays; no caller-supplied hosts, URLs or forwarding API.
import { createServer,connect } from 'node:net';
const servers=[];
const sockets=new Set();
let stopping=false;
function track(socket){
  sockets.add(socket);
  socket.once('close',()=>sockets.delete(socket));
  return socket;
}
for(const [port,host] of [[5432,'postgres'],[8181,'opa'],[7233,'temporal']]){
  const server=createServer(socket=>{
    if(stopping){socket.destroy();return;}
    track(socket);
    const upstream=track(connect({host,port}));
    upstream.setTimeout(300000,()=>upstream.destroy());
    socket.on('error',()=>upstream.destroy());
    upstream.on('error',()=>socket.destroy());
    socket.on('close',()=>upstream.destroy());
    upstream.on('close',()=>socket.destroy());
    socket.pipe(upstream).pipe(socket);
  });
  servers.push(server);
  server.maxConnections=64;
  server.listen(port,'0.0.0.0');
}
function shutdown(){
  if(stopping)return;
  stopping=true;
  const watchdog=setTimeout(()=>process.exit(1),3000);
  let pending=servers.length+sockets.size;
  let failed=false;
  const done=()=>{if(--pending===0){clearTimeout(watchdog);process.exit(failed?1:0);}};
  for(const server of servers){
    server.close(error=>{
      if(error)failed=true;
      done();
    });
  }
  for(const socket of sockets){socket.once('close',done);socket.destroy();}
}
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
