'use client';
import type { UiFailure } from './errors.ts';
import { FailureState, NoticeBox } from './ui.tsx';
export function MutationFeedback({mutation,onReplayed}:{mutation:{failure:UiFailure|null;status:string;unsettled:boolean;retry:()=>Promise<unknown>};onReplayed:(result:unknown)=>void}) {
  if(!mutation.failure)return null;
  return <><FailureState failure={mutation.failure} />{mutation.unsettled?<NoticeBox tone="warn" title="Original request preserved"><p>A current-state read does not settle this request. Stay on this page. Replay uses the same payload and key; no new mutation is allowed while its outcome is unresolved.</p>{mutation.failure.code!=='IDEMPOTENCY_CONFLICT'?<button type="button" disabled={mutation.status==='pending'} onClick={async()=>{const result=await mutation.retry();if(result)onReplayed(result);}}>Replay original request</button>:<p>The server rejected conflicting key reuse. Preserve the request for operator investigation.</p>}</NoticeBox>:null}</>;
}
