import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, utimes, symlink, rm } from 'node:fs/promises';
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
    await sweepFileInbox(runtime.scoped,runtime.enrollment.identities.map(x=>x.id),root).catch(()=>0);
    const n=(await t.db.query('SELECT count(*)::int n FROM app.file_intake_items WHERE original_name=$1',[name])).rows[0].n;
    t.check('unrecognised bytes and linked incoming folders are refused', {unreadableStatus, outsideImports:n}, {unreadableStatus:409, outsideImports:0});
  } finally {
    await runtime.close();
    await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});
  }
});
