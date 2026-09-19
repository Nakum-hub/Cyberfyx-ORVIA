'use client';
import { useMemo } from 'react';
import { useCollection } from '../shared/api.ts';
import { useDirectory } from '../shared/directory.ts';
import { LIFECYCLE } from './overview.tsx';
import { hasCapability, type StaffSession } from '../shared/session-context.tsx';
import { formatTime } from '../shared/state-labels.ts';
import { Lifecycle, NoticeBox, PageHead, Section, StoryCell } from '../shared/ui.tsx';

type Step = {
  title: string;
  about: string;
  why: string;
  href: string;
  linkLabel: string;
  operator?: string;
};

/**
 * A presentation layer over the real screens.
 *
 * This route executes nothing. It changes no state, starts no workflow and runs
 * no test: every step links to the screen where a real operator performs the
 * real action against the real backend. Its only job is to make the order of the
 * story explicit so a live demonstration does not have to be memorised.
 */
function steps(workflowId: string | null): Step[] {
  const workflow = workflowId ? `/workspace/workflows/${workflowId}` : '/workspace/workflows';
  const evidence = workflowId ? `/workspace/evidence/${workflowId}` : '/workspace/evidence';
  return [
    {
      title: 'The privacy purpose being controlled',
      about: 'The purpose, the notice version published for it, the reviewed policy in force and the systems that policy names.',
      why: 'Privacy decisions are purpose-specific. Without a named purpose and a published notice there is nothing meaningful to consent to.',
      href: '/workspace/configuration',
      linkLabel: 'Open purposes & policies',
      operator: 'Show that publication needs a distinct reviewer who re-authenticates. The author cannot publish their own policy.',
    },
    {
      title: 'The person and their current decision',
      about: 'The Privacy Centre, signed in as the data principal, showing their own current choice and the exact notice version it refers to.',
      why: 'The person, not the organisation, owns this decision — and they can change it at any time without accepting anything new.',
      href: '/privacy',
      linkLabel: 'Open the Privacy Centre',
      operator: 'Use a separate browser profile. Two active sessions in one browser are refused by the server, which is part of the separation being demonstrated.',
    },
    {
      title: 'The person withdraws consent',
      about: 'One confirmation, no new notice, a new immutable receipt and the consent epoch advancing by one.',
      why: 'Withdrawal has to be as easy as granting. The receipt is the person’s proof, and it is never rewritten afterwards.',
      href: '/privacy',
      linkLabel: 'Open my choices',
      operator: 'Withdraw on the same card. Record the receipt identifier that appears.',
    },
    {
      title: 'ORVIA turns the decision into operational work',
      about: 'A durable workflow created from the consent event, with the planned action, its obligations and its recorded timeline.',
      why: 'A privacy decision that does not create operational work is only a preference stored in a database.',
      href: workflow,
      linkLabel: workflowId ? 'Open the most recent workflow' : 'Open workflows',
    },
    {
      title: 'ORVIA changes the connected system',
      about: 'The action panel: the requested restriction, the action status and the target’s own response.',
      why: 'This is the point where a privacy decision becomes a change in a real downstream system.',
      href: workflow,
      linkLabel: 'Open the system action',
    },
    {
      title: 'ORVIA verifies the result independently',
      about: 'The verification panel beside the action: expected state, observed state, method and freshness.',
      why: 'API success is not the same as verification. ORVIA reads the target itself, and only a fresh, satisfied, current-generation scoped read counts as proof.',
      href: workflow,
      linkLabel: 'Open the independent verification',
      operator: 'Point out that an acknowledgement and an observation are two separate panels, never merged into one green tick.',
    },
    {
      title: 'Current authority is enforced at the point of processing',
      about: 'A decision preview evaluated against current authority for a chosen person, purpose and system.',
      why: 'Enforcement has to use current authority at the moment of processing, not a cached earlier answer.',
      href: '/workspace/policy-preview',
      linkLabel: 'Open decision preview',
      operator: 'A preview is not a send authorization. Say so out loud — the screen says it too.',
    },
    {
      title: 'The proof, including what is unresolved',
      about: 'Consent proof, policy versions, execution, independent observation, outstanding gaps and the integrity digest — downloadable as local JSON.',
      why: 'Evidence that hides its own gaps is not evidence. The export keeps the unresolved coverage in it.',
      href: evidence,
      linkLabel: workflowId ? 'Open the proof for this workflow' : 'Open the evidence directory',
    },
    {
      title: 'Deliberately break the control',
      about: 'The broken-control regression scenario, queued here and executed by an authorised local operator.',
      why: 'Anyone can show a control working once. The question that matters is whether you would find out when it stops working.',
      href: '/workspace/test-lab',
      linkLabel: 'Open Test Lab',
      operator: 'Queue the scenario in the browser, then run the operator from the command line. Write the run ID down — this build reads runs by exact ID.',
    },
    {
      title: 'ORVIA detects the failure instead of reporting green',
      about: 'The stored run result: a real business FAIL, with the assertion that did not meet its expectation.',
      why: 'The failure is the feature. The run is never relabelled as a pass, and the repaired rerun is a separate, new request.',
      href: '/workspace/test-lab',
      linkLabel: 'Open the recorded run',
      operator: 'Leave the broken run as FAIL. A detection that is relabelled as a pass invalidates the demonstration.',
    },
  ];
}

export function GuidedDemo({ session }: { session: StaffSession }) {
  const workflows = useCollection('workflows', { enabled: hasCapability(session, 'workflow.read') });
  const directory = useDirectory(['purposes'], hasCapability(session, 'workflow.read'));
  const latest = useMemo(() => {
    const items = workflows.data?.items ?? [];
    return [...items].sort((a, b) => Date.parse(b.accepted_at) - Date.parse(a.accepted_at))[0] ?? null;
  }, [workflows.data]);

  return (
    <>
      <PageHead
        eyebrow="Presentation"
        title="Guided demo"
        lede="The order to walk ORVIA in, and why each step matters. This page runs nothing: every step opens the real screen, where a real operator performs the real action against the real backend."
      />

      <NoticeBox tone="info" title="Nothing on this page changes state">
        <p>
          No step is automated and no outcome is simulated. Consent decisions, reconciliation, manual attestation
          and test execution all remain explicit operator actions on their own screens, with the server
          authorising each one.
        </p>
      </NoticeBox>

      <Section title="The story in one line">
        <Lifecycle stages={LIFECYCLE} />
      </Section>

      {latest ? (
        <Section title="The record this walkthrough will point at">
          <div className="story">
            <div className="story-grid">
              <StoryCell term="Purpose" value={directory.purposeName(latest.purpose_id)} />
              <StoryCell term="Recorded state" value={latest.state.replaceAll('_', ' ').toLowerCase()} />
              <StoryCell term="Decision accepted" value={formatTime(latest.accepted_at)} small />
              <StoryCell term="Chosen because" value="It is the most recently accepted operation you are authorised to read." small />
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Steps">
        {steps(latest?.id ?? null).map((step, index) => (
          <div className="demo-step" key={step.title}>
            <span className="ordinal" aria-hidden="true">{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p className="expect"><strong>What you will see:</strong> {step.about}</p>
              <p className="why"><strong>Why it matters:</strong> {step.why}</p>
              {step.operator ? <p className="why"><strong>Presenter note:</strong> {step.operator}</p> : null}
              <p style={{ marginBottom: 0 }}><a href={step.href}>{step.linkLabel} →</a></p>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Scope of this demonstration">
        <div className="panel">
          <p>
            This build is the customer-local synthetic prototype. It runs entirely on this machine against
            fictional Aster and Birch data, contacts no production system, real recipient or vendor service, and
            uses no hosted model, analytics, remote font or third-party script.
          </p>
          <p style={{ marginBottom: 0 }}>
            Component suites pass at this candidate. That is engineering evidence, not canonical acceptance:
            canonical acceptance additionally requires the two human rehearsals, and every canonical test remains
            not run.
          </p>
        </div>
      </Section>
    </>
  );
}
