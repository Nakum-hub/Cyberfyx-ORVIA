// Round 8 regression for migration 0086. The same unchanged suite runs before
// and after the migration; before it fails at pending retirement's HTTP result.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('canary-retirement');
const { h, check, ok, codes } = t;

await t.run(async () => {
  const owner = await h.login('owner');
  const reviewer = await h.login('reviewer');
  const admin = await h.login('admin');
  const auditor = await h.login('auditor');
  const birch = await h.login('birch');
  const scope = t.scope();
  const create = async (label: string) => {
    const principal = await ok(owner.call('/api/v1/admin/principals', {
      environment_id: scope.environment_id, legal_entity_id: scope.legal_entity_id,
      display_name: unique('Synthetic retirement decoy'),
      email: `retirement.${randomUUID().slice(0, 12)}@aster.example`,
    }, key()), S.schemas.Principal, [201]);
    check(`${label}: fixture is synthetic`, principal.synthetic, true);
    return ok(owner.call('/api/v1/admin/withdrawal-canaries', {
      label: unique(label), principal_id: principal.id,
      planted_in: 'Test-owned synthetic decoy mailbox, never a real recipient.',
    }, key()), S.schemas.WithdrawalCanary);
  };
  const retirement = (id: string) => `/api/v1/admin/withdrawal-canaries/${id}/retirement`;
  const activation = (id: string) => `/api/v1/admin/withdrawal-canaries/${id}/activation`;

  t.setPhase('pending retirement authority');
  const pending = await create('Pending retirement');
  check('created canary has no activation history',
    [pending.state, pending.activated_by, pending.activated_at], ['PENDING', null, null]);
  check('administrator without sensitive access cannot retire a canary',
    (await admin.call(retirement(pending.id), {}, key())).status, 403);
  check('read-only auditor cannot retire a canary',
    (await auditor.call(retirement(pending.id), {}, key())).status, 403);
  check('foreign tenant cannot retire this canary',
    (await birch.call(retirement(pending.id), {}, key())).status, 404);

  t.setPhase('pending retirement regression');
  const replayKey = key();
  const response = await owner.call(retirement(pending.id), {}, replayKey);
  check('pending canary retirement succeeds at the HTTP boundary', response.status, 200);
  const retired = await ok(response, S.schemas.WithdrawalCanary, [200]);
  check('pending retirement preserves absent activation and records retirement',
    [retired.id, retired.state, retired.activated_by, retired.activated_at, retired.retired_at !== null],
    [pending.id, 'RETIRED', null, null, true]);
  const replayed = await ok(owner.call(retirement(pending.id), {}, replayKey), S.schemas.WithdrawalCanary, [200]);
  check('same idempotency key replays the exact retired record', replayed, retired);
  check('a new retirement request is refused after retirement',
    await codes(owner.call(retirement(pending.id), {}, key())), { status: 409, codes: ['already_retired'] });
  check('retirement cannot be undone by later activation',
    await codes(reviewer.call(activation(pending.id), {}, key())),
    { status: 409, codes: ['only_a_pending_canary_is_activated'] });

  t.setPhase('activated retirement control');
  const active = await create('Activated retirement');
  check('creator cannot activate the control canary',
    await codes(owner.call(activation(active.id), {}, key())),
    { status: 409, codes: ['activator_must_differ_from_creator'] });
  const activated = await ok(reviewer.call(activation(active.id), {}, key()), S.schemas.WithdrawalCanary);
  check('distinct reviewer activation creates paired actor and time',
    [activated.state, activated.activated_by !== null, activated.activated_at !== null], ['ACTIVE', true, true]);
  const activeRetired = await ok(owner.call(retirement(active.id), {}, key()), S.schemas.WithdrawalCanary, [200]);
  check('activated retirement retains the exact activation history',
    [activeRetired.state, activeRetired.activated_by, activeRetired.activated_at, activeRetired.retired_at !== null],
    ['RETIRED', activated.activated_by, activated.activated_at, true]);
});
