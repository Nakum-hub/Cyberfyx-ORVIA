'use client';
import { useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { useQuery } from '../../shared/api.ts';
import { formatTime } from '../../shared/state-labels.ts';
import { Badge, DataTable, NoticeBox, PageHead, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Choice, Input, WriteForm, text } from '../privacy-operations/registry-forms.tsx';

type Created = ReturnType<typeof schemas.StaffMemberCreated.parse>;
const ROLE_LABEL: Record<string, string> = { ORG_SUPER_ADMIN: 'Owner', ORG_ADMIN: 'Administrator', MEMBER: 'Member', AUDITOR: 'Auditor' };
const LICENCE_STATE: Record<string, string> = {
  NO_LICENCE: 'No licence has been imported, so no member logins can be created.',
  EXPIRED: 'The licence has expired, so no member logins can be created or reactivated. Existing logins keep working.',
  NO_MEMBER_SEATS: 'The imported licence does not state member seats, so no member logins can be created. Import the licence issued with your subscription.',
};

/**
 * The organisation's logins. Owner and administrator are set up at installation
 * and are not counted; members and auditors are created here, up to the member
 * seats of the licence issued with the subscription.
 */
export function Team() {
  const team = useQuery('staff_team');
  const [created, setCreated] = useState<Created | null>(null);
  return (
    <>
      <PageHead eyebrow="Installation" title="Team"
        lede="Who can sign in to this ORVIA installation. The owner and administrator are set up at installation and are not counted. Members and auditors are added here, up to the member seats in your licence." />
      <QueryBoundary query={team} label="team" isEmpty={() => false}>
        {d => (
          <>
            <Section title="Member seats">
              {d.seats.licence_state === 'ACTIVE'
                ? <p><strong>{d.seats.used} of {d.seats.licensed}</strong> member seats in use; {d.seats.available} available.</p>
                : <NoticeBox tone="warn" title="Members cannot be added"><p>{LICENCE_STATE[d.seats.licence_state]}</p></NoticeBox>}
              {d.seats.licence_state === 'ACTIVE' && d.seats.available === 0 && <NoticeBox tone="info" title="All member seats are in use"><p>Deactivate a member to free a seat, or move to a subscription with more seats and import its licence.</p></NoticeBox>}
              <ul className="cell-sub">{d.limits.map(l => <li key={l}>{l}</li>)}</ul>
            </Section>
            <Section title="Logins">
              <DataTable caption="Organisation logins" rows={d.members} rowKey={m => m.id}
                columns={[
                  { key: 'n', header: 'Name', cell: m => <span className="cell-primary">{m.display_name}<span className="cell-sub">{m.email}</span></span> },
                  { key: 'r', header: 'Role', cell: m => ROLE_LABEL[m.role] ?? m.role },
                  { key: 's', header: 'State', cell: m => <Badge label={!m.active ? 'deactivated' : m.must_change_password ? 'waiting for first sign-in' : !m.authenticator_enrolled ? 'authenticator not set up' : 'active'} tone={!m.active ? 'neutral' : m.must_change_password || !m.authenticator_enrolled ? 'warn' : 'ok'} /> },
                  { key: 'c', header: 'Seat', cell: m => m.counts_against_seats ? (m.active ? 'Uses a seat' : 'Frees a seat') : 'Not counted' },
                  { key: 'a', header: 'Added', cell: m => formatTime(m.created_at) },
                  { key: 'x', header: '', cell: m => !m.counts_against_seats ? null : m.active
                    ? <ActionButton operation="deactivate_staff_member" label="Deactivate" input={undefined as never} params={{ id: m.id }} onDone={() => team.refresh()} />
                    : <ActionButton operation="reactivate_staff_member" label="Reactivate" input={undefined as never} params={{ id: m.id }} onDone={() => team.refresh()} /> },
                ]} />
            </Section>
            <Section title="Add a member">
              {created && (
                <NoticeBox tone="ok" title={`${created.member.display_name} added`}>
                  <p>Give them this one-time password privately. It is shown only now; they must replace it at first sign-in and then set up an authenticator.</p>
                  <p><code aria-label="One-time password">{created.one_time_password}</code></p>
                  <button type="button" onClick={() => setCreated(null)}>I have handed it over</button>
                </NoticeBox>
              )}
              {d.seats.licence_state === 'ACTIVE' && d.seats.available > 0 && (
                <WriteForm operation="create_staff_member" label="Add member" onSaved={r => { setCreated(r); team.refresh(); }} describe={r => `${r.member.display_name} added`}
                  build={f => ({ display_name: text(f, 'display_name'), email: text(f, 'email'), role: text(f, 'role') as 'MEMBER' | 'AUDITOR' })}>
                  <Input label="Name" name="display_name" maxLength={100} />
                  <Input label="Work email" name="email" maxLength={254} />
                  <Choice label="Role" name="role" options={[{ value: 'MEMBER', label: 'Member' }, { value: 'AUDITOR', label: 'Auditor (read-only)' }]} defaultValue="MEMBER" />
                </WriteForm>
              )}
            </Section>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
