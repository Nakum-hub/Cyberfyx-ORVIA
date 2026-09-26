import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * EX01 communication preferences. Staff define topics; a principal records
 * their own choice per topic and channel. Choices are append-only events: one
 * made earlier than the latest already recorded for the same topic and channel
 * is kept but is not effective, so a replayed or delayed event cannot re-enable
 * contact. Whether contact is permitted is decided now, from the latest
 * effective choice, the topic's current state and, where the topic depends on a
 * purpose, whether consent to that purpose is currently granted. There is no
 * default opt-in.
 */
type Row = QueryResultRow;
type Channel = (typeof X.PreferenceChannel.options)[number];
const topicView = (r: Row) => X.PreferenceTopic.parse({ id: r.id, code: r.code, name: r.name, description: r.description, channels: r.channels, purpose_id: r.purpose_id,
  state: r.state, created_by: r.created_by, created_at: iso(r.created_at), retired_at: iso(r.retired_at) });
const eventView = (r: Row) => X.PreferenceEvent.parse({ id: r.id, topic_id: r.topic_id, channel: r.channel, choice: r.choice, source: r.source, observed_at: iso(r.observed_at), recorded_at: iso(r.recorded_at), effective: r.effective });

async function topicRow(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.preference_topics WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'topic_id', 'not_found');
  return r as Row;
}
export async function createTopic(c: Context, input: unknown) {
  const v = X.PreferenceTopicCreate.parse(input);
  if (v.purpose_id && !(await c.tx.query(`SELECT 1 FROM app.purpose_versions WHERE ${predicate} AND id=$4 AND status IN ('PUBLISHED','SUPERSEDED')`, [...scope(c), v.purpose_id])).rowCount) refuse(409, 'purpose_id', 'purpose_not_published');
  if ((await c.tx.query(`SELECT 1 FROM app.preference_topics WHERE ${predicate} AND code=$4`, [...scope(c), v.code])).rowCount) refuse(409, 'code', 'code_in_use');
  const row = (await c.tx.query(`INSERT INTO app.preference_topics(tenant_id,legal_entity_id,environment_id,id,code,name,description,channels,purpose_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [...scope(c), randomUUID(), v.code, v.name, v.description, v.channels, v.purpose_id, c.actor.actor_id])).rows[0];
  await audit(c, 'preference_topic.create', row.id);
  return topicView(row);
}
export async function retireTopic(c: Context, id: string) {
  const t = await topicRow(c, id, true);
  if (t.state === 'RETIRED') refuse(409, 'state', 'already_retired');
  const row = (await c.tx.query(`UPDATE app.preference_topics SET state='RETIRED', retired_at=clock_timestamp(), retired_by=$5 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id])).rows[0];
  await audit(c, 'preference_topic.retire', id);
  return topicView(row);
}
export async function topicList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.preference_topics t WHERE ${predicate} AND ($4::uuid IS NULL OR (t.created_at,t.id) < (SELECT created_at,id FROM app.preference_topics WHERE id=$4)) ORDER BY created_at DESC, id DESC LIMIT $5`,
    [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(topicView), next_cursor: paged.next_cursor };
}

async function consentState(c: Context, principalId: string, purposeId: string | null): Promise<'GRANTED' | 'NOT_GRANTED' | 'NOT_REQUIRED'> {
  if (!purposeId) return 'NOT_REQUIRED';
  const r = (await c.tx.query(`SELECT state FROM app.consent_aggregates WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5`, [...scope(c), principalId, purposeId])).rows[0];
  return r?.state === 'GRANTED' ? 'GRANTED' : 'NOT_GRANTED';
}
async function latestEffective(c: Context, principalId: string, topicId: string, channel: Channel) {
  return (await c.tx.query(`SELECT * FROM app.preference_events WHERE ${predicate} AND principal_id=$4 AND topic_id=$5 AND channel=$6 AND effective ORDER BY observed_at DESC, recorded_at DESC LIMIT 1`,
    [...scope(c), principalId, topicId, channel])).rows[0] as Row | undefined;
}
/** The decision at this moment. The order of checks is the order a refusal is explained in. */
async function decide(c: Context, principalId: string, topic: Row, channel: Channel, consent?: 'GRANTED' | 'NOT_GRANTED' | 'NOT_REQUIRED') {
  const latest = await latestEffective(c, principalId, topic.id, channel);
  const decided_at = new Date().toISOString();
  const event_id = latest?.id ?? null;
  const result = (permitted: boolean, reason: X.PreferenceDecisionReason) => X.PreferenceDecision.parse({ permitted, reason, decided_at, event_id });
  if (topic.state !== 'ACTIVE') return { latest, decision: result(false, 'TOPIC_RETIRED') };
  if (!(topic.channels as string[]).includes(channel)) return { latest, decision: result(false, 'CHANNEL_NOT_OFFERED') };
  if (!latest) return { latest, decision: result(false, 'NO_CHOICE') };
  if (latest.choice === 'OPTED_OUT') return { latest, decision: result(false, 'OPTED_OUT') };
  if ((consent ?? await consentState(c, principalId, topic.purpose_id)) === 'NOT_GRANTED') return { latest, decision: result(false, 'CONSENT_NOT_GRANTED') };
  return { latest, decision: result(true, 'OPTED_IN') };
}

async function centre(c: Context, principalId: string) {
  const topics = (await c.tx.query(`SELECT * FROM app.preference_topics t WHERE ${predicate} AND (state='ACTIVE' OR EXISTS (SELECT 1 FROM app.preference_events e WHERE e.topic_id=t.id AND e.principal_id=$4))
    ORDER BY state, name, id LIMIT 100`, [...scope(c), principalId])).rows;
  const items = [];
  for (const topic of topics) {
    const consent = await consentState(c, principalId, topic.purpose_id);
    const channels = [];
    for (const channel of topic.channels as Channel[]) {
      const { latest, decision } = await decide(c, principalId, topic, channel, consent);
      channels.push({ channel, choice: latest?.choice ?? 'NO_CHOICE', as_of: iso(latest?.observed_at), decision });
    }
    items.push({ topic: topicView(topic), consent, channels });
  }
  const history = (await c.tx.query(`SELECT * FROM app.preference_events WHERE ${predicate} AND principal_id=$4 ORDER BY recorded_at DESC, id DESC LIMIT 50`, [...scope(c), principalId])).rows.map(eventView);
  return X.PreferenceCentre.parse({ principal_id: principalId, topics: items, history });
}
export async function principalCentre(c: Context, principalId: string) {
  if (!(await c.tx.query(`SELECT 1 FROM app.principal_references WHERE ${predicate} AND id=$4`, [...scope(c), principalId])).rowCount) refuse(404, 'id', 'not_found');
  return centre(c, principalId);
}
export async function ownCentre(c: Context) {
  if (!c.actor.principal_id) refuse(404, 'principal', 'not_found');
  return centre(c, c.actor.principal_id!);
}
export async function decision(c: Context, query: unknown) {
  const q = X.PreferenceDecisionQuery.parse(query);
  if (!(await c.tx.query(`SELECT 1 FROM app.principal_references WHERE ${predicate} AND id=$4`, [...scope(c), q.principal_id])).rowCount) refuse(404, 'principal_id', 'not_found');
  return (await decide(c, q.principal_id, await topicRow(c, q.topic_id), q.channel)).decision;
}
export async function recordOwnChoice(c: Context, input: unknown) {
  const v = X.PreferenceChoice.parse(input);
  const principalId = c.actor.principal_id;
  if (!principalId) refuse(404, 'principal', 'not_found');
  const topic = await topicRow(c, v.topic_id);
  if (topic.state !== 'ACTIVE') refuse(409, 'topic_id', 'topic_retired');
  if (!(topic.channels as string[]).includes(v.channel)) refuse(409, 'channel', 'channel_not_offered');
  if (Date.parse(v.observed_at) > Date.now() + 5 * 60_000) refuse(400, 'observed_at', 'in_the_future');
  // Serialise choices for one topic and channel so "latest" is well defined.
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'preference', principalId, v.topic_id, v.channel])]);
  const latest = await latestEffective(c, principalId!, v.topic_id, v.channel);
  const effective = !latest || Date.parse(v.observed_at) > new Date(latest.observed_at).getTime();
  const row = (await c.tx.query(`INSERT INTO app.preference_events(tenant_id,legal_entity_id,environment_id,id,principal_id,topic_id,channel,choice,source,observed_at,recorded_by,effective)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PORTAL',$9,$10,$11) RETURNING *`, [...scope(c), randomUUID(), principalId, v.topic_id, v.channel, v.choice, v.observed_at, c.actor.actor_id, effective])).rows[0];
  await audit(c, effective ? 'preference.record' : 'preference.record_stale', row.id);
  return X.PreferenceChoiceReceipt.parse({ event: eventView(row), decision: (await decide(c, principalId!, topic, v.channel)).decision });
}
