// Review counterexample for e839b1a; Codex owns the implementation correction.
// Run from repository root with the pinned Node after frozen installation.
import { workflowCompletion } from '../../../../packages/domain/src/completion.ts';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = new Date('2026-09-16T10:01:00Z');
const obligation = {
  id: id(1), task_version: 0, required: true,
  completion_criterion: 'CURRENT_SCOPED_OBSERVATION',
  execution_state: 'ACKNOWLEDGED', attestation: null,
  scope_still_current: true, skip_reason: null,
  observation: {
    id: id(2), action_id: id(3), system_id: id(4), resource_id: id(5),
    target_generation: 1, state: 'OBSERVED_SATISFIED',
    method: 'PROVIDER_RECEIPT', observed_at: '2026-09-16T10:00:00Z',
    fresh_until: '2026-09-16T10:02:00Z',
    desired_state: 'MARKETING_RESTRICTED', observed_state: 'MARKETING_RESTRICTED',
    limits: ['Provider assertion only; no independent target read performed.'],
  },
};
const cases = [
  { id: 'ack-only', input: { ...obligation, observation: null }, expected: 'NEEDS_ATTENTION' },
  { id: 'provider-assertion-only', input: obligation, expected: 'NEEDS_ATTENTION' },
  { id: 'fresh-scoped-read', input: { ...obligation, observation: { ...obligation.observation, method: 'SCOPED_READ', limits: ['Exact synthetic resource read.'] } }, expected: 'COMPLETED' },
  { id: 'stale-scoped-read', input: { ...obligation, observation: { ...obligation.observation, method: 'SCOPED_READ', fresh_until: '2026-09-16T10:00:30Z' } }, expected: 'NEEDS_ATTENTION' },
];
const assertions = cases.map(({ id, input, expected }) => {
  const actual = workflowCompletion([input], now);
  return { id, expected, actual, result: actual === expected ? 'PASS' : 'FAIL' };
});
console.log(JSON.stringify({ kind: 'WORK_REVIEW_COUNTEREXAMPLE', assertions,
  limitations: ['Pure domain/schema execution only; no target, database, API or browser involved.'] }, null, 2));
process.exitCode = assertions.some(a => a.result === 'FAIL') ? 1 : 0;
