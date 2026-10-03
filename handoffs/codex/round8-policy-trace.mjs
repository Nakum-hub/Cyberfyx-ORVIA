// Read-only request timing: no bodies, headers, cookies or credentials retained.
import {subscribe} from 'node:diagnostics_channel';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
const pending=new WeakMap();
const allowed=path=>['/v1/data/orvia/admin/authorize','/v1/data/orvia/vendor/authorize'].includes(path);
const delay=monitorEventLoopDelay({resolution:20});delay.enable();
const emit=value=>console.error(JSON.stringify({round7_diagnostic:true,round8_policy_timing:true,pid:process.pid,...value}));
subscribe('undici:request:create',({request})=>{
 if(allowed(request.path))pending.set(request,{at:new Date().toISOString(),start:performance.now(),elu:performance.eventLoopUtilization(),path:request.path});
});
const finish=(request,result)=>{
 const entry=pending.get(request);if(!entry)return;pending.delete(request);
 const elu=performance.eventLoopUtilization(entry.elu);
 emit({at:entry.at,path:entry.path,elapsed_ms:Math.round(performance.now()-entry.start),loop_utilization:elu.utilization,loop_active_ms:Math.round(elu.active),loop_idle_ms:Math.round(elu.idle),loop_delay_max_ms:Math.round(delay.max/1e6),...result});
};
subscribe('undici:request:headers',({request,response})=>finish(request,{status:response.statusCode}));
subscribe('undici:request:error',({request,error})=>finish(request,{error:error.name,code:/^[A-Z_]+$/.test(error.code??'')?error.code:undefined}));
const timer=setInterval(()=>{delay.reset();},10000);timer.unref();
