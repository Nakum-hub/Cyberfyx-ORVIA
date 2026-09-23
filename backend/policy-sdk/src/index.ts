import { z } from 'zod';
import type { RuntimeConfig } from '../../auth/src/config.ts';
const Result=z.strictObject({decision:z.enum(['ALLOW','BLOCK','INDETERMINATE']),reason_codes:z.array(z.string().regex(/^[A-Z_]{1,64}$/)).min(1).max(16)});
export async function processingDecision(config: RuntimeConfig, input: Record<string,unknown>): Promise<z.infer<typeof Result>> {
 try {
  const response=await fetch(`http://127.0.0.1:${config.opa_port}/v1/data/orvia/processing/decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input}),signal:AbortSignal.timeout(2000)});
  if(!response.ok)return {decision:'INDETERMINATE',reason_codes:['POLICY_UNAVAILABLE']};
  const envelope: unknown=await response.json();
  if(!envelope||typeof envelope!=='object'||!('result' in envelope))return {decision:'INDETERMINATE',reason_codes:['POLICY_RESULT_MISSING']};
  const parsed=Result.safeParse(envelope.result);
  return parsed.success?parsed.data:{decision:'INDETERMINATE',reason_codes:['POLICY_RESULT_INVALID']};
 }catch{return {decision:'INDETERMINATE',reason_codes:['POLICY_UNAVAILABLE']};}
}
