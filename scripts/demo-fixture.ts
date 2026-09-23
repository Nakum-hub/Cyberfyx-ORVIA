/**
 * Provisions the named demonstration configuration through the real, authorised
 * API — the same endpoints the workspace screens use.
 *
 * This creates nothing the interface could not create: a purpose, a notice, an
 * allowlisted synthetic system, a policy published by a distinct re-authenticated
 * reviewer, and the exact target mappings. It then exercises one real consent
 * cycle so the demonstration has a genuine recorded operation to point at.
 *
 * It does not reset, delete or rewrite anything, it does not touch the consent
 * ledger by hand, and it asserts no outcome: the workflow result is read back
 * from the server exactly as the worker and agent recorded it.
 */
import { randomUUID } from 'node:crypto';
import * as S from '../shared/contracts/src/index.ts';
import { HttpFixture, authenticatorCode } from '../shared/testing/src/http-fixture.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { safeError } from '../shared/testing/src/evidence.ts';

const profile = loadProfile();
if (profile.profile !== 'rehearsal' || process.argv[2] !== 'confirm:rehearsal') {
  throw new Error('Named rehearsal demonstration fixture confirmation required');
}

type Client = ReturnType<HttpFixture['browser']>;
const CRM = 'Aster CRM';
const MANUAL = 'Manual legacy system';
const HEADLINE = 'Promotional Marketing';
const LEGACY = 'Promotional Marketing (legacy system)';

const NOTICE_TEXT = [
  'Aster would like to send you promotional marketing: product announcements, offers and campaign email.',
  '',
  'This is optional. You can withdraw at any time in the Privacy Centre, with one confirmation and without',
  'being asked to accept anything new. Withdrawing does not affect messages you receive about an order you',
  'have actually placed — that is decided separately, under its own condition.',
  '',
  'When you withdraw, Aster restricts marketing for you in the connected systems named in the policy for this',
  'purpose, and ORVIA independently reads those systems back to check the restriction is actually in place.',
  'Both the request and the independent check are recorded as evidence you can be shown.',
].join('\n');

const h = new HttpFixture();

async function readAll<T>(client: Client, path: string, key: 'items' = 'items'): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const response = await client.call(`${path}${path.includes('?') ? '&' : '?'}limit=100${cursor ? `&cursor=${cursor}` : ''}`);
    if (!response.ok) throw new Error(`Read failed: ${path} -> ${response.status}`);
    const page = await response.json() as Record<string, unknown>;
    items.push(...(page[key] as T[]));
    cursor = page['next_cursor'] as string | null;
    if (cursor) { if (seen.has(cursor)) throw new Error('Repeated cursor'); seen.add(cursor); }
  } while (cursor);
  return items;
}

async function create(client: Client, path: string, input: unknown) {
  const response = await client.call(path, input, { 'idempotency-key': randomUUID() });
  if (response.status !== 201) throw new Error(`Create failed: ${path} -> ${response.status}`);
  return response.json();
}

type Purpose = ReturnType<typeof S.Purpose.parse>;
type System = ReturnType<typeof S.System.parse>;
type Notice = ReturnType<typeof S.Notice.parse>;
type Policy = ReturnType<typeof S.Policy.parse>;
type Workflow = ReturnType<typeof S.Workflow.parse>;

const created: string[] = [];
const reused: string[] = [];

try {
  const owner = await h.login('owner');
  const author = await h.login('admin');
  const alice = await h.login('alice');
  const scope = h.users.owner!.scope;
  const selectors = { legal_entity_id: scope.legal_entity_id, environment_id: scope.environment_id };
  const principalId = h.users.alice!.principal_id!;

  /* ---- allowlisted synthetic systems, named for a reader ---- */
  const systems = await readAll<System>(owner, '/api/v1/admin/systems');
  const ensureSystem = async (name: string, connector: System['connector']) => {
    const existing = systems.find(system => system.name === name);
    if (existing) { reused.push(`system ${name}`); return existing; }
    const record = S.System.parse(await create(author, '/api/v1/admin/systems', { ...selectors, name, connector }));
    created.push(`system ${name}`);
    systems.push(record);
    return record;
  };
  const crm = await ensureSystem(CRM, 'SYNTHETIC_CRM');
  const manual = await ensureSystem(MANUAL, 'LEGACY_MANUAL');

  /* ---- purposes, notices and reviewed policies ---- */
  const purposes = await readAll<Purpose>(owner, '/api/v1/admin/purposes');
  const notices = await readAll<Notice>(owner, '/api/v1/admin/notices');
  const policies = await readAll<Policy>(owner, '/api/v1/admin/policies');

  const ensurePurpose = async (name: string, description: string, systemIds: string[], requiredObservation: boolean) => {
    let purpose = purposes.find(item => item.name === name) ?? null;
    if (purpose) reused.push(`purpose ${name}`);
    else {
      purpose = S.Purpose.parse(await create(author, '/api/v1/admin/purposes', {
        ...selectors, code: 'promotional_marketing', name, description,
      }));
      created.push(`purpose ${name}`);
      purposes.push(purpose);
    }

    let published = policies.find(item => item.purpose_id === purpose!.id && item.status === 'PUBLISHED') ?? null;
    if (published) reused.push(`published policy for ${name}`);
    else {
      let notice = notices.find(item => item.purpose_id === purpose!.id) ?? null;
      if (notice) reused.push(`notice for ${name}`);
      else {
        notice = S.Notice.parse(await create(author, '/api/v1/admin/notices', {
          purpose_id: purpose.id, language: 'en', title: 'Marketing communications from Aster', content: NOTICE_TEXT,
        }));
        created.push(`notice for ${name}`);
        notices.push(notice);
      }
      const draft = S.Policy.parse(await create(author, '/api/v1/admin/policies', {
        purpose_id: purpose.id, notice_version_id: notice.version_id,
        condition: 'AFFIRMATIVE_MARKETING_CONSENT', system_ids: systemIds, required_observation: requiredObservation,
      }));
      // Publication re-verifies the reviewer's authenticator and spends the same
      // per-bucket budget as a sign-in, so it waits for the genuine idle window.
      await h.authWindow();
      const proofResponse = await owner.call(`/api/v1/admin/policies/${draft.id}/reauthenticate`, {
        version_id: draft.version_id, digest: draft.digest, code: authenticatorCode(h.users.owner!.totp_uri!),
      });
      if (proofResponse.status !== 201) throw new Error(`Reviewer reauthentication failed (${proofResponse.status})`);
      const proof = S.PublicationProof.parse(await proofResponse.json());
      const publishResponse = await owner.call(`/api/v1/admin/policies/${draft.id}/publish`, {
        version_id: draft.version_id, digest: draft.digest, reauthentication_id: proof.reauthentication_id,
      }, { 'idempotency-key': randomUUID() });
      if (!publishResponse.ok) throw new Error(`Publication failed (${publishResponse.status})`);
      published = S.Policy.parse(await publishResponse.json());
      created.push(`reviewed policy for ${name}`);
      policies.push(published);
    }

    const mappings = await readAll<ReturnType<typeof S.TargetMapping.parse>>(owner, '/api/v1/admin/target-mappings');
    for (const systemId of systemIds) {
      if (mappings.some(item => item.principal_id === principalId && item.purpose_id === purpose!.id && item.system_id === systemId)) {
        reused.push(`target mapping for ${name}`);
        continue;
      }
      await create(author, '/api/v1/admin/target-mappings', { principal_id: principalId, purpose_id: purpose.id, system_id: systemId });
      created.push(`target mapping for ${name}`);
    }
    return purpose;
  };

  // The legacy purpose is provisioned first so the fully verified headline
  // operation is the most recently accepted one a viewer lands on.
  const legacy = await ensurePurpose(
    LEGACY,
    'Promotional marketing that also has to be applied in a legacy system with no supported automated control.',
    [crm.id, manual.id],
    false,
  );
  const headline = await ensurePurpose(
    HEADLINE,
    'Optional promotional marketing. Withdrawal must restrict marketing in the connected CRM, verified by an independent read.',
    [crm.id],
    true,
  );

  /* ---- one real consent cycle per purpose ---- */
  const choiceFor = async (purposeId: string) => {
    for (const item of await readAll<ReturnType<typeof S.ConsentChoice.parse>>(alice, '/api/v1/portal/me/consents')) {
      if (item.purpose_id === purposeId) return item;
    }
    throw new Error('Demonstration purpose is not visible to the principal');
  };
  const decide = async (purposeId: string, kind: 'grant' | 'withdraw') => {
    const current = await choiceFor(purposeId);
    const input = kind === 'grant'
      ? { expected_epoch: current.consent_epoch, interaction_id: current.interaction_id, affirmative: true, notice_version_id: current.notice!.version_id }
      : { expected_epoch: current.consent_epoch, interaction_id: current.interaction_id };
    const response = await alice.call(`/api/v1/portal/me/consents/${purposeId}/${kind}`, input, { 'idempotency-key': randomUUID() });
    if (response.status !== 202) throw new Error(`Consent ${kind} refused (${response.status})`);
    return S.Receipt.parse(await response.json());
  };

  const cycle = async (purpose: Purpose) => {
    const current = await choiceFor(purpose.id);
    if (current.consent_status !== 'GRANTED') await decide(purpose.id, 'grant');
    const receipt = await decide(purpose.id, 'withdraw');
    if (!receipt.workflow_id) return { purpose: purpose.name, workflow: null, state: 'NOT_REQUIRED' };
    // Read the result the running worker and agent actually record. Nothing here
    // asserts an outcome; a still-unresolved workflow is reported as it stands.
    let workflow: Workflow | null = null;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const response = await owner.call(`/api/v1/admin/workflows/${receipt.workflow_id}`);
      if (response.ok) {
        workflow = S.Workflow.parse(await response.json());
        const settled = workflow.actions.length > 0 && workflow.actions.every(action => action.observations.length > 0);
        if (settled || workflow.state === 'COMPLETED') break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return {
      purpose: purpose.name,
      workflow: receipt.workflow_id,
      state: workflow?.state ?? 'UNREAD',
      actions: workflow?.actions.map(action => ({ system: action.plan.scope.system_id, execution_state: action.execution_state, observations: action.observations.map(o => `${o.method}:${o.state}`) })) ?? [],
      obligations: workflow?.obligations.map(o => `${o.completion_criterion}:${o.execution_state}`) ?? [],
    };
  };

  const legacyResult = await cycle(legacy);
  const headlineResult = await cycle(headline);

  console.log(JSON.stringify({
    profile: profile.profile,
    created,
    reused,
    demonstration: [legacyResult, headlineResult],
    limitations: [
      'Synthetic configuration created through the authorised API. Not a rehearsal and not acceptance evidence.',
      'Workflow state is read back from the server; no outcome is asserted by this script.',
    ],
  }, null, 2));
} catch (error) {
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
}
