import { readSimulator } from '../../../connectors/src/crm-synthetic/simulator.ts';
import { observerEnrollment } from '../../../auth/src/machine-profile.ts';
import type { TargetObserver } from '@orvia/privacy-control';

/**
 * The synthetic demo CRM's observer adapter - the only TargetObserver
 * implemented today. A real connector supplies its own TargetObserver here
 * (registered per system, alongside this one) without privacy-control's
 * processing logic changing at all. No real connector is implemented or
 * claimed to exist yet.
 */
export const syntheticTargetObserver: TargetObserver = async (config, scope, resource) => {
  const identity = observerEnrollment(config).identities.find(i =>
    i.scope.tenant_id === scope.tenant_id && i.scope.legal_entity_id === scope.legal_entity_id && i.scope.environment_id === scope.environment_id);
  if (!identity) throw new Error('Observer not enrolled');
  const observed = await readSimulator(config, identity.token, resource);
  return { generation: observed.generation, marketing_restricted: observed.marketing_restricted };
};
