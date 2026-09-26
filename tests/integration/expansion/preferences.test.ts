// EX01 communication preferences through the real HTTP boundary.
// Under test: staff define topics (channels, optional purpose dependency) and
// retire them once; a principal records their own choice per topic and channel
// in the portal; there is no default opt-in; a choice made earlier than the
// latest recorded one is kept but not effective (stale replay cannot re-enable
// contact); the decision is made at the time of use, so withdrawn consent to
// the topic's purpose stops contact whatever the preference says, and a retired
// topic stops it too; another principal and another tenant see nothing; staff
// cannot record through the portal route and principals cannot use staff
// routes; the database refuses rewrites and row security separates principals.
//
// Fixture note: the consent aggregate for the topic's purpose is set directly
// through the migrator connection. The consent grant/withdraw journey itself is
// covered by tests/integration/consent/consent.test.ts; here only its current
// state matters to the preference decision.
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('preferences');
const { h, check, ok, codes, db } = t;
const Topic = S.schemas.PreferenceTopic; const Centre = S.schemas.PreferenceCentre; const Receipt = S.schemas.PreferenceChoiceReceipt; const Decision = S.schemas.PreferenceDecision;
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

await t.run(async () => {
  const admin = await h.login('admin'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const alice = await h.login('alice'); const bob = await h.login('bob');
  const s = t.scope();
  const aliceId = h.users.alice!.principal_id!; const bobId = h.users.bob!.principal_id!;
  const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((x: { code?: string }) => x.code ?? 'rejected');
  const setConsent = (state: 'GRANTED' | 'WITHDRAWN', purpose: string) => db.query(`INSERT INTO app.consent_aggregates(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id,state,epoch)
    VALUES($1,$2,$3,$4,$5,$6,1) ON CONFLICT (tenant_id,legal_entity_id,principal_id,purpose_id) DO UPDATE SET state=EXCLUDED.state, epoch=app.consent_aggregates.epoch+1, updated_at=now()`,
    [s.tenant_id, s.legal_entity_id, s.environment_id, aliceId, purpose, state]);
  const decide = async (topic: string, channel: string, principal = aliceId) => ok(admin.call(`/api/v1/admin/preference-decisions?principal_id=${principal}&topic_id=${topic}&channel=${channel}`), Decision);
  const choose = (who: typeof alice, topic_id: string, channel: string, choice: 'OPTED_IN' | 'OPTED_OUT', observed_at = new Date().toISOString()) =>
    who.call('/api/v1/portal/me/preferences', { topic_id, channel, choice, observed_at }, key());

  t.setPhase('topics');
  const purpose = (await db.query(`SELECT id FROM app.purpose_versions WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND status='PUBLISHED' ORDER BY id LIMIT 1`, [s.tenant_id, s.legal_entity_id, s.environment_id])).rows[0]?.id as string;
  check('the fixture scope has a published purpose to depend on', typeof purpose, 'string');
  const newsInput = { code: unique('news').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40), name: 'Product news', description: 'Occasional news about the products you use.', channels: ['EMAIL', 'SMS'], purpose_id: null };
  check('a principal cannot define topics', (await alice.call('/api/v1/admin/preference-topics', newsInput, key())).status, 403);
  check('an auditor cannot define topics', (await auditor.call('/api/v1/admin/preference-topics', newsInput, key())).status, 403);
  const news = await ok(admin.call('/api/v1/admin/preference-topics', newsInput, key()), Topic);
  check('a topic is created active with its channels', [news.state, news.channels], ['ACTIVE', ['EMAIL', 'SMS']]);
  check('a topic code is unique in scope', await codes(admin.call('/api/v1/admin/preference-topics', newsInput, key())), { status: 409, codes: ['code_in_use'] });
  check('duplicate channels are refused', (await admin.call('/api/v1/admin/preference-topics', { ...newsInput, code: `${newsInput.code.slice(0, 30)}_dup`, channels: ['EMAIL', 'EMAIL'] }, key())).status, 400);
  const offersInput = { ...newsInput, code: `${newsInput.code.slice(0, 30)}_offers`, name: 'Offers', description: 'Offers that depend on marketing consent.', channels: ['EMAIL'], purpose_id: purpose };
  const offers = await ok(admin.call('/api/v1/admin/preference-topics', offersInput, key()), Topic);
  check('a topic can depend on a published purpose', offers.purpose_id, purpose);

  t.setPhase('choices');
  check('no choice means no contact (there is no default opt-in)', [(await decide(news.id, 'EMAIL')).permitted, (await decide(news.id, 'EMAIL')).reason], [false, 'NO_CHOICE']);
  let receipt = await ok(choose(alice, news.id, 'EMAIL', 'OPTED_IN', ago(10)), Receipt, [201]);
  check('an opt-in is effective and permits contact on that channel', [receipt.event.effective, receipt.decision.permitted, receipt.decision.reason], [true, true, 'OPTED_IN']);
  check('the other channel is still not permitted', (await decide(news.id, 'SMS')).reason, 'NO_CHOICE');
  check('a channel the topic does not offer is refused', await codes(choose(alice, news.id, 'POST', 'OPTED_IN')), { status: 409, codes: ['channel_not_offered'] });
  check('a choice dated in the future is refused', await codes(choose(alice, news.id, 'EMAIL', 'OPTED_IN', new Date(Date.now() + 3_600_000).toISOString())), { status: 400, codes: ['in_the_future'] });
  receipt = await ok(choose(alice, news.id, 'EMAIL', 'OPTED_OUT', ago(5)), Receipt, [201]);
  check('a later opt-out stops contact', [receipt.event.effective, receipt.decision.permitted, receipt.decision.reason], [true, false, 'OPTED_OUT']);
  receipt = await ok(choose(alice, news.id, 'EMAIL', 'OPTED_IN', ago(8)), Receipt, [201]);
  check('a replayed older opt-in is kept but not effective and does not re-enable contact', [receipt.event.effective, receipt.decision.permitted, receipt.decision.reason], [false, false, 'OPTED_OUT']);
  let centre = await ok(alice.call('/api/v1/portal/me/preferences'), Centre);
  const newsState = centre.topics.find(x => x.topic.id === news.id)!;
  check('the portal centre shows the current choice and keeps the stale event in history', [newsState.channels.find(c => c.channel === 'EMAIL')?.choice, centre.history.filter(e => e.topic_id === news.id).map(e => e.effective)], ['OPTED_OUT', [false, true, true]]);

  t.setPhase('consent dependency');
  await setConsent('GRANTED', purpose);
  await ok(choose(alice, offers.id, 'EMAIL', 'OPTED_IN'), Receipt, [201]);
  check('an opt-in to a purpose-dependent topic permits contact while consent is granted', [(await decide(offers.id, 'EMAIL')).permitted], [true]);
  await setConsent('WITHDRAWN', purpose);
  const afterWithdrawal = await decide(offers.id, 'EMAIL');
  check('withdrawn consent stops contact whatever the preference says', [afterWithdrawal.permitted, afterWithdrawal.reason], [false, 'CONSENT_NOT_GRANTED']);
  centre = await ok(admin.call(`/api/v1/admin/preference-centres/${aliceId}`), Centre);
  check('staff see the same decision in the principal\'s centre', [centre.topics.find(x => x.topic.id === offers.id)?.consent, centre.topics.find(x => x.topic.id === offers.id)?.channels[0]?.decision.reason], ['NOT_GRANTED', 'CONSENT_NOT_GRANTED']);
  await setConsent('GRANTED', purpose);
  check('granting consent again restores the effective opt-in', (await decide(offers.id, 'EMAIL')).permitted, true);

  t.setPhase('retirement');
  check('a principal cannot retire a topic', (await alice.call(`/api/v1/admin/preference-topics/${offers.id}/retire`, {}, key())).status, 403);
  const retired = await ok(admin.call(`/api/v1/admin/preference-topics/${offers.id}/retire`, {}, key()), Topic, [200]);
  check('a retired topic stops contact', [retired.state, (await decide(offers.id, 'EMAIL')).reason], ['RETIRED', 'TOPIC_RETIRED']);
  check('a topic is retired once', await codes(admin.call(`/api/v1/admin/preference-topics/${offers.id}/retire`, {}, key())), { status: 409, codes: ['already_retired'] });
  check('no new choice is taken on a retired topic', await codes(choose(alice, offers.id, 'EMAIL', 'OPTED_IN')), { status: 409, codes: ['topic_retired'] });
  centre = await ok(alice.call('/api/v1/portal/me/preferences'), Centre);
  check('a retired topic with history is still shown to the principal', centre.topics.find(x => x.topic.id === offers.id)?.topic.state, 'RETIRED');

  t.setPhase('isolation');
  const bobCentre = await ok(bob.call('/api/v1/portal/me/preferences'), Centre);
  check('another principal sees only their own choices', [bobCentre.principal_id, bobCentre.history.some(e => e.topic_id === news.id)], [bobId, false]);
  check('another principal starts with no choice', (await decide(news.id, 'EMAIL', bobId)).reason, 'NO_CHOICE');
  check('staff cannot record through the portal route', (await choose(admin, news.id, 'EMAIL', 'OPTED_IN')).status, 403);
  check('a principal cannot read staff decision routes', (await alice.call(`/api/v1/admin/preference-decisions?principal_id=${aliceId}&topic_id=${news.id}&channel=EMAIL`)).status, 403);
  check('another tenant cannot read the principal\'s centre', (await birch.call(`/api/v1/admin/preference-centres/${aliceId}`)).status, 404);
  check('another tenant does not see the topic', (await birch.call(`/api/v1/admin/preference-decisions?principal_id=${aliceId}&topic_id=${news.id}&channel=EMAIL`)).status, 404);
  const topics = await ok(auditor.call('/api/v1/admin/preference-topics?limit=100'), S.schemas.PreferenceTopicList);
  check('an auditor can read topics', topics.items.some(x => x.id === news.id), true);

  t.setPhase('database');
  check('preference events cannot be rewritten', await direct(`UPDATE app.preference_events SET choice='OPTED_IN' WHERE topic_id=$1`, [news.id]), '23514');
  check('preference events cannot be deleted', await direct(`DELETE FROM app.preference_events WHERE topic_id=$1`, [news.id]), '23514');
  check('a topic cannot be edited', await direct(`UPDATE app.preference_topics SET channels=ARRAY['EMAIL','SMS','POST'] WHERE id=$1`, [news.id]), '23514');
  check('a retired topic cannot be revived', await direct(`UPDATE app.preference_topics SET state='ACTIVE', retired_at=NULL, retired_by=NULL WHERE id=$1`, [offers.id]), '23514');
  check('an unknown channel is refused by the table', await direct(`INSERT INTO app.preference_events(tenant_id,legal_entity_id,environment_id,id,principal_id,topic_id,channel,choice,source,observed_at,recorded_by,effective) VALUES($1,$2,$3,gen_random_uuid(),$4,$5,'FAX','OPTED_IN','PORTAL',now(),$4,true)`, [s.tenant_id, s.legal_entity_id, s.environment_id, aliceId, news.id]), '23514');
  const asPrincipal = async (principalId: string, sql: string, values: unknown[]) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN'); await client.query('SET LOCAL ROLE orvia_app');
      await client.query(`SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true),set_config('orvia.actor_domain','PRINCIPAL',true),set_config('orvia.principal_id',$4,true),set_config('orvia.capabilities','consent.own.read,consent.own.write',true)`,
        [s.tenant_id, s.legal_entity_id, s.environment_id, principalId]);
      return (await client.query(sql, values)).rows;
    } catch (error) { return [{ error: (error as { code?: string }).code }]; } finally { await client.query('ROLLBACK').catch(() => {}); client.release(); }
  };
  check('row security hides one principal\'s events from another', (await asPrincipal(bobId, 'SELECT id FROM app.preference_events WHERE principal_id=$1', [aliceId])).length, 0);
  check('a principal sees their own events', (await asPrincipal(aliceId, 'SELECT id FROM app.preference_events WHERE principal_id=$1 AND topic_id=$2', [aliceId, news.id])).length, 3);
  check('a principal cannot insert a choice for someone else', (await asPrincipal(bobId, `INSERT INTO app.preference_events(tenant_id,legal_entity_id,environment_id,id,principal_id,topic_id,channel,choice,source,observed_at,recorded_by,effective) VALUES($1,$2,$3,gen_random_uuid(),$4,$5,'EMAIL','OPTED_IN','PORTAL',now(),$6,true)`, [s.tenant_id, s.legal_entity_id, s.environment_id, aliceId, news.id, bobId]))[0]?.error, '42501');
});
