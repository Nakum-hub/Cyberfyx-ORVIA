import { randomUUID } from 'node:crypto';
import * as S from '../../contracts/src/index.ts';
import { HttpFixture,authenticatorCode } from './http-fixture.ts';

export async function createMarketingScenario(harness: HttpFixture, connector: 'SYNTHETIC_CRM'|'ORVIA_REST_SIMULATOR'='SYNTHETIC_CRM', purposeCode: 'promotional_marketing'|'order_service_demo'='promotional_marketing') {
 const owner=await harness.login('owner');const author=await harness.login('admin');const alice=await harness.login('alice');
 async function create(path: string,input: unknown) {
  const response=await author.call(path,input,{'idempotency-key':randomUUID()});
  if(response.status!==201)throw new Error('Synthetic scenario configuration failed');return response.json();
 }
 const scope=harness.users.owner!.scope;const selectors={legal_entity_id:scope.legal_entity_id,environment_id:scope.environment_id};
 const purpose=S.Purpose.parse(await create('/api/v1/admin/purposes',{...selectors,code:purposeCode,name:'Synthetic workflow '+randomUUID().slice(0,8),description:'Isolated backend integration fixture; no real message transport.'}));
 const notice=S.Notice.parse(await create('/api/v1/admin/notices',{purpose_id:purpose.id,language:'en',title:'Optional synthetic marketing',content:'This fixture permits only synthetic marketing; withdraw in this portal.'}));
 const system=S.System.parse(await create('/api/v1/admin/systems',{...selectors,name:connector,connector}));
 const policy=S.Policy.parse(await create('/api/v1/admin/policies',{purpose_id:purpose.id,notice_version_id:notice.version_id,condition:purposeCode==='promotional_marketing'?'AFFIRMATIVE_MARKETING_CONSENT':'APPROVED_SYNTHETIC_ORDER_SERVICE',system_ids:[system.id],required_observation:true}));
 const proofResponse=await owner.call(`/api/v1/admin/policies/${policy.id}/reauthenticate`,{version_id:policy.version_id,digest:policy.digest,code:authenticatorCode(harness.users.owner!.totp_uri!)});
 if(proofResponse.status!==201)throw new Error('Synthetic reviewer reauthentication failed');
 const proof=S.PublicationProof.parse(await proofResponse.json());
 const published=await owner.call(`/api/v1/admin/policies/${policy.id}/publish`,{version_id:policy.version_id,digest:policy.digest,reauthentication_id:proof.reauthentication_id},{'idempotency-key':randomUUID()});
 if(!published.ok)throw new Error('Synthetic publication failed');
 const mapping=S.TargetMapping.parse(await create('/api/v1/admin/target-mappings',{principal_id:harness.users.alice!.principal_id,purpose_id:purpose.id,system_id:system.id}));
 async function choice() {const response=await alice.call('/api/v1/portal/me/consents?limit=100');const item=S.schemas.ConsentList.parse(await response.json()).items.find(i=>i.purpose_id===purpose.id);if(!item)throw new Error('Scenario purpose not visible');return item;}
 async function change(kind:'grant'|'withdraw') {
  const current=await choice();const input={expected_epoch:current.consent_epoch,interaction_id:current.interaction_id,...kind==='grant'?{affirmative:true,notice_version_id:current.notice!.version_id}:{}};
  const key=randomUUID();const path=`/api/v1/portal/me/consents/${purpose.id}/${kind}`;
  const response=await alice.call(path,input,{'idempotency-key':key});if(response.status!==202)throw new Error('Synthetic consent failed');
  return {receipt:S.Receipt.parse(await response.json()),key,input,path};
 }
 return {owner,author,alice,scope,purpose,notice,system,policy,mapping,choice,change};
}
