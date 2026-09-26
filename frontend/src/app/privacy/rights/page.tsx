'use client';
import { useState } from 'react';
import { useMutation, usePagedQuery } from '../../../components/shared/api.ts';
import { DomainGuard } from '../../../components/shared/session-context.tsx';
import { formatTime } from '../../../components/shared/state-labels.ts';
import {
  Badge, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section,
} from '../../../components/shared/ui.tsx';
import { OwnRequestHistory } from '../../../components/screens/privacy-operations/privacy-centre.tsx';
import { CollectOwnCopy } from '../../../components/screens/expansion/response-packages.tsx';

/**
 * The data principal's own rights, exercised by them.
 *
 * The Act gives these rights to the person, and expects the organisation to
 * provide a readily available means of using them. Before this page a request
 * could be recorded *about* somebody but never *by* them, which made the
 * organisation the gatekeeper of a right it does not own.
 *
 * Written for somebody who is not a privacy professional. The five rights are
 * described in what they get you rather than by their statutory names, the
 * state of a request is explained rather than shown as an enum, and the page
 * says plainly that a state is not a promise about the outcome — because a
 * status that looks like progress is the easiest way to mislead somebody
 * waiting on an answer about their own data.
 */

/** What each right actually gets the person, in their words rather than the Act's. */
const RIGHTS: { value: string; label: string; help: string }[] = [
  { value: 'ACCESS', label: 'Tell me what you hold about me',
    help: 'A summary of the personal data this organisation processes about you, and why.' },
  { value: 'CORRECTION', label: 'Correct something that is wrong',
    help: 'Ask for personal data about you that is inaccurate, incomplete or out of date to be put right.' },
  { value: 'ERASURE', label: 'Erase my data',
    help: 'Ask for personal data about you to be erased. The organisation may still have to keep some of it, and should tell you if so.' },
  { value: 'GRIEVANCE', label: 'Raise a complaint',
    help: 'Raise a grievance about how this organisation has handled your personal data or an earlier request.' },
  { value: 'NOMINATION', label: 'Nominate somebody to act for me',
    help: 'Nominate another person to exercise these rights on your behalf if you die or cannot act for yourself.' },
];

/** The state as something a person can act on, not an enum. */
const STATES: Record<string, { label: string; tone: 'ok' | 'info' | 'warn' | 'stop' | 'neutral'; meaning: string }> = {
  RECEIVED: { label: 'Received', tone: 'info', meaning: 'The organisation has your request. Nobody has started work on it yet.' },
  PENDING_VERIFICATION: { label: 'Checking it is you', tone: 'info', meaning: 'The organisation is confirming the request came from you.' },
  VERIFIED: { label: 'Confirmed as yours', tone: 'info', meaning: 'The organisation is satisfied the request came from you.' },
  SCOPING: { label: 'Working out what it covers', tone: 'info', meaning: 'The organisation is establishing which systems and records your request reaches.' },
  AWAITING_APPROVAL: { label: 'Waiting for approval', tone: 'warn', meaning: 'Somebody inside the organisation has to approve the planned response before it happens.' },
  EXECUTING: { label: 'Being carried out', tone: 'info', meaning: 'The organisation is carrying out your request across its systems.' },
  PARTIALLY_COMPLETED: { label: 'Partly done', tone: 'warn', meaning: 'Some of your request was carried out and some was not. The organisation should tell you which.' },
  COMPLETED: { label: 'Carried out', tone: 'ok', meaning: 'The organisation records your request as carried out.' },
  FAILED: { label: 'Could not be carried out', tone: 'stop', meaning: 'The organisation was unable to carry out your request. It should tell you why.' },
  ESCALATED: { label: 'Escalated', tone: 'warn', meaning: 'Your request has been escalated inside the organisation.' },
  REJECTED: { label: 'Refused', tone: 'stop', meaning: 'The organisation has refused this request. It should tell you the reason.' },
  CLOSED: { label: 'Closed', tone: 'neutral', meaning: 'The organisation has closed this request. Closed does not by itself mean it was granted.' },
};

export default function MyRightsPage() {
  return (
    <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">
      {() => <MyRights />}
    </DomainGuard>
  );
}

function MyRights() {
  const requests = usePagedQuery('own_rights_requests', { limit: 25 });
  const raise = useMutation('raise_own_rights_request', true);
  const [rightType, setRightType] = useState('ACCESS');
  const [description, setDescription] = useState('');
  const chosen = RIGHTS.find(r => r.value === rightType);

  return (
    <>
      <PageHead
        eyebrow="Your privacy"
        title="Your rights"
        lede="These rights are yours. Ask for something here and the organisation receives it directly, with a record that it came from you."
      />

      <Section title="Make a request">
        <form
          className="inline-form"
          onSubmit={async event => {
            event.preventDefault();
            if (await raise.run({ right_type: rightType as 'ACCESS', description })) {
              setDescription('');
              requests.refresh();
            }
          }}
        >
          <label>
            <span>What would you like to ask for?</span>
            <select value={rightType} onChange={event => setRightType(event.target.value)}>
              {RIGHTS.map(right => <option key={right.value} value={right.value}>{right.label}</option>)}
            </select>
          </label>
          {chosen && <p className="cell-sub">{chosen.help}</p>}
          <label>
            <span>Tell them what you need, in your own words</span>
            <textarea value={description} onChange={event => setDescription(event.target.value)}
              required minLength={10} maxLength={2000} rows={4}
              placeholder="The more specific you are, the more likely the organisation can answer without coming back to you." />
          </label>
          <button type="submit" disabled={raise.status === 'pending' || description.trim().length < 10}>
            Send this request
          </button>
          {raise.failure && <FailureState failure={raise.failure} />}
        </form>
        <NoticeBox tone="info" title="What happens next">
          <p>
            The organisation receives your request with a record that you made it yourself. You will see its
            state on this page. A state tells you where the request has got to inside the organisation —
            it is not a promise about what the answer will be.
          </p>
        </NoticeBox>
      </Section>

      <Section title="Requests you have made">
        <Freshness query={requests} />
        <QueryBoundary query={requests} label="your requests" isEmpty={data => !data.items.length}>
          {data => (
            <>
              {data.items.map(item => {
                const state = STATES[item.state] ?? { label: item.state, tone: 'neutral' as const, meaning: 'The organisation records this state for your request.' };
                const right = RIGHTS.find(r => r.value === item.right_type);
                return (
                  <article key={item.id} className="panel">
                    <h3>{right?.label ?? item.right_type}</h3>
                    <p className="cell-sub">
                      Sent {formatTime(item.submitted_at)}
                      {item.closed_at && <> · closed {formatTime(item.closed_at)}</>}
                    </p>
                    <p><Badge label={state.label} tone={state.tone} meaning={state.meaning} /></p>
                    <p>{item.description}</p>
                    <p className="cell-sub">
                      {item.response_released
                        ? 'The organisation has released its response to you.'
                        : 'No response has been released to you yet.'}
                    </p>
                    {item.response_released && ['ACCESS', 'CORRECTION'].includes(item.right_type) && <CollectOwnCopy requestId={item.id} />}
                    <details className="reveal">
                      <summary>Status history</summary>
                      <OwnRequestHistory id={item.id} labels={STATES} />
                    </details>
                    <details className="reveal">
                      <summary>What this page can and cannot tell you</summary>
                      <ul>{item.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
                    </details>
                  </article>
                );
              })}
              <Pagination query={requests} />
            </>
          )}
        </QueryBoundary>
      </Section>
    </>
  );
}
