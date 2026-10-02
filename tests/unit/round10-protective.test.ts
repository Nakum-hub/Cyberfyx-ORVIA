import test from 'node:test';
import assert from 'node:assert/strict';
import {routes} from '../../shared/contracts/src/index.ts';
import {requireEntitlement} from '../../backend/domain/src/licensing/licensing.ts';
import type {Context} from '../../backend/domain/src/shared/transaction.ts';
test('wind-down passes without a premium licence; activation still requires one',async()=>{
 const c={actor:{scope:{}},tx:{query:async()=>({rows:[]})}} as unknown as Context;
 const mandate=routes.find(r=>r.id==='change_audit_mandate_state')!,control=routes.find(r=>r.id==='toggle_control_test')!;
 for(const state of ['SUSPENDED','REVOKED'])await requireEntitlement(c,mandate,{state,reason:'Synthetic protective stop'});
 await requireEntitlement(c,control,{enabled:false});
 await assert.rejects(requireEntitlement(c,mandate,{state:'ACTIVE',reason:'Synthetic activation'}));
 await assert.rejects(requireEntitlement(c,control,{enabled:true}));
 await assert.rejects(requireEntitlement(c,mandate,{state:'REVOKED',reason:''}));
});
