'use client';
import { useState } from 'react';
import { ENTITLEMENTS, EntitlementCode, GRACE_DAYS, TIER_ORDER, type EntitlementCodeValue } from '@orvia/contracts';
import { useMutation, useQuery } from '../../shared/api.ts';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { formatTime } from '../../shared/state-labels.ts';
import { Badge, FailureState, NoticeBox, PageHead, QueryBoundary, Section } from '../../shared/ui.tsx';

/** Customer-facing plan names. The codes stay FOUNDATION/CONTROL/ENTERPRISE/CUSTOM; the owner may rename the plans later. */
export const PLAN_LABEL: Record<string, string> = { FOUNDATION: 'Foundation', CONTROL: 'Control', ENTERPRISE: 'Enterprise', CUSTOM: 'Custom' };
const PLAN_PROMISE: Record<string, string> = {
  FOUNDATION: 'Everything the DPDP Act requires of an ordinary Data Fiduciary, done properly and with evidence.',
  CONTROL: 'Stop doing it by hand: automate suppression and erasure and check that each system actually did it.',
  ENTERPRISE: 'Board- and auditor-ready assurance, continuously.',
};
const TERM_LABEL: Record<string, string> = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual', TRIAL: 'Trial', CONTRACT: 'Contract' };

/**
 * "Your plan" (revision 1.11). What is in force, what each higher plan adds, and the licence import. No prices and no
 * pressure: a locked feature says what it does and which plan includes it. The server decides every request; this page
 * only reports what the server said (GET /api/v1/admin/plan).
 */
export function Plan() {
  const plan = useQuery('plan');
  const { session } = useSession();
  const canImport = hasCapability(session, 'licence.manage');
  return (
    <>
      <PageHead eyebrow="Installation" title="Your plan"
        lede="Which ORVIA plan this installation is licensed for and what each plan includes. Every legal duty works on every plan; higher plans add automation, verification and assurance." />
      <QueryBoundary query={plan} label="plan" isEmpty={() => false}>
        {d => {
          const usable = new Set<string>(d.usable);
          return (
            <>
              <Section title="In force">
                {!d.licensed
                  ? <NoticeBox tone="warn" title="No licence imported"><p>Import the signed licence issued with your subscription. Until then, only reading, exports and the protective controls (withdrawals, rights requests, breach reporting) can be used.</p></NoticeBox>
                  : <>
                    <p><strong>{PLAN_LABEL[d.edition!]}</strong>{d.trial ? ' (trial)' : ''} · {TERM_LABEL[d.term!]} · valid until {formatTime(d.valid_to!)}</p>
                    {d.lifecycle === 'GRACE' && <NoticeBox tone="warn" title="Your plan has ended — everything still works for now"><p>The licence ended on {formatTime(d.valid_to!)}. Every feature keeps working until {formatTime(d.grace_until!)} ({GRACE_DAYS[d.term!]} days for a {(TERM_LABEL[d.term!] ?? d.term!).toLowerCase()} plan). Import the renewed licence before then.</p></NoticeBox>}
                    {d.lifecycle === 'EXPIRED' && <NoticeBox tone="stop" title="Your plan has expired"><p>New work in {d.edition === 'FOUNDATION' ? 'paid features' : 'Control and Enterprise features'} has stopped. Your legal duties still work: Foundation features, withdrawals, rights requests, breach reporting, reading and exporting everything recorded.</p></NoticeBox>}
                    {d.trial && <NoticeBox tone="info" title="Trial"><p>This trial ends on {formatTime(d.valid_to!)}{d.falls_back_to ? <> and the installation returns to {PLAN_LABEL[d.falls_back_to]} with nothing lost</> : <>; with no paid licence imported, only reading, exports and the protective controls continue</>}. Records created during the trial stay readable.</p></NoticeBox>}
                  </>}
                {d.significant_data_fiduciary && d.edition !== 'ENTERPRISE' && d.edition !== 'CUSTOM' && (
                  <NoticeBox tone="info" title="Significant Data Fiduciary"><p>Your organisation profile records designation as a Significant Data Fiduciary. Your yearly DPIA, audit and DPO duties are tracked on every plan; the DPIA engine, the external audit exchange and algorithmic diligence tooling are part of Enterprise. Nothing is blocked.</p></NoticeBox>
                )}
              </Section>
              {TIER_ORDER.map(tier => {
                const codes = EntitlementCode.options.filter(code => ENTITLEMENTS[code].tier === tier);
                return (
                  <Section key={tier} title={`${PLAN_LABEL[tier]}${tier === 'FOUNDATION' ? '' : ` — everything in ${PLAN_LABEL[TIER_ORDER[TIER_ORDER.indexOf(tier) - 1]!]}, plus`}`}>
                    <p className="cell-sub">{PLAN_PROMISE[tier]}</p>
                    <ul className="plan-features">
                      {codes.map(code => <Feature key={code} code={code} usable={usable.has(code)} />)}
                    </ul>
                  </Section>
                );
              })}
              <Section title="Changing plan">
                <p>Renewals, upgrades, downgrades, trials and seat changes are arranged with your vendor, who issues a new signed licence. Import it below. A downgrade can be imported ahead of renewal; it takes effect on its start date. An older licence cannot be re-imported once a newer one is in force.</p>
                {canImport ? <ImportLicence onDone={() => plan.refresh()} /> : <p className="cell-sub">Importing a licence needs the owner's licence permission.</p>}
              </Section>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}

function Feature({ code, usable }: { code: EntitlementCodeValue; usable: boolean }) {
  const info = ENTITLEMENTS[code];
  const unreleased = code === 'SSO_IDENTITY';
  return (
    <li>
      <span className="cell-primary">{info.label}{' '}
        {unreleased ? <Badge label="not yet available" tone="neutral" /> : usable ? <Badge label="in your plan" tone="ok" /> : <Badge label={`part of ${PLAN_LABEL[info.tier]}`} tone="neutral" />}
      </span>
      <span className="cell-sub">{info.value}</span>
    </li>
  );
}

function ImportLicence({ onDone }: { onDone: () => void }) {
  const [textValue, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const importIt = useMutation('import_licence', true);
  return (
    <form onSubmit={async event => {
      event.preventDefault(); importIt.newInteraction(); setParseError(null);
      let licence: unknown;
      try { const parsed = JSON.parse(textValue); licence = parsed.licence ?? parsed; } catch { setParseError('This is not a licence file. Paste the whole signed licence exactly as received.'); return; }
      if (await importIt.run({ licence } as never)) { setText(''); onDone(); }
    }}>
      <label className="field"><span className="field-label">Signed licence</span>
        <textarea name="licence" rows={6} value={textValue} onChange={e => setText(e.target.value)} spellCheck={false} maxLength={16000} required />
      </label>
      <button type="submit" disabled={importIt.status === 'pending'}>Import licence</button>
      {parseError && <NoticeBox tone="stop" title="Not imported"><p>{parseError}</p></NoticeBox>}
      {importIt.failure && <FailureState failure={importIt.failure} />}
      {importIt.status === 'done' && <NoticeBox tone="ok" title="Licence imported"><p>The plan above now shows what is in force.</p></NoticeBox>}
    </form>
  );
}
