// TEST_FIXTURE only. Fixed marker TCP echo/hold; no SQL, records or credentials.
import { createServer } from 'node:net';
const marker=Buffer.from('R8_RELAY_FIXTURE\n');
const sockets=new Set();
let stopping=false;
const server=createServer(socket=>{
  if(stopping){socket.destroy();return;}
  sockets.add(socket);socket.once('close',()=>sockets.delete(socket));
  socket.on('error',()=>socket.destroy());
  let input=Buffer.alloc(0);
  socket.on('data',chunk=>{
    input=Buffer.concat([input,chunk]);
    if(input.length>marker.length||!marker.subarray(0,input.length).equals(input)){socket.destroy();return;}
    if(input.length===marker.length){socket.write(marker);input=Buffer.alloc(0);}
  });
});
server.maxConnections=64;server.listen(5432,'0.0.0.0');
function stop(){
  if(stopping)return;stopping=true;
  const watchdog=setTimeout(()=>process.exit(1),3000);
  let pending=1+sockets.size;
  const done=()=>{if(--pending===0){clearTimeout(watchdog);process.exit(0);}};
  server.close(error=>{if(error)process.exit(1);done();});
  for(const socket of sockets){socket.once('close',done);socket.destroy();}
}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
