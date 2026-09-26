'use client';
import { useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, EmptyState, FailureState, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Input, WriteForm, text } from '../privacy-operations/registry-forms.tsx';

type Centre = ReturnType<typeof schemas.PreferenceCentre.parse>;
const CHANNELS = ['EMAIL', 'SMS', 'PHONE', 'POST', 'PUSH'] as const;
const CHANNEL_LABEL: Record<string, string> = { EMAIL: 'Email', SMS: 'Text message', PHONE: 'Phone call', POST: 'Post', PUSH: 'App notification' };
const REASON: Record<string, string> = {
  OPTED_IN: 'You will be contacted', NO_CHOICE: 'Not contacted (no choice made)', OPTED_OUT: 'Not contacted (you said no)',
  CONSENT_NOT_GRANTED: 'Not contacted (the consent it depends on is not given)', TOPIC_RETIRED: 'Not contacted (topic retired)', CHANNEL_NOT_OFFERED: 'Not offered',
};

/** The principal's own preference centre, shown in the portal. */
export function PortalPreferences() {
  const centre = useQuery('own_preferences');
  const save = useMutation('set_own_preference', true);
  const choose = async (topic_id: string, channel: (typeof CHANNELS)[number], choice: 'OPTED_IN' | 'OPTED_OUT') => {
    save.newInteraction();
    if (await save.run({ topic_id, channel, choice, observed_at: new Date().toISOString() })) centre.refresh();
  };
  return (
    <>
      <PageHead eyebrow="Privacy centre" title="Contact preferences"
        lede="Choose what you are contacted about and how. Nothing is sent unless you say yes, and saying no takes effect straight away. Where a topic depends on a consent you have given, withdrawing that consent also stops the contact." />
      {save.failure && <FailureState failure={save.failure} />}
      <QueryBoundary query={centre} label="your preferences" isEmpty={d => !d.topics.length}>
        {d => <CentreView centre={d} onChoose={choose} busy={save.status === 'pending'} />}
      </QueryBoundary>
    </>
  );
}

function CentreView({ centre, onChoose, busy }: { centre: Centre; onChoose?: (topic: string, channel: (typeof CHANNELS)[number], choice: 'OPTED_IN' | 'OPTED_OUT') => void; busy?: boolean }) {
  return (
    <>
      {centre.topics.map(({ topic, consent, channels }) => (
        <Section key={topic.id} title={topic.name}>
          <p>{topic.description}</p>
          {topic.state === 'RETIRED' && <NoticeBox tone="info" title="This topic has been retired"><p>Nothing is sent about it any more. Your earlier choices are kept below.</p></NoticeBox>}
          {consent === 'NOT_GRANTED' && <NoticeBox tone="warn" title="Depends on a consent you have not given"><p>You will not be contacted about this unless that consent is given, whatever you choose here.</p></NoticeBox>}
          <DataTable caption={`Channels for ${topic.name}`} rows={channels} rowKey={c => c.channel}
            columns={[
              { key: 'c', header: 'Channel', cell: c => CHANNEL_LABEL[c.channel] ?? c.channel },
              { key: 's', header: 'Now', cell: c => <Badge label={REASON[c.decision.reason] ?? c.decision.reason} tone={c.decision.permitted ? 'ok' : 'neutral'} /> },
              { key: 'a', header: 'Since', cell: c => c.as_of ? formatTime(c.as_of) : '—' },
              ...(onChoose && topic.state === 'ACTIVE' ? [{ key: 'x', header: 'Change', cell: (c: (typeof channels)[number]) => (
                <span>
                  <button type="button" disabled={busy || c.choice === 'OPTED_IN'} onClick={() => onChoose(topic.id, c.channel, 'OPTED_IN')} aria-label={`Yes to ${topic.name} by ${CHANNEL_LABEL[c.channel]}`}>Yes</button>{' '}
                  <button type="button" disabled={busy || c.choice === 'OPTED_OUT'} onClick={() => onChoose(topic.id, c.channel, 'OPTED_OUT')} aria-label={`No to ${topic.name} by ${CHANNEL_LABEL[c.channel]}`}>No</button>
                </span>
              ) }] : []),
            ]} />
        </Section>
      ))}
      {centre.history.length > 0 && (
        <Section title="History">
          <DataTable caption="Recorded choices" rows={centre.history} rowKey={e => e.id}
            columns={[
              { key: 't', header: 'Recorded', cell: e => formatTime(e.recorded_at) },
              { key: 'topic', header: 'Topic', cell: e => centre.topics.find(x => x.topic.id === e.topic_id)?.topic.name ?? shortId(e.topic_id) },
              { key: 'c', header: 'Channel', cell: e => CHANNEL_LABEL[e.channel] ?? e.channel },
              { key: 'v', header: 'Choice', cell: e => e.choice === 'OPTED_IN' ? 'Yes' : 'No' },
              { key: 'e', header: 'Effect', cell: e => e.effective ? 'Applied' : 'Kept, not applied (a later choice already existed)' },
            ]} />
        </Section>
      )}
    </>
  );
}

/**
 * Staff view: define and retire topics, and look up one principal's current
 * preferences and decisions. Staff do not change a principal's choices here.
 */
export function PreferenceAdmin() {
  const topics = usePagedQuery('list_preference_topics', { limit: 25 });
  const [principal, setPrincipal] = useState('');
  const [lookup, setLookup] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Consent" title="Contact preferences"
        lede="Topics people can choose to be contacted about, on which channels, and which consented purpose each depends on. People record their own choices in the privacy centre; contact is permitted only for an effective yes, on an active topic, with any required consent currently given." />
      <Section title="Topics">
        <QueryBoundary query={topics} label="topics" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Preference topics" rows={d.items} rowKey={x => x.id}
                columns={[
                  { key: 'n', header: 'Topic', cell: x => <span className="cell-primary">{x.name}<span className="cell-sub">{x.code} · {x.channels.map(c => CHANNEL_LABEL[c]).join(', ')}{x.purpose_id ? ` · depends on purpose ${shortId(x.purpose_id)}` : ''}</span></span> },
                  { key: 's', header: 'State', cell: x => <Badge label={x.state.toLowerCase()} tone={x.state === 'ACTIVE' ? 'ok' : 'neutral'} /> },
                  { key: 'a', header: '', cell: x => x.state === 'ACTIVE' ? <ActionButton operation="retire_preference_topic" label="Retire" input={undefined as never} params={{ id: x.id }} onDone={() => topics.refresh()} /> : null },
                ]} />
              <Pagination query={topics} />
            </>
          )}
        </QueryBoundary>
        <WriteForm operation="create_preference_topic" label="Add a topic" onSaved={() => topics.refresh()} describe={x => `${x.name} added`}
          build={f => ({ code: text(f, 'code'), name: text(f, 'name'), description: text(f, 'description'), channels: CHANNELS.filter(c => f.get(`channel_${c}`) === 'on'), purpose_id: text(f, 'purpose_id') || null })}>
          <Input label="Code" name="code" minLength={3} maxLength={41} hint="Lower case letters, digits and underscores, such as product_news." />
          <Input label="Name" name="name" minLength={3} maxLength={120} />
          <Input label="Description shown to people" name="description" minLength={10} maxLength={500} />
          <fieldset><legend>Channels offered</legend>
            {CHANNELS.map(c => <label key={c} style={{ display: 'block' }}><input type="checkbox" name={`channel_${c}`} /> {CHANNEL_LABEL[c]}</label>)}
          </fieldset>
          <Input label="Depends on purpose (optional)" name="purpose_id" required={false} maxLength={36} hint="The id of a published purpose. Leave empty if no consent is needed." />
        </WriteForm>
      </Section>
      <Section title="Look up a person">
        <form onSubmit={e => { e.preventDefault(); setLookup(principal.trim() || null); }}>
          <label>Principal id <input value={principal} onChange={e => setPrincipal(e.target.value)} maxLength={36} /></label>{' '}
          <button type="submit">Show preferences</button>
        </form>
        {lookup && <PrincipalPreferences key={lookup} id={lookup} />}
      </Section>
    </>
  );
}

function PrincipalPreferences({ id }: { id: string }) {
  const centre = useQuery('principal_preferences', { params: { id } });
  return (
    <QueryBoundary query={centre} label="preferences" isEmpty={d => !d.topics.length}>
      {d => d.topics.length ? <CentreView centre={d} /> : <EmptyState title="No topics yet"><p>Add a topic first.</p></EmptyState>}
    </QueryBoundary>
  );
}
