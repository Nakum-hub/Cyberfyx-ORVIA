// Private-network test boundary. Operator resolves only the named Compose peers;
// no request can choose an outbound host. All container DNS queries are denied.
import { createServer,connect,isIP } from 'node:net';
import { createSocket } from 'node:dgram';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ports={'codex-a00':[55431,58181,57233],'ui-b00':[55432,58182,57234],rehearsal:[55433,58183,57235]};
const profile=process.env.ORVIA_PROFILE;
if(!Object.hasOwn(ports,profile??''))throw new Error('Named profile required');
if(!/^A0[67]-network-observations-[a-f0-9-]+\.json$/.test(process.env.ORVIA_NETWORK_ARTIFACT??''))throw new Error('Named network observation artifact required');
const peers=JSON.parse(process.env.ORVIA_SERVICE_IPS??'null');
const services=['postgres','opa','temporal'];
if(!peers||Object.keys(peers).sort().join(',')!=='opa,postgres,temporal'||services.some(s=>isIP(peers[s])!==4||!/^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(peers[s])))throw new Error('Private named peer addresses required');
const observations={started_at:new Date().toISOString(),dns_denied:[],service_connections:{postgres:0,opa:0,temporal:0}};
const servers=[];
for(const [i,service] of services.entries()){
 const server=createServer(socket=>{observations.service_connections[service]++;const upstream=connect({host:peers[service],port:[5432,8181,7233][i]});upstream.setTimeout(300000,()=>upstream.destroy());socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>upstream.destroy());upstream.on('close',()=>socket.destroy());socket.pipe(upstream).pipe(socket);});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(ports[profile][i],'127.0.0.1',resolve);});servers.push(server);
}
const dns=createSocket('udp4');
dns.on('message',(packet,remote)=>{
 if(packet.length<12||packet.length>512)return;let at=12;const labels=[];
 while(at<packet.length){const n=packet[at++];if(n===0)break;if(n>63||at+n>packet.length)return;labels.push(packet.subarray(at,at+n).toString('ascii'));at+=n;}
 const host=labels.join('.');if(observations.dns_denied.length<1000)observations.dns_denied.push({host,at:new Date().toISOString()});
 const response=Buffer.from(packet);response.writeUInt16BE(0x8183,2);response.writeUInt16BE(0,6);response.writeUInt16BE(0,8);response.writeUInt16BE(0,10);dns.send(response,remote.port,remote.address);
});
await new Promise((resolve,reject)=>{dns.once('error',reject);dns.bind(53,'127.0.0.1',resolve);});
const child=spawn(process.execPath,['--import','tsx','tests/security/network-core.ts'],{stdio:'inherit',env:process.env});
const code=await new Promise(resolve=>{child.once('error',()=>resolve(1));child.once('close',code=>resolve(code??1));});
observations.finished_at=new Date().toISOString();observations.exit_code=code;
writeFileSync('handoffs/codex/artifacts/'+process.env.ORVIA_NETWORK_ARTIFACT,JSON.stringify(observations,null,2)+'\n');
dns.close();for(const server of servers)server.close();process.exit(code);
