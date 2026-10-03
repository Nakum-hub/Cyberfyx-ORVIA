"""Apply only after Run 2 has finished; preserve original failure evidence."""
from pathlib import Path

def edit(path, old, new):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s: raise RuntimeError('Missing patch target: '+path+' '+old[:60])
    p.write_text(s.replace(old,new),encoding='utf-8')

edit('backend/api/src/vendor/provisioning.ts', "request.method === 'POST' ? await limitedBody", "request.method === 'POST' && request.body ? await limitedBody")
edit('backend/api/src/vendor/provisioning.ts', 'const client = h(P.PROVISIONING_HEADERS.client),', 'const client = h(P.PROVISIONING_HEADERS.client).toLowerCase(),')
edit('backend/domain/src/onboarding/file-intake.ts', "  if (row.detected_kind === 'UNRECOGNISED') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'content', code: 'unrecognised_files_can_only_be_rejected' }]);\n  if (!row.content) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'content', code: 'content_not_kept' }]);", "  if (!row.content) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'content', code: 'content_not_kept' }]);\n  if (row.detected_kind === 'UNRECOGNISED') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'content', code: 'unrecognised_files_can_only_be_rejected' }]);")
edit('frontend/src/components/shared/shell.tsx', "const open = current || expanded[group.group] === true;", "const open = current || (index === 0 && pathname.endsWith('/sign-in')) || expanded[group.group] === true;")
edit('frontend/src/components/shared/shell.tsx', "{ group: 'Overview', items: [", "{ group: 'Overview', items: [\n    { href: '/workspace/sign-in', label: 'Staff sign in', whenSignedOut: true },")
edit('scripts/source-paths.mjs', "['handoffs/', 'artifacts/', 'docs/']", "['handoffs/', 'artifacts/', 'docs/', 'output/playwright/']")
edit('tests/e2e/start-smoke-local.ts', "{ mkdirSync, readFileSync, writeFileSync }", "{ existsSync, mkdirSync, readFileSync, writeFileSync }")
edit('tests/e2e/start-smoke-local.ts', "const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });", "const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);\n  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });")
edit('shared/testing/src/operations-fixture.ts', 'async function ensurePackage() {', 'async function ensurePackage(asOf = new Date().toISOString()) {')
edit('shared/testing/src/operations-fixture.ts', "owner.call('/api/v1/admin/regulatory/active-package')", "owner.call('/api/v1/admin/regulatory/active-package?as_of=' + encodeURIComponent(asOf))")
edit('shared/testing/src/operations-fixture.ts', 'new Date(Date.now() - 60_000).toISOString(), requirement_effective_from', 'new Date(Date.parse(asOf) - 60_000).toISOString(), requirement_effective_from')
edit('tests/e2e/operations-screens-local.ts', 'await t.ensurePackage();', 'await t.ensurePackage(hoursFromNow(-3));\n    await t.ensurePackage();')
edit('tests/integration/licensing/quota-race.test.ts', "const previous=(await t.db.query('SELECT claims FROM app.effective_licence($1,$2,$3)',scope)).rows[0].claims;", "const lookup=await t.db.connect();\n let previous;\n try {\n  await lookup.query('BEGIN');\n  await lookup.query(\"SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true)\",[...scope,t.h.users.owner!.id]);\n  previous=(await lookup.query('SELECT claims FROM app.effective_licence($1,$2,$3)',scope)).rows[0].claims;\n  await lookup.query('COMMIT');\n }finally{await lookup.query('ROLLBACK');lookup.release();}")
edit('tests/integration/licensing/tiers.test.ts', "const r = await codes(sibling.call(path, route.request ? example(route.request) : {}, key()));", "const input = route.request ? example(route.request) : {};\n      const activation = route.id === 'toggle_control_test' ? { ...input as object, enabled: true }\n        : route.id === 'change_audit_mandate_state' ? { ...input as object, state: 'ACTIVE' } : input;\n      const r = await codes(sibling.call(path, activation, key()));")
edit('tests/integration/licensing/tiers.test.ts', "const foundation = await walk(['FOUNDATION']);", "for (const [id, windDown] of [['toggle_control_test', {enabled:false}], ['change_audit_mandate_state', {state:'REVOKED'}]] as const) {\n    const route=S.routes.find(r=>r.id===id)!;\n    const response=await codes(sibling.call(route.path.replace(/\\{[^}]+\\}/g,()=>randomUUID()),{...example(route.request!) as object,...windDown},key()));\n    check('protective wind-down reaches scoped resource validation: '+id,response,{status:404,codes:[]});\n  }\n  const foundation = await walk(['FOUNDATION']);")

p=Path('tests/e2e/configuration.spec.ts');s=p.read_text(encoding='utf-8')
for label in ['Create purpose','Create synthetic system','Create notice','Create policy draft']:
    needle="form=page.locator('form').filter({has:page.getByRole('heading',{name:'"+label+"',exact:true})});"
    prefix="await page.getByRole('button',{name:'"+label+"',exact:true}).click();"
    if label=='Create purpose':
        s=s.replace('  let '+needle, '  '+prefix+'let '+needle)
    else:s=s.replace(needle,prefix+needle)
s=s.replace("const mapping=page.locator('form')", "await page.getByRole('button',{name:'Create target mapping',exact:true}).click();const mapping=page.locator('form')")
p.write_text(s,encoding='utf-8')

# Fixture issuance must use the real scoped resolver and hold the same history lock as an import.
p=Path('shared/testing/src/development-licence.ts');s=p.read_text(encoding='utf-8')
start=s.index('    const present =');end=s.index('    const history =',start)
s=s[:start]+"""    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true)",[...scopeArgs,identity.installation_id]);
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('licence-import:' || $1::text || ':' || $2::text || ':' || $3::text,0))",scopeArgs);
      const present = (await client.query(`SELECT lifecycle, claims FROM app.effective_licence($1,$2,$3)`, scopeArgs)).rows[0];
      if (present && present.lifecycle === 'ACTIVE' && RELEASED.every(code => (present.claims.entitlements as string[]).includes(code))) {await client.query('COMMIT');continue;}
"""+s[end:]
s=s.replace('await pool.query(`SELECT max(sequence)', 'await client.query(`SELECT max(sequence)')
s=s.replace("    const client = await pool.connect();\n    try {\n      await client.query('BEGIN');\n      // Same supersession", "      // Same supersession")
p.write_text(s,encoding='utf-8')

# An external hard link is a regular file too; refuse shared inodes as well as symbolic links.
p=Path('services/worker/src/file-inbox.ts');s=p.read_text(encoding='utf-8')
s=s.replace('!info.isFile() || info.isSymbolicLink()', '!info.isFile() || info.isSymbolicLink() || info.nlink !== 1')
s=s.replace('!opened.isFile()||', '!opened.isFile()||opened.nlink!==1||')
s=s.replace('length!==info.size||after.size', 'length!==info.size||after.nlink!==1||leaf.nlink!==1||after.size')
s=s.replace('if(leaf.isSymbolicLink()||!same(info,leaf))continue;', 'if(leaf.isSymbolicLink()||leaf.nlink!==1||!same(info,leaf))continue;')
p.write_text(s,encoding='utf-8')

p=Path('tests/integration/onboarding/file-intake-adversarial.test.ts');s=p.read_text(encoding='utf-8')
s=s.replace('utimes, symlink, rm', 'utimes, symlink, link, rm')
s=s.replace('link, rm', 'link, unlink, rm')
s=s.replace("    await sweepFileInbox(runtime.scoped,runtime.enrollment.identities.map(x=>x.id),root).catch(()=>0);", """    const worker=runtime.enrollment.identities.find(x=>x.scope.environment_id===environment)!;
    const refusal=await sweepFileInbox(runtime.scoped,[worker.id],root).then(()=>null,(error:Error)=>error.message);
    t.check('the incoming junction is refused for the exact reason',refusal,'Linked inbox directory refused');""")
needle="    t.check('unrecognised bytes and linked incoming folders are refused', {unreadableStatus, outsideImports:n}, {unreadableStatus:409, outsideImports:0});"
s=s.replace(needle,needle+"""
    await unlink(join(root,environment,'incoming'));await mkdir(join(root,environment,'incoming'));
    await link(join(outside,name),join(root,environment,'incoming',name));
    const ordinary='ordinary-'+randomUUID()+'.txt';
    await writeFile(join(root,environment,'incoming',ordinary),'Synthetic ordinary inbox file');await utimes(join(root,environment,'incoming',ordinary),old,old);
    const staged=await sweepFileInbox(runtime.scoped,[worker.id],root);
    const imported=(await t.db.query('SELECT original_name FROM app.file_intake_items WHERE original_name=ANY($1)',[[name,ordinary]])).rows.map(x=>x.original_name);
    t.check('hard-linked external bytes are refused while an ordinary inbox file is staged',{staged,imported},{staged:1,imported:[ordinary]});
""")
p.write_text(s,encoding='utf-8')

p=Path('tests/integration/vendor/provisioning.test.ts');s=p.read_text(encoding='utf-8')
s=s.replace("  const A = '/api/v1/vendor/provisioning/accounts';", "  const A = '/api/v1/vendor/provisioning/accounts';\n  check('a UUID client header accepts canonical case variants with the same sealed identity',(await call({...website,id:website.id.toUpperCase()},'GET',A)).status,200);")
needle="  check('the website re-issues a setup code', [reissued.status, reissued.data.setup_code !== member.data.setup_code], [200, true]);"
s=s.replace(needle,needle+"""
  const emptyPath=`${A}/${member.data.account.user_id}/setup-code`;
  const bodyless=await h.handler(new Request(h.config.origin+emptyPath,{method:'POST',headers:signProvisioningRequest(website,'POST',emptyPath,'')}));
  check('a signed POST with no body retains the exact empty-body signature',bodyless.status,200);
""")
p.write_text(s,encoding='utf-8')

Path('tests/unit/round10-compose-isolation.test.ts').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {runtimeConfig} from '../../backend/auth/src/config.ts';
test('runtime helpers accept only the owned project for their named synthetic profile',()=>{
 const root=mkdtempSync(join(tmpdir(),'orvia-round10-config-'));
 const saved={...process.env};
 try {
  for(const profile of ['codex-a00','vendor-a00','rehearsal','ui-b00']) {
   const directory=join(root,'.local','profiles',profile);mkdirSync(directory,{recursive:true});
   writeFileSync(join(directory,'config.json'),JSON.stringify({profile,fixture_id:'bootstrap-probe-v1',installation_id:'11111111-1111-4111-8111-111111111111'}));
   process.env.ORVIA_WORKSPACE_ROOT=root;process.env.ORVIA_PROFILE=profile;delete process.env.ORVIA_TEST_COMPOSE_PROJECT;
   const standard=runtimeConfig().compose_project;
   process.env.ORVIA_TEST_COMPOSE_PROJECT=profile==='rehearsal'?'orvia-round10-rehearsal':'orvia-round10-customer';
   if(profile==='ui-b00')assert.throws(runtimeConfig,/Unapproved/);
   else assert.equal(runtimeConfig().compose_project,process.env.ORVIA_TEST_COMPOSE_PROJECT);
   process.env.ORVIA_TEST_COMPOSE_PROJECT=standard;assert.throws(runtimeConfig,/Unapproved/);
   process.env.ORVIA_TEST_COMPOSE_PROJECT='unrelated';assert.throws(runtimeConfig,/Unapproved/);
  }
 }finally{
  for(const key of ['ORVIA_WORKSPACE_ROOT','ORVIA_PROFILE','ORVIA_TEST_COMPOSE_PROJECT'])if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];
  if(!resolve(root).startsWith(resolve(tmpdir())+requireSeparator()))throw new Error('Unsafe temporary cleanup');
  rmSync(root,{recursive:true,force:true});
 }
});
function requireSeparator(){return process.platform==='win32'?'\\\\':'/';}
""")

p=Path('tests/integration/licensing/import-races.test.ts');s=p.read_text(encoding='utf-8')
s=s.replace('accepted:boolean}', 'accepted:boolean;code:string|null;message:string|null}')
s=s.replace("      const pending=insert(second,", "      let refusal:{code:string|null;message:string|null}={code:null,message:null};\n      const pending=insert(second,")
s=s.replace('.then(()=>true,()=>false)', '.then(()=>true,(e:{code:string;message:string})=>{refusal={code:e.code,message:e.message};return false;})')
s=s.replace('observations.push({name,accepted:await pending});', 'const accepted=await pending;observations.push({name,accepted,...refusal});')
s=s.replace("  assert.deepEqual(observations.map(x=>x.accepted),[false,false,false],'concurrent imports must preserve rollback and trial restrictions');", "  assert.deepEqual(observations.map(x=>[x.accepted,x.code,x.message]),[[false,'23514','stale_sequence'],[false,'23514','stale_sequence'],[false,'23514','trial_already_used']],'concurrent imports must fail specifically on rollback and trial restrictions');")
p.write_text(s,encoding='utf-8')

# Only the staff application needs the seat-management definer. Existing authority checks remain required.
Path('database/customer/migrations/0093_member_seat_reader_acl.sql').write_text("""-- Limit the staff seat reader, independently of the immutable lifecycle migration.
REVOKE ALL ON FUNCTION app.member_seats() FROM PUBLIC;
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT rolname FROM pg_roles WHERE starts_with(rolname,'orvia_') AND rolname<>'orvia_app' AND NOT rolsuper LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION app.member_seats() FROM %I',r.rolname);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.member_seats() TO orvia_app;
""")
edit('database/customer/src/server-only.ts', "  'app.serialize_licence_import()': [],", "  'app.serialize_licence_import()': [],\n  'app.member_seats()': ['orvia_app'],")
edit('tests/security/function-acl.ts', "  'app.serialize_licence_import()': [],", "  'app.serialize_licence_import()': [],\n  'app.member_seats()': ['orvia_app'],")
for path in ['tests/security/function-acl.ts','tests/security/vendor-function-acl.ts']:
 p=Path(path);s=p.read_text(encoding='utf-8')
 if 'vendor-function' in path:
  s=s.replace('try {',"try {\n const roles=(await pool.query(\"SELECT rolname FROM pg_roles WHERE starts_with(rolname,'orvia_') AND NOT rolsuper ORDER BY rolname\")).rows.map(r=>r.rolname as string);\n assert.ok(roles.length>=11,'all installation runtime roles are present');",1)
  s=s.replace("for(const role of ['orvia_vendor_app','orvia_vendor_auth','orvia_app','orvia_worker','orvia_agent_control','orvia_machine_auth','orvia_sender'])",'for(const role of roles)')
  s=s.replace('PUBLIC and seven runtime roles','PUBLIC and every installed ORVIA runtime role')
 else:
  s=s.replace("const roles = ['orvia_app', 'orvia_worker', 'orvia_agent_control', 'orvia_machine_auth', 'orvia_sender'];",'let roles: string[] = [];')
  s=s.replace("    await tx.query('BEGIN READ ONLY');", "    await tx.query('BEGIN READ ONLY');\n    roles=(await tx.query(\"SELECT rolname FROM pg_roles WHERE starts_with(rolname,'orvia_') AND NOT rolsuper ORDER BY rolname\")).rows.map(r=>r.rolname as string);\n    check('all installation runtime roles present',roles.length>=11,true);")
  s=s.replace("      if (!present) continue;", "      if (!present) continue;\n      const metadata=(await tx.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=to_regprocedure($1)',[fn])).rows[0];\n      check(fn+' pins search_path',metadata.proconfig?.some((v:string)=>v.startsWith('search_path=pg_catalog')),true);\n      if(['app.effective_licence(uuid,uuid,uuid)','app.licence_names_entitlement(uuid,text)','app.licence_entitlement_codes(uuid)','app.licence_row_edition(uuid)','app.plan_usage()','app.licence_import_guard()','app.member_seats()'].includes(fn))check(fn+' SECURITY DEFINER',metadata.prosecdef,true);")
 p.write_text(s,encoding='utf-8')

# Reserved 0018 executes after its 0103 dependency on both fresh installs and upgrades.
p=Path('database/vendor/migrations/0103_service_licences.sql');s=p.read_text(encoding='utf-8');start=s.index('CREATE FUNCTION vendor.import_service_licence(');end=s.index('CREATE FUNCTION vendor.service_licence_state()',start)
sql=s[start:end].replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION',1).replace('  SELECT max(sequence) INTO top', '  PERFORM pg_advisory_xact_lock(728140);\n  SELECT max(sequence) INTO top')
Path('database/vendor/migrations/0018_service_licence_import_serialization.sql').write_text('-- Serialize service licence history checks with imports and seat admission.\n'+sql+'REVOKE ALL ON FUNCTION vendor.import_service_licence(uuid,uuid,uuid,jsonb,text,text) FROM PUBLIC;\nGRANT EXECUTE ON FUNCTION vendor.import_service_licence(uuid,uuid,uuid,jsonb,text,text) TO orvia_vendor_app;\n')
edit('database/vendor/src/migrations.ts', "const executionKey = (id: string) => id === fulfilmentId ? legacyFulfilmentId : id;", "const executionKey = (id: string) => id === fulfilmentId ? legacyFulfilmentId\n  : id === '0018_service_licence_import_serialization' ? '0103_service_licences~0018' : id;")
edit('tests/unit/vendor-migration-ledger.test.ts', "  assert.equal(new Set(ids.map", "  assert.equal(ids[ids.indexOf('0018_service_licence_import_serialization')-1],'0103_service_licences');\n  assert.equal(new Set(ids.map")
Path('tests/unit/round10-source-evidence.test.ts').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifiedSourcePaths,qualifiedDirty} from '../../scripts/source-paths.mjs';
test('browser evidence never changes the packaged source inventory, while application edits do',()=>{
 assert.deepEqual(qualifiedSourcePaths('output/playwright/crawl/page.png\\nfrontend/src/app/page.tsx\\nhandoffs/codex/result.json'),['frontend/src/app/page.tsx']);
 assert.equal(qualifiedDirty(' M output/playwright/crawl/page.png'),false);
 assert.equal(qualifiedDirty(' M frontend/src/app/page.tsx'),true);
});
""")

p=Path('tests/e2e/candidate.spec.ts');s=p.read_text(encoding='utf-8')
start=s.index("expect(await page.locator('article').filter")
end=s.index("  await h.screenshot(page,'mobile-capability-register');",start)
s=s[:start]+"""const seen=new Set<string>();
  const register=page.getByRole('main');
  for(let part=0;part<7;part++) {
    await expect(register.getByText('NOT_INSPECTED')).toHaveCount(0);
    const cards=page.locator('article').filter({has:page.getByRole('heading',{name:/^M\\d\\d /})});
    for(const heading of await cards.getByRole('heading').allTextContents()) {
      const id=heading.match(/^M\\d\\d/)?.[0];if(id){expect(seen.has(id)).toBe(false);seen.add(id);}
    }
    for(const id of ['M11','M14']) {
      const card=cards.filter({has:page.getByRole('heading',{name:new RegExp('^'+id+' ')})});
      if(await card.count()) {
        await expect(card.getByText('Built (synthetic subset)',{exact:true})).toBeVisible();
        await expect(card.getByText('Covered at candidate',{exact:true})).toBeVisible();
        await expect(card.locator('code',{hasText:id==='M11'?'test:consent':'test:rights'})).toBeVisible();
      }
    }
    const billing=cards.filter({has:page.getByRole('heading',{name:/^M26 /})});
    if(await billing.count()) {
      await expect(billing.getByText('Not built',{exact:true})).toBeVisible();
      await expect(billing.getByText('Evidence: none recorded in the programme register.')).toBeVisible();
    }
    const next=page.getByRole('button',{name:'Next modules',exact:true});
    if(part<6){await expect(next).toBeEnabled();await next.click();}else await expect(next).toBeDisabled();
  }
  expect([...seen].sort()).toEqual(Array.from({length:33},(_,i)=>'M'+String(i+1).padStart(2,'0')));
"""+s[end:];p.write_text(s,encoding='utf-8')

p=Path('tests/integration/grc/http.test.ts');s=p.read_text(encoding='utf-8').replace("import {readFileSync,writeFileSync}","import {writeFileSync}")
s=s.replace("import {connectDatabase}","import {applyMigrations} from '../../../database/customer/src/migrations.ts';\nimport {ensureDevelopmentLicence} from '../../../shared/testing/src/development-licence.ts';\nimport {connectDatabase}")
start=s.index("  for(const migration of ['0001_auth_scope.sql'")
end=s.index('  // Same prerequisite grants',start)
s=s[:start]+"  const migrator=await db.connect();\n  try{await applyMigrations(migrator,profile);}finally{migrator.release();}\n"+s[end:]
s=s.replace("  phase='real authentication and policy';", "  await ensureDevelopmentLicence(db,Object.values(scopes));\n  phase='real authentication and policy';")
p.write_text(s,encoding='utf-8')

p=Path('tests/integration/licensing/licensing.test.ts');s=p.read_text(encoding='utf-8')
s=s.replace("  const baseClaims =", "  const historyTop=(await db.query('SELECT max(sequence) AS top FROM app.licences WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3',[scenario.scope.tenant_id,scenario.scope.legal_entity_id,scenario.scope.environment_id])).rows[0].top;\n  let sequence=historyTop===null?null:Number(historyTop);\n  const baseClaims =")
s=s.replace("    ...overrides,", "    ...(sequence===null?{}:{sequence:++sequence}),...overrides,")
s=s.replace("  const notYet = await importIt(baseClaims({ valid_from: days(10), valid_to: days(400) }));", "  const legacyFuture:Record<string,unknown>=baseClaims({valid_from:days(10),valid_to:days(400)});delete legacyFuture.sequence;\n  const notYet = await importIt(legacyFuture);")
start=s.index('  const edit = await db.query(');end=s.index('  // --- FR-M28-01',start)
s=s[:start]+"""  const mutation=await db.connect();
  try {
    for(const expression of ["edition='ENTERPRISE'","valid_to=now()+interval '10 years'","term='MONTHLY'","sequence=999999","trial=true","claims='{}'::jsonb","signature='changed'",`signing_key_id='${randomUUID()}'`,`installation_id='${randomUUID()}'`,`licence_id='${randomUUID()}'`,`id='${randomUUID()}'`,"valid_from=now()-interval '10 years'",`imported_by='${randomUUID()}'`,"imported_at=now()-interval '1 year'"]) {
      await mutation.query('BEGIN');
      const error=await mutation.query('UPDATE app.licences SET '+expression+' WHERE licence_id=$1',[claims.licence_id]).then(()=>null,(e:{code:string;message:string})=>({code:e.code,message:e.message}));
      await mutation.query('ROLLBACK');
      check('stored signed terms are immutable: '+expression,error,{code:'23514',message:'A licence cannot be edited after import'});
    }
    await mutation.query('BEGIN');
    const control=await mutation.query('UPDATE app.licences SET active=false WHERE licence_id=$1',[claims.licence_id]);
    check('supersession may deactivate the stored licence',control.rowCount,1);await mutation.query('ROLLBACK');
    await mutation.query('BEGIN');
    const deletion=await mutation.query('DELETE FROM app.licences WHERE licence_id=$1',[claims.licence_id]).then(()=>null,(e:{code:string;message:string})=>({code:e.code,message:e.message}));
    await mutation.query('ROLLBACK');
    check('a licence record is never deleted',deletion,{code:'23514',message:'A licence record is never deleted'});
  }finally{await mutation.query('ROLLBACK');mutation.release();}

"""+s[end:];p.write_text(s,encoding='utf-8')
