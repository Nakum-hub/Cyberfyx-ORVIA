/**
 * Routes for the expanded V1 delivery families. index.ts merges these into the
 * canonical route list; the shape restates RouteDefinition because index.ts
 * imports this file.
 */
type Route = { maximum_body_bytes?: number; id: string; method: 'get' | 'post'; path: string; authority: 'STAFF' | 'PRINCIPAL'; request?: string; response: string; status: 200 | 201 | 202; params?: string; query?: string; paginated?: boolean; idempotency?: boolean; capability: string };
const A = '/api/v1/admin';
const list = (id: string, path: string, response: string, capability: string, query?: string): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, paginated: true, capability, ...query ? { query } : {} });
const read = (id: string, path: string, response: string, capability: string, query?: string): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {}, ...query ? { query } : {} });
const write = (id: string, path: string, request: string | undefined, response: string, capability: string, status: 200 | 201 = 201): Route => ({ id, method: 'post', path: A + path, authority: 'STAFF', ...request ? { request } : {}, response, status, idempotency: true, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {} });

export const expansionRoutes: Route[] = [
  // EX06 general impact assessments
  list('list_impact_templates', '/impact-templates', 'ImpactTemplateList', 'grc.read'),
  write('create_impact_template', '/impact-templates', 'ImpactTemplateCreate', 'ImpactTemplate', 'grc.write'),
  write('publish_impact_template', '/impact-templates/{id}/publication', 'ImpactTemplatePublish', 'ImpactTemplate', 'grc.approve', 200),
  list('list_impact_assessments', '/impact-assessments', 'ImpactAssessmentList', 'grc.read', 'ImpactAssessmentQuery'),
  write('create_impact_assessment', '/impact-assessments', 'ImpactAssessmentCreate', 'ImpactAssessmentDetail', 'grc.write'),
  read('impact_assessment', '/impact-assessments/{id}', 'ImpactAssessmentDetail', 'grc.read'),
  write('answer_impact_assessment', '/impact-assessments/{id}/answers', 'ImpactAnswersRecord', 'ImpactAssessmentDetail', 'grc.write', 200),
  write('submit_impact_assessment', '/impact-assessments/{id}/submission', undefined, 'ImpactAssessmentDetail', 'grc.write', 200),
  write('decide_impact_assessment', '/impact-assessments/{id}/decision', 'ImpactDecision', 'ImpactAssessmentDetail', 'grc.approve', 200),
  write('revise_impact_assessment', '/impact-assessments/{id}/revision', 'ImpactRevise', 'ImpactAssessmentDetail', 'grc.write'),
  write('create_impact_finding', '/impact-assessments/{id}/findings', 'ImpactFindingCreate', 'ImpactAssessmentDetail', 'grc.write'),
  write('record_impact_finding_event', '/impact-findings/{id}/events', 'ImpactFindingEventRecord', 'ImpactFinding', 'grc.write'),
  write('impact_escalation_sweep', '/impact-findings/escalation-sweep', undefined, 'ImpactEscalationSweep', 'grc.write', 200),
];
