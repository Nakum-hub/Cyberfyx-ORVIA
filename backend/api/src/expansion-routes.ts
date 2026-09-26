import type { Context, Page } from '../../domain/src/shared/transaction.ts';
import type { RouteDefinition } from '../../../shared/contracts/src/index.ts';
import { createTemplate, publishTemplate, templateList, createAssessment, assessmentView, assessmentList, recordAnswers, submitAssessment, decideAssessment, reviseAssessment, createFinding, recordFindingEvent, escalationSweep } from '../../domain/src/assessments/impact.ts';
import { createAgreement, terminateAgreement, agreementList, setTier, standing, standingList, createSupplierLink, revokeSupplierLink, supplierLinkList } from '../../domain/src/third-party/third-party.ts';

/**
 * Dispatch for the expanded V1 delivery families. Every route arrives already
 * authenticated, capability-checked, validated and inside the scoped business
 * transaction; returning undefined passes the route on.
 */
export async function expansionRoute(c: Context, route: RouteDefinition, id: string | undefined, input: unknown, page: Page, query: unknown): Promise<unknown | undefined> {
  switch (route.id) {
    case 'list_impact_templates': return templateList(c, page);
    case 'create_impact_template': return createTemplate(c, input);
    case 'publish_impact_template': return publishTemplate(c, id!, input);
    case 'list_impact_assessments': return assessmentList(c, page, query);
    case 'create_impact_assessment': return createAssessment(c, input);
    case 'impact_assessment': return assessmentView(c, id!);
    case 'answer_impact_assessment': return recordAnswers(c, id!, input);
    case 'submit_impact_assessment': return submitAssessment(c, id!);
    case 'decide_impact_assessment': return decideAssessment(c, id!, input);
    case 'revise_impact_assessment': return reviseAssessment(c, id!, input);
    case 'create_impact_finding': return createFinding(c, id!, input);
    case 'record_impact_finding_event': return recordFindingEvent(c, id!, input);
    case 'impact_escalation_sweep': return escalationSweep(c);
    case 'list_processor_agreements': return agreementList(c, page, query);
    case 'create_processor_agreement': return createAgreement(c, input);
    case 'terminate_processor_agreement': return terminateAgreement(c, id!, input);
    case 'set_processor_tier': return setTier(c, id!, input);
    case 'third_party_standing': return standing(c, id!);
    case 'list_third_party_standing': return standingList(c, page);
    case 'create_supplier_link': return createSupplierLink(c, input);
    case 'list_supplier_links': return supplierLinkList(c, page, query);
    case 'revoke_supplier_link': return revokeSupplierLink(c, id!, input);
    default: return undefined;
  }
}
