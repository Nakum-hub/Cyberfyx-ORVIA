import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, utimes, symlink, link, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepFileInbox } from '../../../services/worker/src/file-inbox.ts';

const t = operationsSuite('round-ten-file-intake-adversarial');
await t.run(async () => {
  const admin = await t.h.login('admin');
  const marker = `MZ Round10 synthetic unreadable ${randomUUID()}`;
  const item = await t.ok(admin.call('/api/v1/admin/file-intake', {file_name:'payload.exe',content_base64:Buffer.from(marker).toString('base64')}, key()), S.schemas.FileIntakeItem, [201]);
  const unreadableStatus = (await admin.call(`/api/v1/admin/file-intake/${item.id}/content`)).status;
  const root = await mkdtemp(join(tmpdir(), 'orvia-round10-inbox-'));
  const outside = await mkdtemp(join(tmpdir(), 'orvia-round10-outside-'));
  const runtime = workflowActivities();
  try {
    const environment = t.h.users.owner!.scope.environment_id;
    await mkdir(join(root, environment), {recursive:true});
    await symlink(outside, join(root, environment, 'incoming'), process.platform==='win32'?'junction':'dir');
    const name=`outside-${randomUUID()}.txt`;
    await writeFile(join(outside,name),'Synthetic file outside the inbox');
    const old=new Date(Date.now()-60000);await utimes(join(outside,name),old,old);
    const worker=runtime.enrollment.identities.find(x=>x.scope.environment_id===environment)!;
    const refusal=await sweepFileInbox(runtime.scoped,[worker.id],root).then(()=>null,(error:Error)=>error.message);
    t.check('the incoming junction is refused for the exact reason',refusal,'Linked inbox directory refused');
    const n=(await t.db.query('SELECT count(*)::int n FROM app.file_intake_items WHERE original_name=$1',[name])).rows[0].n;
    t.check('unrecognised bytes and linked incoming folders are refused', {unreadableStatus, outsideImports:n}, {unreadableStatus:409, outsideImports:0});
    await unlink(join(root,environment,'incoming'));await mkdir(join(root,environment,'incoming'));
    await link(join(outside,name),join(root,environment,'incoming',name));
    const ordinary='ordinary-'+randomUUID()+'.txt';
    await writeFile(join(root,environment,'incoming',ordinary),'Synthetic ordinary inbox file');await utimes(join(root,environment,'incoming',ordinary),old,old);
    const staged=await sweepFileInbox(runtime.scoped,[worker.id],root);
    const imported=(await t.db.query('SELECT original_name FROM app.file_intake_items WHERE original_name=ANY($1)',[[name,ordinary]])).rows.map(x=>x.original_name);
    t.check('hard-linked external bytes are refused while an ordinary inbox file is staged',{staged,imported},{staged:1,imported:[ordinary]});

  } finally {
    await runtime.close();
    await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});
  }
});
