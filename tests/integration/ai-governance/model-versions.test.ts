// Custom-model version governance (migration 0080, contract 0.53.0). Scenario: a shop governs its own churn-prediction model.
// Under test: a version records its training datasets, purpose, basis, data cut-off, evaluation and limits; a trained model must
// name its data, a rule-based one need not; the recorder cannot approve; approval is refused while any training dataset is not
// mapped to an activity serving the training purpose, naming the dataset; once mapped, a second person approves and deploys it;
// deploying the next version retires the previous one (one deployed at a time); consent withdrawn for the training purpose after
// the cut-off flags a retraining decision on the version and in Operations attention, never an "unlearning" claim; an open
// finding on the AI use blocks approval and deployment; approved facts cannot be rewritten or deleted; an auditor reads but
// cannot record; another tenant sees nothing. ORVIA trains, runs and evaluates no model here.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, unique, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';

const t = operationsSuite('ai-model-versions');
const { h, check, ok, codes, db } = t;

await t.run(async () => {
  const scenario = await createMarketingScenario(h);
  const admin = scenario.author; const owner = scenario.owner; const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const asset = async (name: string) => ok(admin.call('/api/v1/admin/data-assets', { system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: unique(name),
    description: 'Synthetic training dataset.', provenance: 'ASSERTED', valid_from: new Date().toISOString(), categories: [] }, key()), S.schemas.DataAsset, [201]);
  const activity = await ok(admin.call('/api/v1/admin/processing-activities', { purpose_id: scenario.purpose.id, name: unique('Churn model training'), description: 'Training a retention model on customer history (synthetic).',
    lawful_condition: 'AFFIRMATIVE_MARKETING_CONSENT', owner_reference: 'Synthetic data science team' }, key()), S.schemas.ProcessingActivity, [201]);
  const relate = (type: string, from: { kind: string; id: string }, to: { kind: string; id: string }) => ok(admin.call('/api/v1/admin/graph/relationships', { relationship_type: type, from, to, provenance: 'ASSERTED',
    valid_from: new Date().toISOString(), confidence_basis: 'Declared synthetic mapping.' }, key()), S.schemas.GraphRelationship, [201]);
  const orders = await asset('order_history'); const clicks = await asset('clickstream');
  await relate('ASSET_PROCESSED_BY_ACTIVITY', { kind: 'DATA_ASSET', id: orders.id }, { kind: 'PROCESSING_ACTIVITY', id: activity.id });
  await relate('ACTIVITY_SERVES_PURPOSE', { kind: 'PROCESSING_ACTIVITY', id: activity.id }, { kind: 'PURPOSE', id: scenario.purpose.id });
  const ai = await ok(admin.call('/api/v1/admin/ai-systems', { name: unique('Churn prediction'), use_case: 'Predict which customers may leave, for retention offers (synthetic).', purpose_id: scenario.purpose.id,
    processing_activity_id: activity.id, input_asset_id: orders.id, output_system_id: scenario.system.id, processor_id: null }, key()), S.schemas.AiSystem, [201]);
  const event = (kind: string, state: string, policy: string | null = null) => ({ kind, state, title: `Synthetic ${kind}`, detail: 'Reviewed synthetic governance record.', source_reference: 'SYN-1', policy_version_id: policy, incident_id: null });
  const events = `/api/v1/admin/ai-systems/${ai.id}/events`;
  for (const e of [event('RISK_ASSESSMENT', 'RECORDED'), event('POLICY', 'RECORDED', scenario.policy.version_id), event('CONTROL', 'RECORDED')]) await ok(admin.call(events, e, key()), S.schemas.AiGovernanceEvent, [201]);
  await ok(owner.call(events, event('APPROVAL', 'APPROVED'), key()), S.schemas.AiGovernanceEvent, [201]);
  const V = `/api/v1/admin/ai-systems/${ai.id}/model-versions`;
  const body = (label: string, assets: string[], extra: Record<string, unknown> = {}) => ({ version_label: label, model_kind: 'CUSTOM_TRAINED', training_asset_ids: assets, training_purpose_id: scenario.purpose.id,
    training_basis: 'Customers who consented to promotional marketing; retention offers are within that purpose (synthetic).', training_data_as_of: hoursFromNow(-2),
    evaluation_reference: 'Evaluation report EV-3 (synthetic)', evaluation_summary: 'Holdout AUC 0.81 on a time-split; no protected attribute used (synthetic).', known_limitations: 'Not validated for customers with under 90 days of history (synthetic).', ...extra });

  t.setPhase('recording');
  check('a trained model must name its training data', (await admin.call(V, body('v0', []), key())).status, 400);
  check('a rule-based model needs no training data', (await admin.call(V, body(unique('rules'), [], { model_kind: 'RULE_BASED' }), key())).status, 201);
  check('a training cut-off in the future is refused', (await codes(admin.call(V, body('vf', [orders.id], { training_data_as_of: hoursFromNow(48) }), key()))).codes, ['in_the_future']);
  check('an unknown dataset is refused', (await admin.call(V, body('vx', [randomUUID()]), key())).status, 404);
  check('an auditor cannot record a version', (await auditor.call(V, body('va', [orders.id]), key())).status, 403);
  const v1 = await ok(admin.call(V, body('churn-1', [orders.id, clicks.id]), key()), S.schemas.AiModelVersion, [201]);
  check('a version is recorded as a draft with its evidence', [v1.state, v1.training_asset_ids.length, v1.evaluation_reference, v1.limits.some(l => l.includes('did not train, run or evaluate'))], ['DRAFT', 2, 'Evaluation report EV-3 (synthetic)', true]);
  check('the same label is not recorded twice', (await codes(admin.call(V, body('churn-1', [orders.id]), key()))).codes, ['already_recorded']);

  t.setPhase('approval');
  check('the recorder cannot approve', (await admin.call(`/api/v1/admin/ai-model-versions/${v1.id}/approval`, {}, key())).status, 403);
  const unmapped = await codes(owner.call(`/api/v1/admin/ai-model-versions/${v1.id}/approval`, {}, key()));
  check('approval is refused while a training dataset is not mapped to the training purpose, naming it', [unmapped.status, unmapped.codes], [409, ['training_data_not_mapped_to_training_purpose', clicks.id]]);
  await relate('ASSET_PROCESSED_BY_ACTIVITY', { kind: 'DATA_ASSET', id: clicks.id }, { kind: 'PROCESSING_ACTIVITY', id: activity.id });
  const approved = await ok(owner.call(`/api/v1/admin/ai-model-versions/${v1.id}/approval`, {}, key()), S.schemas.AiModelVersion);
  check('once every dataset is mapped, a second person approves it', [approved.state, approved.approved_by === h.users.owner!.id], ['APPROVED', true]);
  const deployed = await ok(owner.call(`/api/v1/admin/ai-model-versions/${v1.id}/deployment`, {}, key()), S.schemas.AiModelVersion);
  check('an approved version is deployed', deployed.state, 'DEPLOYED');

  t.setPhase('the next version');
  const v2 = await ok(admin.call(V, body('churn-2', [orders.id]), key()), S.schemas.AiModelVersion, [201]);
  check('a draft cannot be deployed', (await codes(owner.call(`/api/v1/admin/ai-model-versions/${v2.id}/deployment`, {}, key()))).codes, ['only_an_approved_version_is_deployed']);
  await ok(owner.call(`/api/v1/admin/ai-model-versions/${v2.id}/approval`, {}, key()), S.schemas.AiModelVersion);
  await ok(owner.call(`/api/v1/admin/ai-model-versions/${v2.id}/deployment`, {}, key()), S.schemas.AiModelVersion);
  const list = (await ok(admin.call(`${V}?limit=50`), S.schemas.AiModelVersionList)).items;
  check('deploying the next version retires the previous one: one deployed at a time', [list.find(v => v.id === v1.id)?.state, list.find(v => v.id === v2.id)?.state, list.filter(v => v.state === 'DEPLOYED').length], ['RETIRED', 'DEPLOYED', 1]);

  t.setPhase('withdrawal after the cut-off');
  await scenario.change('grant'); await scenario.change('withdraw');
  const after = (await ok(admin.call(`${V}?limit=50`), S.schemas.AiModelVersionList)).items.find(v => v.id === v2.id)!;
  check('a withdrawal for the training purpose after the cut-off flags a retraining decision', [after.withdrawals_since_training_data >= 1, after.retraining_review_due], [true, true]);
  const item = (await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention)).items.find(i => i.kind === 'AI_MODEL_RETRAIN_REVIEW' && i.entity_id === ai.id);
  check('Operations attention asks for a retraining decision and claims no unlearning', [item !== undefined, item?.detail.includes('does not claim the model forgot')], [true, true]);

  t.setPhase('an open finding');
  const v3 = await ok(admin.call(V, body('churn-3', [orders.id]), key()), S.schemas.AiModelVersion, [201]);
  await ok(admin.call(events, event('MONITORING', 'FINDING'), key()), S.schemas.AiGovernanceEvent, [201]);
  check('an open finding on the AI use blocks approval', (await codes(owner.call(`/api/v1/admin/ai-model-versions/${v3.id}/approval`, {}, key()))).codes, ['the_ai_use_has_an_open_finding']);
  const v4 = await ok(admin.call(V, body('churn-4', [orders.id]), key()), S.schemas.AiModelVersion, [201]);
  await db.query(`UPDATE app.ai_model_versions SET state='APPROVED', approved_by=$2, approved_at=now() WHERE id=$1`, [v4.id, h.users.owner!.id]);
  check('an approved version is not deployed while the AI use is not currently approved', (await codes(owner.call(`/api/v1/admin/ai-model-versions/${v4.id}/deployment`, {}, key()))).codes, ['the_ai_use_is_not_currently_approved']);

  t.setPhase('guards and tenancy');
  const refused = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'changed', (e: Error) => e.message);
  check('an approved version\'s training facts cannot be rewritten', await refused('UPDATE app.ai_model_versions SET training_basis=$2 WHERE id=$1', [v2.id, 'Rewritten after approval to hide the source.']), 'model_version_transition_refused');
  check('a version cannot be deleted', await refused('DELETE FROM app.ai_model_versions WHERE id=$1', [v1.id]), 'model_version_is_retained');
  check('an auditor reads model versions', (await auditor.call(`${V}?limit=10`)).status, 200);
  check('another tenant sees nothing', (await birch.call(`${V}?limit=10`)).status, 404);
});
