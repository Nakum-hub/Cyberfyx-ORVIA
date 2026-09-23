import type { RuntimeConfig } from '../../auth/src/config.ts';

/**
 * The independently-observed state of a target resource for a system whose
 * declared connector supports it. Privacy-control depends only on this shape,
 * never on a specific connector's client code - the wiring layer supplies the
 * concrete adapter for whichever connector a system is actually configured
 * with. Today only the synthetic demo CRM connector implements one; a real
 * connector is not implemented and none is claimed to exist.
 */
export type TargetObservation = { generation: number; marketing_restricted: boolean };

export type TargetObserver = (
  config: RuntimeConfig,
  scope: { tenant_id: string; legal_entity_id: string; environment_id: string },
  resource: string,
) => Promise<TargetObservation>;
