import * as S from '../../../contracts/src/index.ts';
import { predicate, scopeValues, type Context } from '../shared/transaction.ts';

/**
 * M32 Monitoring, FR-M32-01 and FR-M32-02.
 *
 * The failure this module exists to prevent is an installation that answers
 * every probe while being unable to carry out a single privacy decision. So
 * liveness, dependency readiness and business readiness are three separate
 * verdicts with three separate reasons, and there is deliberately no field that
 * combines them into one.
 *
 * Two of the seven signals the requirement names cannot be measured by this
 * build: there is no connector load budget to have headroom against, and there
 * is no backup capability to report the status of. They say so, and say why,
 * rather than reporting a comfortable zero. A signal measured at zero and a
 * signal that was never measured are different facts and never share a shape.
 *
 * Everything collected here is a count or a duration read from tables this
 * installation already keeps. Nothing reads a payload, a message body, a
 * credential or a reference to a person, so the minimisation FR-M32-01 asks for
 * is a property of what is selected rather than a promise about redaction.
 */

/** Work that has reached a terminal state is not unresolved. */
const UNRESOLVED_WORKFLOW = `state NOT IN ('COMPLETED','CANCELLED')`;

const seconds = (value: unknown) => (value === null || value === undefined ? null : Math.max(0, Math.round(Number(value))));

type Measurement = { value: number; counted: string; unit: 'SECONDS' | 'RECORDS' | 'BYTES' };

/**
 * A measurement that ran. Zero here means the measurement ran and the set was
 * empty, which is why every one of these carries `counted`: the number alone
 * cannot distinguish "nothing is stuck" from "nothing has happened yet", and
 * the sentence beside it can.
 */
function measured(signal: S.OperationalSignalValue['signal'], m: Measurement): S.OperationalSignalValue {
  return { signal, measured: true, value: m.value, unit: m.unit, counted: m.counted, unavailable_reason: null };
}
function unavailable(signal: S.OperationalSignalValue['signal'], counted: string, reason: string): S.OperationalSignalValue {
  return { signal, measured: false, value: null, unit: null, counted, unavailable_reason: reason };
}

export async function operationalReadiness(c: Context): Promise<unknown> {
  const scope = scopeValues(c.actor);
  const one = async (sql: string) => (await c.tx.query(sql, scope)).rows[0] ?? {};
  /** A read that is about the installation rather than a tenant, so it takes no scope. */
  const unscoped = async (sql: string) => (await c.tx.query(sql)).rows[0] ?? {};

  // --- FR-M32-02: the signals, measured or explicitly not ---------------------
  // Accepted-to-dispatched, over the outbox this installation actually has. The
  // oldest gap rather than an average: an average hides the one event that has
  // been stuck for a day behind a hundred that were instant.
  const lag = await one(`SELECT max(extract(epoch FROM dispatched_at-created_at))::bigint AS worst,
      count(*)::int AS n FROM app.outbox_events WHERE ${predicate} AND dispatched_at IS NOT NULL`);
  const pending = await one(`SELECT min(created_at) AS oldest, count(*)::int AS n
      FROM app.outbox_events WHERE ${predicate} AND dispatched_at IS NULL`);
  const unresolved = await one(`SELECT min(accepted_at) AS oldest, count(*)::int AS n
      FROM app.workflows WHERE ${predicate} AND ${UNRESOLVED_WORKFLOW}`);
  const freshness = await one(`SELECT max(checked_at) AS newest, count(*)::int AS n FROM app.system_checks WHERE ${predicate}`);
  const systems = await one(`SELECT count(*)::int AS n FROM app.systems WHERE ${predicate}`);
  const storage = await unscoped('SELECT pg_database_size(current_database())::bigint AS bytes');

  const now = Date.now();
  const age = (value: unknown) => (value ? Math.max(0, Math.round((now - new Date(value as string).getTime()) / 1000)) : null);

  const signals: S.OperationalSignalValue[] = [
    measured('PROPAGATION_LAG', {
      value: seconds(lag.worst) ?? 0,
      unit: 'SECONDS',
      counted: Number(lag.n) === 0
        ? 'No event has been dispatched yet, so the worst observed delay is zero over an empty set rather than a good result.'
        : `The longest delay between accepting an event and dispatching it, across ${Number(lag.n)} dispatched events.`,
    }),
    measured('OLDEST_UNRESOLVED_WORK', {
      value: age(unresolved.oldest) ?? 0,
      unit: 'SECONDS',
      counted: Number(unresolved.n) === 0
        ? 'No workflow is unresolved, so this is zero because there is nothing waiting rather than because everything is fast.'
        : `The age of the oldest workflow that has not reached a terminal state, across ${Number(unresolved.n)} unresolved workflows.`,
    }),
    measured('OBSERVATION_FRESHNESS', {
      value: age(freshness.newest) ?? 0,
      unit: 'SECONDS',
      counted: Number(freshness.n) === 0
        ? 'No connector capability check has ever been recorded, so there is no observation to be fresh or stale.'
        : `The age of the most recent connector capability check, across ${Number(freshness.n)} recorded checks.`,
    }),
    measured('QUEUE_DEPTH', {
      value: Number(pending.n),
      unit: 'RECORDS',
      counted: 'Accepted events that have not been dispatched. This is a depth, not a rate, and says nothing about whether the queue is draining.',
    }),
    // The requirement names connector limits. There is no measured load budget
    // in this build to have headroom against, and inventing one would be worse
    // than reporting none: an operator would act on it.
    unavailable('CONNECTOR_LIMIT_HEADROOM',
      'Remaining headroom against a connector load budget.',
      'No connector load budget has been measured for this deployment, so there is nothing to report headroom against. Setting one requires a representative workload and the customer’s permission to generate it.'),
    measured('STORAGE_FOOTPRINT', {
      value: Number(storage.bytes),
      unit: 'BYTES',
      counted: 'Total size of this installation’s database, including indexes and every environment it holds. It is not a per-tenant figure.',
    }),
    // The requirement names backup status. This build has no backup capability
    // at all, which is a fact about the product and belongs in the report.
    unavailable('BACKUP_STATUS',
      'Age and outcome of the most recent verified backup.',
      'This build has no backup or restore capability, so there is no backup whose status could be reported. Nothing here should be read as a backup having succeeded.'),
  ];

  // --- FR-M32-01: three verdicts that never merge -----------------------------
  // Liveness is the weakest of the three and the report says so, because it is
  // the one most often mistaken for the others.
  const liveness: S.ReadinessFactValue = {
    kind: 'LIVENESS', verdict: 'READY',
    covers: 'This process is running and answered this request. It says nothing about whether any dependency is reachable or whether any privacy decision can be carried out.',
    blocking: [],
  };

  // Dependency readiness is established by having done real work in this
  // request rather than by pinging anything: the rows above came from
  // PostgreSQL through a policy-scoped connection, so both are answering.
  const dependencies: S.ReadinessFactValue = {
    kind: 'DEPENDENCY_READINESS', verdict: 'READY',
    covers: 'PostgreSQL answered a scoped query and the policy engine authorised this request, both proven by this request having reached here rather than by a separate probe. It does not cover the workflow engine, which this request never touches.',
    blocking: [],
  };

  // Business readiness is the one uptime never tells you.
  const published = await one(`SELECT count(*)::int AS n FROM app.policy_versions WHERE ${predicate} AND status='PUBLISHED'`);
  const restrictable = await one(`SELECT count(*)::int AS n FROM app.system_checks WHERE ${predicate} AND supports_restrict`);
  const blocking: string[] = [];
  if (Number(published.n) === 0) blocking.push('No policy has been published, so there is no authority under which a decision could be enforced.');
  if (Number(systems.n) === 0) blocking.push('No system is configured, so there is nowhere for a decision to take effect.');
  else if (Number(restrictable.n) === 0) blocking.push('No configured system has been checked and found able to restrict, so a decision could be recorded and never carried out.');
  const business: S.ReadinessFactValue = {
    kind: 'BUSINESS_READINESS',
    verdict: blocking.length ? 'NOT_READY' : 'READY',
    covers: 'Whether this installation could carry a privacy decision through to a system that can act on it: a published policy, a configured system, and a capability check showing that system can restrict. It does not predict that any particular decision will succeed.',
    blocking,
  };

  return S.OperationalReadiness.parse({
    as_of: new Date().toISOString(), profile: S.PROFILE,
    facts: [liveness, dependencies, business],
    signals,
    combined_status_is_not_reported: true,
    uptime_is_not_evidence_of_correct_operation: true,
    limits: [
      'These are three separate verdicts and they are not combined. A live process with reachable dependencies can still be unable to carry out a single privacy decision.',
      'Two of the seven signals were not measured. An unmeasured signal is not a signal at zero, and the reason each gives is the reason it cannot be measured rather than a temporary fault.',
      'Every figure here is a count or a duration read from this installation’s own tables. Nothing is sent anywhere, and nothing here is retained as a metric series.',
      'A signal within its usual range is not evidence that the product is working. That question is answered by the coverage report and the test runs, not by this page.',
    ],
  });
}
