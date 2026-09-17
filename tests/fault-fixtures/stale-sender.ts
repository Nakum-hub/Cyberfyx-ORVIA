// Imported only by the protected synthetic regression runner. This deliberately
// buggy sender uses a queued preview after withdrawal. Assertions inspect its
// actual output; this function cannot select PASS/FAIL or send a real message.
import type pg from 'pg';
export async function stalePreviewSender(db:pg.Pool,queued:{run:string;attempt:string;resource:string;epoch:number;decision:string}){
 if(queued.decision==='ALLOW')await db.query('INSERT INTO app.test_fixture_sends(run_id,attempt_id,resource_id,queued_epoch) VALUES($1,$2,$3,$4)',[queued.run,queued.attempt,queued.resource,queued.epoch]);
}
