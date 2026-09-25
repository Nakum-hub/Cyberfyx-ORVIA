import { readSimulator } from '../../../../connectors/src/crm-synthetic/simulator.ts';
import { targetTransaction } from '../../../../connectors/src/shared/target-db.ts';
import { observerEnrollment } from '../../../auth/src/machine-profile.ts';
import type { TargetObserver } from '@orvia/privacy-control';

/**
 * The synthetic demo CRM's observer adapter - the only TargetObserver
 * implemented today. A real connector supplies its own TargetObserver here
 * (registered per system, alongside this one) without privacy-control's
 * processing logic changing at all. No real connector is implemented or
 * claimed to exist yet.
 */
export const syntheticTargetObserver: TargetObserver = async (config, pool, actor, binding) => {
  if (!['SYNTHETIC_CRM', 'ORVIA_REST_SIMULATOR'].includes(binding.connector)) throw new Error('Unsupported target observer');
  const scope = actor.scope;
  const target = await targetTransaction(pool, actor, async tx =>
    (await tx.query(`SELECT generation,marketing_restricted,quarantined FROM marketing_memberships WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND resource_id=$4 AND principal_id=$5 AND purpose_id=$6 AND system_id=$7 AND subject_reference=$8`,
      [scope.tenant_id,scope.legal_entity_id,scope.environment_id,binding.resource_id,binding.principal_id,binding.purpose_id,binding.system_id,binding.subject_reference])).rows[0]);
  if (!target) return undefined;
  if (binding.connector !== 'ORVIA_REST_SIMULATOR') return target;
  const identity = observerEnrollment(config).identities.find(i =>
    i.scope.tenant_id === scope.tenant_id && i.scope.legal_entity_id === scope.legal_entity_id && i.scope.environment_id === scope.environment_id);
  if (!identity) throw new Error('Observer not enrolled');
  const observed = await readSimulator(config, identity.token, binding.resource_id);
  return { generation: observed.generation, marketing_restricted: observed.marketing_restricted, quarantined: target.quarantined };
};
