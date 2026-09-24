// DPDP operations: Data & Processing Registry (quality s4 "Registry").
// Under test: read/write/sensitive authority boundaries and tenant isolation; a
// person keeps separate relationship contexts; references are unique per system
// and a source key is stored only as a keyed digest; merge and unmerge keep
// history; representatives and child status are sensitive (super admin only) and a
// representative needs a second person to verify it and cite the V1
// mandate where the person has a portal identity; child status is never inferred;
// safeguards cannot claim evidence they do not cite; history tables refuse
// rewrites; coverage counts are honest ratios; and changes emit events.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('registry');
const { h, check, ok, codes, db } = t;
const DAY = 24;

await t.run(async () => {
  await t.ensurePackage();
  const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const admin = await h.login('admin'); const auditor = await h.login('auditor'); const member = await h.login('member'); const birch = await h.login('birch');
  const system = await t.boundSystem('Registry CRM');
  const ref = () => `rg_${randomUUID().slice(0, 12)}`;

  t.setPhase('authority');
  check('a member cannot read the registry', (await member.call('/api/v1/admin/data-principals')).status, 403);
  check('an auditor can read the registry', (await auditor.call('/api/v1/admin/data-principals?limit=5')).status, 200);
  check('an auditor cannot write the registry', (await auditor.call('/api/v1/admin/data-principals', { principal_id: null, references: [] }, key())).status, 403);

  t.setPhase('people and contexts');
  const customer = await ok(admin.call('/api/v1/admin/data-principal-categories', { name: unique('Customer'), description: 'Synthetic customer relationship.', regulatory_tags: [] }, key()), S.schemas.PrincipalCategory);
  const employee = await ok(admin.call('/api/v1/admin/data-principal-categories', { name: unique('Employee'), description: 'Synthetic employment relationship.', regulatory_tags: [] }, key()), S.schemas.PrincipalCategory);
  check('a category name is unique', (await codes(admin.call('/api/v1/admin/data-principal-categories', { name: customer.name, description: 'Duplicate category.', regulatory_tags: [] }, key()))).codes, ['category_exists']);
  const email = `person.${randomUUID().slice(0, 6)}@records.example`;
  const firstRef = ref();
  const person = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: firstRef, source_key: email }] }, key()), S.schemas.Subject);
  check('the reference records that a source key was supplied', person.references.map(r => [r.target_reference, r.has_source_key]), [[firstRef, true]]);
  const stored = JSON.stringify((await db.query('SELECT * FROM app.data_principal_references WHERE subject_id=$1', [person.id])).rows);
  check('the source key itself is never stored, only its keyed digest', [stored.includes(email), stored.includes(email.toLowerCase())], [false, false]);
  check('a reference belongs to one person per system', (await codes(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: firstRef, source_key: null }] }, key()))).codes, ['reference_held_by_another_data_principal']);
  const since = new Date();
  const asCustomer = await ok(admin.call('/api/v1/admin/data-principal-relationships', { subject_id: person.id, category_id: customer.id, effective_from: hoursFromNow(-DAY * 200), effective_to: null, status: 'ACTIVE',
    source_system_id: system.id, source_reference: 'CRM account', evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'crm:acct-1' }, key()), S.schemas.Relationship);
  const asEmployee = await ok(admin.call('/api/v1/admin/data-principal-relationships', { subject_id: person.id, category_id: employee.id, effective_from: hoursFromNow(-DAY * 800), effective_to: null, status: 'UNKNOWN',
    source_system_id: null, source_reference: null, evidence_state: 'UNKNOWN', evidence_reference: null }, key()), S.schemas.Relationship);
  const detail = await ok(admin.call(`/api/v1/admin/data-principals/${person.id}`), S.schemas.Subject);
  check('one person keeps separate relationship contexts', detail.relationships.map(r => [r.category_id, r.status]).sort(), [[customer.id, 'ACTIVE'], [employee.id, 'UNKNOWN']].sort());
  check('an unknown relationship status stays unknown', asEmployee.evidence_state, 'UNKNOWN');
  const ended = await ok(admin.call(`/api/v1/admin/data-principal-relationships/${asCustomer.id}/end`, { effective_to: hoursFromNow(-1), evidence_reference: 'crm:closure-1', reason: 'Account closed at the customer\'s request.' }, key()), S.schemas.Relationship);
  check('ending a context records its end', [ended.status, ended.effective_to !== null], ['ENDED', true]);
  check('a context is ended once', (await codes(admin.call(`/api/v1/admin/data-principal-relationships/${asCustomer.id}/end`, { effective_to: null, evidence_reference: null, reason: 'Ending a second time must fail.' }, key()))).codes, ['already_ended']);
  const events = (await db.query(`SELECT subject_id,event_type FROM app.operational_events WHERE subject_id=ANY($1::uuid[]) AND occurred_at>=$2`, [[asCustomer.id, asEmployee.id], since])).rows.map(r => `${r.subject_id}:${r.event_type}`);
  check('context creation and end are emitted as events', [`${asCustomer.id}:data_principal_context_created`, `${asEmployee.id}:data_principal_context_created`, `${asCustomer.id}:data_principal_context_updated`].every(e => events.includes(e)), true);
  const { activity } = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: 'Employee processing' });
  const processing = await ok(admin.call(`/api/v1/admin/data-principals/${person.id}/processing`), S.schemas.SubjectProcessing);
  check('processing is reported per relationship context', processing.contexts.length, 2);
  check('an activity for another category is not attributed to this person', processing.contexts.some(x => x.activities.some(a => a.activity_id === activity.id)), false);

  t.setPhase('merge');
  const duplicate = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: ref(), source_key: null }] }, key()), S.schemas.Subject);
  check('a person cannot be merged into themselves', (await codes(admin.call(`/api/v1/admin/data-principals/${duplicate.id}/merge`, { into_subject_id: duplicate.id, basis: 'Self merge must be refused.' }, key()))).codes, ['cannot_merge_into_itself']);
  const merged = await ok(admin.call(`/api/v1/admin/data-principals/${duplicate.id}/merge`, { into_subject_id: person.id, basis: 'Same person confirmed by matching account records.' }, key()), S.schemas.Subject);
  check('a merged record points at the surviving person', [merged.status, merged.merged_into], ['MERGED', person.id]);
  check('a merged record takes no new references', (await codes(admin.call(`/api/v1/admin/data-principals/${duplicate.id}/references`, { system_id: system.id, target_reference: ref(), source_key: null }, key()))).codes, ['subject_is_merged']);
  const restored = await ok(admin.call(`/api/v1/admin/data-principals/${duplicate.id}/unmerge`, { reason: 'The match was wrong; the records are different people.' }, key()), S.schemas.Subject);
  check('an unmerge restores the record', [restored.status, restored.merged_into], ['ACTIVE', null]);

  t.setPhase('representatives');
  const guardian = await ok(owner.call('/api/v1/admin/data-principal-representatives', { subject_id: person.id, kind: 'GUARDIAN', representative_reference: 'Synthetic parent', authority_evidence_reference: 'Birth certificate reference (synthetic)',
    mandate_id: null, effective_from: hoursFromNow(-1), effective_to: null, restrictions: [] }, key()), S.schemas.Representative);
  check('a recorded representative starts unverified', guardian.verification, 'UNVERIFIED');
  check('an organisation admin cannot record a representative', (await admin.call('/api/v1/admin/data-principal-representatives', { subject_id: person.id, kind: 'AUTHORISED_REPRESENTATIVE', representative_reference: 'Synthetic agent',
    authority_evidence_reference: 'Power of attorney (synthetic)', mandate_id: null, effective_from: hoursFromNow(-1), effective_to: null, restrictions: [] }, key())).status, 403);
  check('an organisation admin cannot record child status', (await admin.call('/api/v1/admin/child-status-records', { subject_id: person.id, child_status: 'UNKNOWN', basis: 'Admin must be refused.', evidence_reference: null, guardian_id: null, verifiable_consent: 'UNKNOWN', verifiable_consent_evidence_reference: null }, key())).status, 403);
  check('the person who recorded a representative cannot verify it', (await codes(owner.call(`/api/v1/admin/data-principal-representatives/${guardian.id}/verification`, { verification: 'VERIFIED', evidence_reference: 'Self verification.' }, key()))).codes, ['recorder_cannot_verify']);
  const verified = await ok(reviewer.call(`/api/v1/admin/data-principal-representatives/${guardian.id}/verification`, { verification: 'VERIFIED', evidence_reference: 'Checked against the original document.' }, key()), S.schemas.Representative);
  check('a second person verifies the representative', [verified.verification, verified.verified_by !== guardian.recorded_by], ['VERIFIED', true]);
  check('representatives are sensitive: an organisation admin cannot list them', (await admin.call('/api/v1/admin/data-principal-representatives')).status, 403);
  check('a super admin can list representatives', (await owner.call('/api/v1/admin/data-principal-representatives?limit=100')).status, 200);
  const alice = await t.principalSubject('alice', []);
  check('for a person with a portal identity, a nomination must cite the V1 mandate', (await codes(owner.call('/api/v1/admin/data-principal-representatives', { subject_id: alice.id, kind: 'NOMINEE', representative_reference: 'Synthetic nominee',
    authority_evidence_reference: 'Nomination form (synthetic)', mandate_id: null, effective_from: hoursFromNow(-1), effective_to: null, restrictions: [] }, key()))).codes, ['portal_identity_requires_its_mandate']);
  const guardianMandate = await ok(admin.call('/api/v1/admin/mandates', { kind: 'GUARDIAN', principal_id: h.users.alice!.principal_id!, representative_reference: 'Synthetic guardian', permitted_rights: ['ACCESS'],
    valid_from: hoursFromNow(-24), valid_to: hoursFromNow(48), evidence_reference: 'Guardianship attestation (synthetic).' }, key()), S.schemas.Mandate);
  check('a mandate of the wrong kind does not authorise a nomination', (await codes(owner.call('/api/v1/admin/data-principal-representatives', { subject_id: alice.id, kind: 'NOMINEE', representative_reference: 'Synthetic nominee',
    authority_evidence_reference: 'Nomination form (synthetic)', mandate_id: guardianMandate.id, effective_from: hoursFromNow(-1), effective_to: null, restrictions: [] }, key()))).codes, ['mandate_does_not_match']);
  const nominationMandate = await ok(admin.call('/api/v1/admin/mandates', { kind: 'NOMINATION', principal_id: h.users.alice!.principal_id!, representative_reference: 'Synthetic nominee', permitted_rights: ['ACCESS'],
    valid_from: hoursFromNow(-24), valid_to: null, evidence_reference: 'Nomination form (synthetic).' }, key()), S.schemas.Mandate);
  const nominee = await ok(owner.call('/api/v1/admin/data-principal-representatives', { subject_id: alice.id, kind: 'NOMINEE', representative_reference: 'Synthetic nominee',
    authority_evidence_reference: 'Nomination form (synthetic)', mandate_id: nominationMandate.id, effective_from: hoursFromNow(-1), effective_to: null, restrictions: ['Access requests only'] }, key()), S.schemas.Representative);
  check('an unverified nomination cannot be activated', (await codes(owner.call(`/api/v1/admin/data-principal-representatives/${nominee.id}/activation`, { basis: 'INCAPACITY', evidence_reference: 'Medical certificate (synthetic)' }, key()))).codes, ['nomination_not_verified']);
  await ok(reviewer.call(`/api/v1/admin/data-principal-representatives/${nominee.id}/verification`, { verification: 'VERIFIED', evidence_reference: 'Nominee identity checked.' }, key()), S.schemas.Representative);
  const activated = await ok(owner.call(`/api/v1/admin/data-principal-representatives/${nominee.id}/activation`, { basis: 'INCAPACITY', evidence_reference: 'Medical certificate (synthetic)' }, key()), S.schemas.Representative);
  check('a verified nomination is activated on a recorded basis', [activated.activation_basis, activated.activated_at !== null], ['INCAPACITY', true]);
  check('only a nomination is activated', (await codes(owner.call(`/api/v1/admin/data-principal-representatives/${guardian.id}/activation`, { basis: 'DEATH', evidence_reference: 'Not a nomination.' }, key()))).codes, ['only_a_nomination_is_activated']);

  t.setPhase('child status');
  check('no child status is inferred where none is recorded', (await codes(owner.call(`/api/v1/admin/data-principals/${duplicate.id}/child-status`))).codes, ['no_child_status_recorded']);
  check('a status other than unknown needs evidence', (await codes(owner.call('/api/v1/admin/child-status-records', { subject_id: person.id, child_status: 'CHILD', basis: 'Declared age.', evidence_reference: null, guardian_id: null, verifiable_consent: 'NOT_ESTABLISHED', verifiable_consent_evidence_reference: null }, key()))).codes, ['status_requires_evidence']);
  const unknownChild = await ok(owner.call('/api/v1/admin/child-status-records', { subject_id: duplicate.id, child_status: 'UNKNOWN', basis: 'Age not collected.', evidence_reference: null, guardian_id: null, verifiable_consent: 'UNKNOWN', verifiable_consent_evidence_reference: null }, key()), S.schemas.ChildStatusView);
  check('an unknown status carries no restrictions: nothing is inferred', unknownChild.active_restrictions, []);
  check('established verifiable consent must name the guardian and its evidence', (await codes(owner.call('/api/v1/admin/child-status-records', { subject_id: person.id, child_status: 'CHILD', basis: 'Declared age with document.', evidence_reference: 'age-proof:1', guardian_id: null, verifiable_consent: 'ESTABLISHED', verifiable_consent_evidence_reference: null }, key()))).codes, ['established_consent_names_guardian_and_evidence']);
  const child = await ok(owner.call('/api/v1/admin/child-status-records', { subject_id: person.id, child_status: 'CHILD', basis: 'Declared age with document.', evidence_reference: 'age-proof:1', guardian_id: guardian.id, verifiable_consent: 'ESTABLISHED', verifiable_consent_evidence_reference: 'guardian-consent:1' }, key()), S.schemas.ChildStatusView);
  check('a recorded child carries the package\'s child restrictions', child.active_restrictions.map(r => r.requirement_id).sort(), ['DPDP-CHILD-NO-TRACKING', 'DPDP-CHILD-VERIFIABLE-CONSENT']);
  check('child status is sensitive: an organisation admin cannot read it', (await admin.call(`/api/v1/admin/data-principals/${person.id}/child-status`)).status, 403);
  check('a super admin reads the latest status', (await ok(owner.call(`/api/v1/admin/data-principals/${person.id}/child-status`), S.schemas.ChildStatusView)).id, child.id);
  check('a child status record cannot be rewritten', await db.query(`UPDATE app.child_status_records SET child_status='NOT_CHILD' WHERE id=$1`, [child.id]).then(() => 'ACCEPTED').catch((e: { code?: string }) => e.code), '23514');

  t.setPhase('safeguards and history');
  check('a safeguard cannot claim available evidence without citing it', (await admin.call('/api/v1/admin/security-safeguards', { kind: 'ENCRYPTION', description: 'Disk encryption.', control_reference: null, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: null }, key())).status, 400);
  const missing = await ok(admin.call('/api/v1/admin/security-safeguards', { kind: 'LOGGING_MONITORING', description: 'Access logging on the CRM.', control_reference: 'SEC-LOG-1', evidence_state: 'EVIDENCE_MISSING', evidence_reference: null }, key()), S.schemas.Safeguard);
  check('a safeguard without evidence is recorded as missing evidence, not as implemented', [missing.evidence_state, missing.evidence_reference], ['EVIDENCE_MISSING', null]);
  check('a safeguard record cannot be rewritten', await db.query(`UPDATE app.security_safeguards SET evidence_state='EVIDENCE_AVAILABLE' WHERE id=$1`, [missing.id]).then(() => 'ACCEPTED').catch((e: { code?: string }) => e.code), '23514');
  check('a reference cannot be rewritten', await db.query(`UPDATE app.data_principal_references SET target_reference='rewritten' WHERE subject_id=$1`, [person.id]).then(() => 'ACCEPTED').catch((e: { code?: string }) => e.code), '23514');
  check('a reference cannot be deleted', await db.query(`DELETE FROM app.data_principal_references WHERE subject_id=$1`, [person.id]).then(() => 'ACCEPTED').catch((e: { code?: string }) => e.code), '23514');

  t.setPhase('coverage and isolation');
  const measure = (c: ReturnType<typeof S.schemas.OperationsCoverage.parse>, d: string) => c.measures.find(m => m.dimension === d)!;
  const before = await ok(admin.call('/api/v1/admin/operations/coverage'), S.schemas.OperationsCoverage);
  await t.activity({ condition: 'UNRESOLVED', systems: [system.id] });
  const after = await ok(admin.call('/api/v1/admin/operations/coverage'), S.schemas.OperationsCoverage);
  const b = measure(before, 'ACTIVITY_CONDITION_RESOLVED'); const a = measure(after, 'ACTIVITY_CONDITION_RESOLVED');
  check('an activity with an unresolved condition widens the denominator without counting as resolved', [a.denominator - b.denominator, a.numerator - b.numerator], [1, 0]);
  check('coverage is a set of ratios and never a compliance score', [after.no_compliance_score, after.measures.every(m => m.numerator <= m.denominator)], [true, true]);
  check('another tenant cannot read this person', (await birch.call(`/api/v1/admin/data-principals/${person.id}`)).status, 404);
  const birchList = await birch.call(`/api/v1/admin/data-principals?system_id=${system.id}`);
  const birchItems = birchList.status === 200 ? ((await birchList.json()) as { items: unknown[] }).items.length : 0;
  check('another tenant sees none of these references', birchItems, 0);
});
