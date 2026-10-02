import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as V from '../../../../shared/contracts/src/vendor-audit.ts';
import { canonicalJson } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { hashPassword } from '../../../auth/src/bootstrap-password.ts';
import { authHandler } from '../../../auth/src/server.ts';
import { vendorSigningKey } from '../../../../scripts/credentials.ts';
import { vaultKeyFrom } from '../../../vendor/audit/vault.ts';
import * as S from '../../../vendor/audit/service.ts';
import * as CH from '../../../vendor/audit/channel.ts';
import * as P from '../../../vendor/audit/practice.ts';
import { CHANNEL_HEADERS, MAX_CHANNEL_BODY_BYTES } from '../../../../shared/contracts/src/audit-channel.ts';
import { vendorRuntime, type VendorRuntime } from './runtime.ts';
import { vendorActorFor, requireVendorCapability, vendorTransaction, vendorSafeRoute, jsonBody, parseWith, type VendorActor } from './authority.ts';

/**
 * HTTP surface of the vendor area (/api/v1/vendor/*, /api/auth/vendor/*,
 * /api/auth/account/*), served only by the vendor's VENDOR_SERVICE
 * installation. Each route names the capability it needs; the actor is
 * derived server-side from the session, checked locally and by the vendor
 * policy, then bound into the database transaction for row-level security.
 * Writes carry an Idempotency-Key and are replayed from the durable record.
 */
type Handler = (c: S.Ctx, id: string | undefined, input: unknown, url: URL, keys: S.Keys) => Promise<unknown>;
type Route = { method: 'GET' | 'POST'; path: string; capability: string; handler: Handler; idempotent?: boolean; body?: number };
const R = (method: 'GET' | 'POST', path: string, capability: string, handler: Handler, extra: Partial<Route> = {}): Route => ({ method, path, capability, handler, idempotent: method === 'POST', ...extra });
const routes: Route[] = [
  R('GET', '/team', 'vendor.team.read', c => S.team(c)),
  R('POST', '/team', 'vendor.team.manage', (c, _, i) => S.createMember(c, i)),
  R('POST', '/team/{id}/deactivate', 'vendor.team.manage', (c, id) => S.setMemberActive(c, id!, false)),
  R('POST', '/team/{id}/reactivate', 'vendor.team.manage', (c, id) => S.setMemberActive(c, id!, true)),
  R('POST', '/team/{id}/delete', 'vendor.team.manage', (c, id, i) => S.deleteMember(c, id!, i)),
  R('POST', '/team/{id}/setup-code', 'vendor.team.manage', (c, id, i) => S.issueSetupCode(c, id!, i)),
  R('POST', '/team/{id}/password', 'vendor.team.manage', (c, id, i) => S.setMemberPassword(c, id!, i)),
  R('GET', '/organisations', 'organisations.read', c => S.organisationList(c)),
  R('POST', '/organisations', 'organisations.manage', (c, _, i) => S.createOrganisation(c, i)),
  R('GET', '/organisations/{id}', 'organisations.read', (c, id) => S.organisation(c, id!)),
  R('POST', '/organisations/{id}/contacts', 'organisations.manage', (c, id, i) => S.addContact(c, id!, i)),
  R('POST', '/organisations/{id}/accounts', 'organisations.manage', (c, id, i) => S.createClientAccount(c, id!, i)),
  R('POST', '/licences', 'licences.issue', (c, _, i, __, k) => S.issueOrganisationLicence(c, i, k)),
  R('GET', '/engagements', 'engagements.read', c => S.engagementList(c)),
  R('POST', '/engagements', 'engagements.manage', (c, _, i, __, k) => S.createEngagement(c, i, k)),
  R('GET', '/overview', 'vendor.overview.read', c => CH.overview(c)),
  R('GET', '/engagements/{id}/channel', 'audit.fieldwork', (c, id) => CH.channelView(c, id!)),
  R('POST', '/engagements/{id}/channel/requests', 'audit.fieldwork', (c, id, i, __, k) => CH.createChannelRequest(c, id!, i, k)),
  R('POST', '/channel-requests/{id}/withdraw', 'audit.fieldwork', (c, id) => CH.withdrawChannelRequest(c, id!)),
  R('GET', '/channel-deliveries/{id}', 'audit.fieldwork', (c, id) => CH.channelDelivery(c, id!)),
  R('GET', '/engagements/{id}', 'engagements.read', (c, id) => S.engagement(c, id!)),
  R('POST', '/engagements/{id}/team', 'engagements.manage', (c, id, i) => S.addTeamMember(c, id!, i)),
  R('POST', '/engagements/{id}/independence', 'audit.fieldwork', (c, id, i) => S.declareIndependence(c, id!, i)),
  R('POST', '/engagements/{id}/processing-agreement', 'engagements.manage', (c, id, i) => S.recordProcessingAgreement(c, id!, i)),
  R('POST', '/engagements/{id}/close', 'engagements.manage', (c, id) => S.closeEngagement(c, id!)),
  R('GET', '/engagements/{id}/inbox', 'audit.fieldwork', (c, id) => S.inbox(c, id!)),
  R('GET', '/engagements/{id}/checklist', 'audit.fieldwork', (c, id) => S.checklist(c, id!)),
  R('POST', '/engagements/{id}/results', 'audit.fieldwork', (c, id, i) => P.recordPracticeResult(c, id!, i)),
  R('GET', '/engagements/{id}/findings', 'audit.fieldwork', (c, id) => S.findings(c, id!)),
  R('POST', '/engagements/{id}/findings', 'audit.fieldwork', (c, id, i) => P.createPracticeFinding(c, id!, i), { body: 65536 }),
  R('POST', '/engagements/{id}/requests', 'audit.fieldwork', (c, id, i) => P.createPracticeRequest(c, id!, i)),
  R('POST', '/engagements/{id}/requests/export', 'audit.fieldwork', (c, id, _, __, k) => S.exportRequests(c, id!, k)),
  R('POST', '/engagements/{id}/findings/export', 'audit.fieldwork', (c, id, _, __, k) => S.exportFindings(c, id!, k)),
  R('GET', '/engagements/{id}/reports', 'audit.fieldwork', (c, id) => S.reports(c, id!)),
  R('POST', '/engagements/{id}/reports', 'audit.report.draft', (c, id, i) => P.draftPracticeReport(c, id!, i), { body: 65536 }),
  R('GET', '/engagements/{id}/access-log', 'audit.fieldwork', (c, id) => S.accessLog(c, id!)),
  R('POST', '/findings/{id}/events', 'audit.fieldwork', (c, id, i) => S.recordFindingEvent(c, id!, i)),
  R('GET', '/packages/{id}', 'audit.fieldwork', (c, id) => S.packageDetail(c, id!)),
  R('GET', '/packages/{id}/content', 'audit.fieldwork', (c, id, _, url, k) => { const item = url.searchParams.get('item') ?? ''; if (!/^[0-9a-f-]{36}$/.test(item)) throw new AccessError(400, 'VALIDATION_ERROR'); return S.itemContent(c, id!, item, k); }),
  R('POST', '/packages/{id}/reviews', 'audit.fieldwork', (c, id, i) => S.reviewItem(c, id!, i)),
  R('POST', '/reports/{id}/approve', 'audit.report.approve', (c, id) => P.approvePracticeReport(c, id!)),
  R('POST', '/reports/{id}/sign', 'audit.fieldwork', (c, id, _, __, k) => P.signPracticeReport(c, id!, k)),
  R('GET', '/reports/{id}/pdf', 'audit.fieldwork', (c, id) => S.reportPdf(c, id!)),
  R('POST', '/retention/sweep', 'engagements.manage', c => S.retentionSweep(c)),
  R('GET', '/support-cases', 'support.read', c => S.supportCases(c)),
  R('POST', '/support-cases', 'support.manage', (c, _, i) => S.createSupportCase(c, i)),
  R('GET', '/uploads', 'packages.upload', c => S.ownUploads(c)),
  // Audit practice (task AUDIT-PRACTICE-01)
  R('GET', '/practice', 'engagements.read', (c, _, __, ___, k) => P.practiceState(c, k)),
  R('POST', '/practice/criteria', 'practice.manage', (c, _, i) => P.recordCriteriaFixture(c, i)),
  R('POST', '/practice/criteria/production', 'practice.manage', (c, _, i, __, k) => P.recordProductionCriteria(c, i, k), { body: 1048576 }),
  R('GET', '/criteria/{id}/evidence', 'engagements.read', (c, id) => P.criteriaEvidence(c, id!)),
  R('POST', '/criteria/{id}/approve', 'practice.approve', (c, id, i) => P.approveCriteria(c, id!, i)),
  R('POST', '/practice/methodologies', 'practice.manage', (c, _, i) => P.recordMethodology(c, i), { body: 65536 }),
  R('POST', '/methodologies/{id}/approve', 'practice.approve', (c, id) => P.approveMethodology(c, id!)),
  R('POST', '/practice/activations', 'practice.activate', (c, _, i, __, k) => P.recordActivation(c, i, k)),
  R('GET', '/engagements/{id}/file', 'engagements.read', (c, id) => P.engagementFile(c, id!)),
  R('POST', '/engagements/{id}/configure', 'engagements.manage', (c, id, i) => P.configureEngagement(c, id!, i)),
  R('POST', '/engagements/{id}/acceptance', 'engagements.manage', (c, id, i) => P.prepareAcceptance(c, id!, i), { body: 65536 }),
  R('POST', '/engagements/{id}/acceptance/decide', 'engagement.accept', (c, id, i) => P.decideAcceptance(c, id!, i)),
  R('POST', '/engagements/{id}/conflicts', 'engagements.read', (c, id, i) => P.recordConflict(c, id!, i)),
  R('POST', '/conflicts/{id}/review', 'engagement.accept', (c, id, i) => P.reviewConflict(c, id!, i)),
  R('POST', '/engagements/{id}/understanding', 'audit.fieldwork', (c, id, i) => P.recordUnderstanding(c, id!, i), { body: 131072 }),
  R('POST', '/understanding/{id}/review', 'audit.fieldwork', (c, id) => P.reviewUnderstanding(c, id!)),
  R('POST', '/engagements/{id}/applicability', 'audit.fieldwork', (c, id, i) => P.recordApplicability(c, id!, i), { body: 32768 }),
  R('POST', '/applicability/{id}/review', 'audit.fieldwork', (c, id) => P.reviewApplicability(c, id!)),
  R('POST', '/engagements/{id}/scope', 'audit.fieldwork', (c, id, i) => P.proposeScope(c, id!, i), { body: 131072 }),
  R('POST', '/scope/{id}/approve', 'audit.fieldwork', (c, id) => P.approveScope(c, id!)),
  R('POST', '/engagements/{id}/risks', 'audit.fieldwork', (c, id, i) => P.assessRisk(c, id!, i), { body: 32768 }),
  R('POST', '/risks/{id}/review', 'audit.fieldwork', (c, id) => P.reviewRisk(c, id!)),
  R('POST', '/engagements/{id}/procedures', 'audit.fieldwork', (c, id, i) => P.addProcedure(c, id!, i), { body: 32768 }),
  R('POST', '/procedures/{id}/not-performed', 'audit.fieldwork', (c, id, i) => P.procedureNotPerformed(c, id!, i)),
  R('POST', '/engagements/{id}/plan/approve', 'audit.fieldwork', (c, id) => P.approvePlan(c, id!)),
  R('POST', '/engagements/{id}/evidence', 'audit.fieldwork', (c, id, i) => P.registerEvidence(c, id!, i)),
  R('POST', '/evidence/{id}/evaluations', 'audit.fieldwork', (c, id, i) => P.evaluateEvidence(c, id!, i)),
  R('POST', '/requests/{id}/events', 'audit.fieldwork', (c, id, i) => P.recordRequestEvent(c, id!, i)),
  R('POST', '/procedures/{id}/populations', 'audit.fieldwork', (c, id, i) => P.recordPopulation(c, id!, i)),
  R('POST', '/procedures/{id}/working-papers', 'audit.fieldwork', (c, id, i) => P.recordWorkingPaper(c, id!, i), { body: 131072 }),
  R('POST', '/working-papers/{id}/notes', 'audit.fieldwork', (c, id, i) => P.raiseReviewNote(c, id!, i)),
  R('POST', '/review-notes/{id}/respond', 'audit.fieldwork', (c, id, i) => P.respondReviewNote(c, id!, i)),
  R('POST', '/review-notes/{id}/resolve', 'audit.fieldwork', (c, id) => P.resolveReviewNote(c, id!)),
  R('POST', '/working-papers/{id}/review', 'audit.fieldwork', (c, id) => P.reviewWorkingPaper(c, id!)),
  R('POST', '/findings/{id}/responses', 'audit.fieldwork', (c, id, i) => P.recordManagementResponse(c, id!, i), { body: 32768 }),
  R('POST', '/findings/{id}/retests', 'audit.fieldwork', (c, id, i) => P.recordRetest(c, id!, i)),
  R('POST', '/findings/{id}/risk-acceptances', 'audit.fieldwork', (c, id, i) => P.recordRiskAcceptance(c, id!, i)),
  R('POST', '/findings/{id}/close', 'audit.fieldwork', (c, id, i) => P.closeFinding(c, id!, i)),
  R('POST', '/engagements/{id}/holds', 'practice.activate', (c, id, i) => P.authoriseHold(c, id!, i)),
  R('POST', '/holds/{id}/release', 'practice.activate', (c, id, i) => P.releaseHold(c, id!, i)),
];
const BASE = '/api/v1/vendor';

function match(method: string, path: string) {
  const parts = path.slice(BASE.length).split('/');
  for (const route of routes) {
    if (route.method !== method) continue;
    const template = route.path.split('/'); if (template.length !== parts.length) continue;
    let id: string | undefined; let ok = true;
    template.forEach((t, i) => { if (t === '{id}') id = parts[i]; else if (t !== parts[i]) ok = false; });
    if (ok) { if (id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new AccessError(400, 'VALIDATION_ERROR'); return { route, id }; }
  }
  throw new AccessError(404, 'NOT_FOUND');
}

let cachedKeys: S.Keys | undefined;
function keys(r: VendorRuntime): S.Keys {
  return cachedKeys ??= { vault: vaultKeyFrom(readFileSync(resolve(r.config.directory, 'auth', 'vault-key'), 'utf8').trim()),
    audit: () => vendorSigningKey('audit'), licence: () => vendorSigningKey('licence'), release: () => vendorSigningKey('release') };
}
const toCtx = (tx: S.Ctx['tx'], actor: VendorActor, requestId: string): S.Ctx => ({ tx, requestId, actor: { actor_id: actor.actor_id, actor_domain: actor.actor_domain, role: actor.role, organisation_id: actor.organisation_id } });

async function idempotent(c: S.Ctx, operation: string, key: string, input: unknown, run: () => Promise<unknown>) {
  const digest = createHash('sha256').update(canonicalJson(input ?? {})).digest('hex');
  const existing = (await c.tx.query('SELECT digest, response FROM vendor.idempotency_records WHERE actor_id=$1 AND operation=$2 AND key=$3', [c.actor.actor_id, operation, key])).rows[0];
  if (existing) { if (existing.digest !== digest) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT'); return existing.response; }
  const result = await run();
  await c.tx.query('INSERT INTO vendor.idempotency_records (actor_id, operation, key, digest, response) VALUES ($1,$2,$3,$4,$5)', [c.actor.actor_id, operation, key, digest, JSON.stringify(result)]);
  return result;
}

export function createVendorHandler(getRuntime: () => VendorRuntime = vendorRuntime) {
  return (request: Request) => vendorSafeRoute(async requestId => {
    const url = new URL(request.url); const r = getRuntime();
    if (url.pathname === `${BASE}/setup`) return setup(request, r);
    if (url.pathname === `${BASE}/account-setup`) return accountSetup(request, r);
    if (url.pathname === `${BASE}/session`) { const actor = await vendorActorFor(request, r); return Response.json(V.VendorSession.parse({ actor_domain: actor.actor_domain, actor_id: actor.actor_id, role: actor.role, capabilities: actor.capabilities, organisation_id: actor.organisation_id, name: actor.name, email: actor.email, expires_at: actor.expires_at })); }
    if (url.pathname === `${BASE}/uploads` && request.method === 'POST') return upload(request, r, requestId);
    if (url.pathname.startsWith(`${BASE}/channel/`)) return channel(request, url, r);
    const { route, id } = match(request.method, url.pathname);
    const actor = await vendorActorFor(request, r);
    await requireVendorCapability(r.config, actor, route.capability);
    let input: unknown;
    if (request.method === 'POST') input = await jsonBody(request, r.config, route.body ?? 16384);
    const key = request.headers.get('idempotency-key');
    if (route.idempotent && (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key))) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'idempotency-key', code: 'required' }]);
    const result = await vendorTransaction(r.pool, actor, async tx => {
      // The actor is re-derived inside the transaction: a login deactivated meanwhile cannot finish the request.
      const current = await vendorActorFor(request, r);
      if (current.actor_id !== actor.actor_id || current.role !== actor.role) throw new AccessError(403, 'FORBIDDEN');
      const c = toCtx(tx, current, requestId);
      const run = () => route.handler(c, id, input, url, keys(r));
      return route.idempotent ? idempotent(c, `${route.method} ${route.path}`, key!, { id: id ?? null, input: input ?? null }, run) : run();
    });
    return Response.json(result, { status: request.method === 'POST' && /^\/(team|organisations|engagements|licences|support-cases)$/.test(route.path) ? 201 : 200 });
  }, 'VENDOR', getRuntime);
}

const MAX_UPLOAD = 64 * 1024 * 1024;
async function upload(request: Request, r: VendorRuntime, requestId: string) {
  const actor = await vendorActorFor(request, r);
  await requireVendorCapability(r.config, actor, 'packages.upload');
  if (request.headers.get('origin') !== new URL(r.config.origin).origin) throw new AccessError(403, 'FORBIDDEN');
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/vnd.orvia.audit-package+json') throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'content-type', code: 'package_file_required' }]);
  const code = request.headers.get('x-orvia-engagement-code') ?? '';
  if (!/^[A-Za-z2-9]{5}(-[A-Za-z2-9]{5}){3}$/.test(code)) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'engagement_code', code: 'invalid_format' }]);
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_UPLOAD) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'package', code: 'too_large' }]);
  const bytes = await boundedBytes(request, MAX_UPLOAD);
  if (!bytes) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'package', code: 'too_large' }]);
  const result = await vendorTransaction(r.pool, actor, tx => S.receivePackage(toCtx(tx, actor, requestId), code, bytes, keys(r)));
  return Response.json(result, { status: result.outcome === 'REFUSED' ? 422 : 201 });
}
/**
 * Audit mandate channel (revision 1.6): called by a client installation's background worker, never by a browser.
 * No session or cookie is accepted; the HMAC over the body with the engagement's channel key is the authentication.
 */
async function channel(request: Request, url: URL, r: VendorRuntime) {
  const kind = url.pathname.slice(`${BASE}/channel/`.length);
  if (request.method !== 'POST' || !['check-in', 'deliveries', 'packages', 'responses'].includes(kind)) throw new AccessError(404, 'NOT_FOUND');
  if (request.headers.has('cookie') || request.headers.has('authorization')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_session_credentials_accepted' }]);
  const maximum = kind === 'packages' ? MAX_UPLOAD : MAX_CHANNEL_BODY_BYTES;
  if (Number(request.headers.get('content-length') ?? '0') > maximum) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'body', code: 'too_large' }]);
  const body = await boundedBytes(request, maximum);
  if (!body) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'body', code: 'too_large' }]);
  const result = await CH.channelCall(r.pool, keys(r), { kind: kind as 'check-in' | 'deliveries' | 'packages' | 'responses', digest: request.headers.get(CHANNEL_HEADERS.engagement),
    timestamp: request.headers.get(CHANNEL_HEADERS.timestamp), signature: request.headers.get(CHANNEL_HEADERS.signature), contentType: request.headers.get('content-type')?.split(';')[0] ?? null, body });
  return Response.json(result.body, { status: result.status });
}
async function boundedBytes(request: Request, maximum: number) {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); return null; } chunks.push(value); }
  return Buffer.concat(chunks);
}

export const setupCodeDigest = (code: string) => createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, ''), 'utf8').digest('hex');
async function setup(request: Request, r: VendorRuntime) {
  if (request.method === 'GET') return Response.json(V.VendorFirstRunState.parse({ state: (await r.pool.query('SELECT vendor.first_run_state() AS s')).rows[0]!.s }));
  if (request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
  if (request.headers.has('cookie') || request.headers.has('authorization')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_credentials_accepted' }]);
  const v = parseWith(V.VendorFirstRunSetup, await jsonBody(request, r.config, 8192));
  const ownerId = randomUUID(); const adminId = randomUUID();
  const [ownerHash, adminHash] = await Promise.all([hashPassword(v.owner.password), hashPassword(v.admin.password)]);
  let accepted: boolean;
  try { accepted = (await r.pool.query('SELECT vendor.first_run_complete($1,$2,$3,$4,$5,$6,$7,$8,$9) AS ok', [setupCodeDigest(v.setup_code), ownerId, v.owner.name, v.owner.email, ownerHash, adminId, v.admin.name, v.admin.email, adminHash])).rows[0].ok; }
  catch (error) { const e = error as { code?: string; message?: string; hint?: string }; if (e.code === 'P0001') throw new AccessError(409, 'VALIDATION_ERROR', [{ field: e.hint ?? 'setup', code: e.message ?? 'refused' }]); throw error; }
  if (!accepted) throw new AccessError(403, 'FORBIDDEN', [{ field: 'setup_code', code: 'setup_code_not_accepted' }]);
  return Response.json({ completed: true, sign_in: '/vendor/sign-in', next_steps: ['Sign in as the vendor super administrator and set up your authenticator.', 'Give the vendor administrator their password privately; they set up their own authenticator at first sign-in.'] }, { status: 201 });
}

/**
 * Revision 1.13: a member sets their first password (or a reset password) with the one-time code an administrator gave
 * them. Unauthenticated by design; the code is the proof. Wrong codes count towards a lock of five; the refusal never says
 * whether the email exists.
 */
async function accountSetup(request: Request, r: VendorRuntime) {
  if (request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
  if (request.headers.has('cookie') || request.headers.has('authorization')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_credentials_accepted' }]);
  const v = parseWith(V.VendorAccountSetup, await jsonBody(request, r.config, 4096));
  const accepted = (await r.pool.query('SELECT vendor.complete_account_setup($1,$2,$3) AS ok', [v.email, setupCodeDigest(v.setup_code), await hashPassword(v.new_password)])).rows[0].ok === true;
  if (!accepted) throw new AccessError(403, 'FORBIDDEN', [{ field: 'setup_code', code: 'setup_code_not_accepted' }]);
  return Response.json({ completed: true, sign_in: '/vendor/sign-in', next_steps: ['Sign in with your work email and the password you just set, then set up your authenticator.'] });
}

export const vendorRoute = createVendorHandler();
export const vendorAuthRoute = (request: Request) => vendorSafeRoute(async requestId => { const r = vendorRuntime(); return authHandler(r.vendor, r.config, request, requestId); }, 'AUTH_VENDOR');
export const accountAuthRoute = (request: Request) => vendorSafeRoute(async requestId => { const r = vendorRuntime(); return authHandler(r.account, r.config, request, requestId); }, 'AUTH_ACCOUNT');
