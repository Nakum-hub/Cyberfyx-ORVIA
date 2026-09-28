// Organisation member logins limited by the signed licence, through the real HTTP boundary.
// Under test: only owner/administrator can see or manage the team; a licence that
// states no member seats allows no member; the seat count excludes owner and
// administrator logins and is enforced on creation and reactivation, including
// under concurrency; only MEMBER and AUDITOR can be created and owner/administrator
// logins cannot be deactivated here; a new login has no authority until it has
// replaced its one-time password (then still needs its authenticator); a
// deactivated login loses its session; another organisation sees and changes
// nothing; the application role cannot write the identity store directly.
//
// This test plays the vendor to sign licences, using the vendor licence key from
// .local/vendor/signing/licence.json. The application it starts never holds it.
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';

const t = operationsSuite('staff-members');
const { h, check, ok, codes, db } = t;
const Team = S.schemas.StaffTeam; const Created = S.schemas.StaffMemberCreated; const Member = S.schemas.StaffMember;
const vendor = vendorSigningKey('licence');
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

await t.run(async () => {
  const owner = await h.login('owner'); const admin = await h.login('admin'); const member = await h.login('member'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id as string;
  const licence = (limits: Record<string, number>) => {
    const claims = { licence_id: randomUUID(), edition: 'CONTROL', entitlements: ['PRIVACY_GRAPH'], installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION', valid_from: days(-1), valid_to: days(365), licensed_limits: limits };
    return { licence: { algorithm: 'Ed25519', claims, signing_key_id: vendor.key_id, signature: sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(vendor.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url') } };
  };
  const importLicence = async (limits: Record<string, number>) => ok(owner.call('/api/v1/admin/licences', licence(limits), key()), S.schemas.LicenceState, [200, 201]);
  const teamOf = async (who = admin) => ok(who.call('/api/v1/admin/staff-members'), Team);
  const email = (label: string) => `${label}.${randomUUID().slice(0, 8)}@aster.example`;
  const create = (role: 'MEMBER' | 'AUDITOR', who = admin, label = 'new') => who.call('/api/v1/admin/staff-members', { display_name: `Synthetic ${label}`, email: email(label), role }, key());
  const created: string[] = [];

  try {
    t.setPhase('who may manage the team');
    check('a member cannot see the team', (await member.call('/api/v1/admin/staff-members')).status, 403);
    check('an auditor cannot see the team', (await auditor.call('/api/v1/admin/staff-members')).status, 403);
    let team = await teamOf(owner);
    check('the owner sees the team with owner and administrator not counted', [team.members.some(m => m.role === 'ORG_SUPER_ADMIN' && !m.counts_against_seats), team.members.some(m => m.role === 'ORG_ADMIN' && !m.counts_against_seats)], [true, true]);

    t.setPhase('a licence must state member seats');
    await importLicence({ environments: 3, staff_members: 25 });
    team = await teamOf();
    check('a licence without member seats allows no member', [team.seats.licence_state, team.seats.available], ['NO_MEMBER_SEATS', 0]);
    check('creation is refused while the licence states no seats', await codes(create('MEMBER')), { status: 409, codes: ['no_member_seats'] });

    t.setPhase('seats are enforced');
    const used = team.seats.used;
    await importLicence({ environments: 3, staff_members: 25, member_seats: used + 2 });
    team = await teamOf();
    check('the signed seat limit is in force', [team.seats.licence_state, team.seats.licensed, team.seats.available], ['ACTIVE', used + 2, 2]);
    const first = await ok(create('MEMBER', admin, 'first'), Created, [201]);
    created.push(first.member.id);
    check('an administrator creates a member who must change the one-time password', [first.member.role, first.member.must_change_password, first.member.counts_against_seats, first.one_time_password.length >= 24, first.seats.available], ['MEMBER', true, true, true, 1]);
    const second = await ok(create('AUDITOR', owner, 'second'), Created, [201]);
    created.push(second.member.id);
    check('the owner creates an auditor, using the last seat', second.seats.available, 0);
    check('a member beyond the licence is refused', await codes(create('MEMBER')), { status: 409, codes: ['seat_limit_reached'] });
    check('an administrator role cannot be created here', (await admin.call('/api/v1/admin/staff-members', { display_name: 'Synthetic admin', email: email('admin'), role: 'ORG_ADMIN' }, key())).status, 400);
    check('an owner role cannot be created here', (await admin.call('/api/v1/admin/staff-members', { display_name: 'Synthetic owner', email: email('owner'), role: 'ORG_SUPER_ADMIN' }, key())).status, 400);

    t.setPhase('deactivation frees a seat; reactivation is checked');
    const firstUser = h.browser();
    check('the new member can sign in with the one-time password', (await firstUser.call('/api/auth/staff/sign-in/email', { email: first.member.email, password: first.one_time_password, rememberMe: false })).status, 200);
    let off = await ok(admin.call(`/api/v1/admin/staff-members/${first.member.id}/deactivate`, {}, key()), Member, [200]);
    check('a deactivated member is inactive and its session is gone', [off.active, (await firstUser.call('/api/auth/staff/orvia/password-state')).status], [false, 401]);
    const returning = h.browser(); await h.authWindow();
    await returning.call('/api/auth/staff/sign-in/email', { email: first.member.email, password: first.one_time_password, rememberMe: false });
    check('a deactivated member gets no workspace authority even with the right password', (await returning.call('/api/v1/admin/overview')).status, 403);
    check('deactivating twice is refused', await codes(admin.call(`/api/v1/admin/staff-members/${first.member.id}/deactivate`, {}, key())), { status: 409, codes: ['already_inactive'] });
    const third = await ok(create('MEMBER', admin, 'third'), Created, [201]);
    created.push(third.member.id);
    check('the freed seat is reused', third.seats.available, 0);
    check('reactivation beyond the licence is refused', await codes(admin.call(`/api/v1/admin/staff-members/${first.member.id}/reactivate`, {}, key())), { status: 409, codes: ['seat_limit_reached'] });
    await ok(admin.call(`/api/v1/admin/staff-members/${third.member.id}/deactivate`, {}, key()), Member, [200]);
    off = await ok(admin.call(`/api/v1/admin/staff-members/${first.member.id}/reactivate`, {}, key()), Member, [200]);
    check('reactivation within the licence is allowed', off.active, true);
    const ownerRow = (await teamOf()).members.find(m => m.role === 'ORG_SUPER_ADMIN')!;
    check('the owner cannot be deactivated here', await codes(admin.call(`/api/v1/admin/staff-members/${ownerRow.id}/deactivate`, {}, key())), { status: 409, codes: ['owner_and_administrator_are_managed_by_protected_setup'] });

    t.setPhase('concurrent creation cannot pass the limit');
    await ok(admin.call(`/api/v1/admin/staff-members/${second.member.id}/deactivate`, {}, key()), Member, [200]);
    check('with a seat free, an address already in use is refused as such', await codes(admin.call('/api/v1/admin/staff-members', { display_name: 'Synthetic duplicate', email: second.member.email.toUpperCase(), role: 'MEMBER' }, key())), { status: 409, codes: ['email_in_use'] });
    const race = await Promise.all([create('MEMBER', admin, 'race'), create('MEMBER', owner, 'race')]);
    for (const r of race) if (r.status === 201) created.push(((await r.clone().json()) as { member: { id: string } }).member.id);
    check('two simultaneous creations for one seat: exactly one succeeds', race.map(r => r.status).sort(), [201, 409]);
    team = await teamOf();
    check('active members never exceed the licence', [team.seats.used <= (team.seats.licensed ?? 0), team.seats.available], [true, 0]);

    t.setPhase('first sign-in: replace the one-time password');
    const fresh = await ok(admin.call(`/api/v1/admin/staff-members/${first.member.id}/deactivate`, {}, key()).then(() => create('MEMBER', admin, 'fresh')), Created, [201]);
    created.push(fresh.member.id);
    const newcomer = h.browser();
    await h.authWindow();
    check('the newcomer signs in with the one-time password', (await newcomer.call('/api/auth/staff/sign-in/email', { email: fresh.member.email, password: fresh.one_time_password, rememberMe: false })).status, 200);
    check('the newcomer is told to replace the password', await (await newcomer.call('/api/auth/staff/orvia/password-state')).json(), { must_change_password: true });
    check('no workspace authority before the password is replaced', await codes(newcomer.call('/api/v1/admin/overview')), { status: 403, codes: ['password_change_required'] });
    const chosen = `Synthetic-${randomUUID()}`;
    check('a wrong current password does not change it', (await newcomer.call('/api/auth/staff/change-password', { currentPassword: 'not-the-password-at-all', newPassword: chosen })).ok, false);
    check('the password is replaced', (await newcomer.call('/api/auth/staff/change-password', { currentPassword: fresh.one_time_password, newPassword: chosen, revokeOtherSessions: false })).status, 200);
    check('the flag is cleared', await (await newcomer.call('/api/auth/staff/orvia/password-state')).json(), { must_change_password: false });
    const afterChange = await codes(newcomer.call('/api/v1/admin/overview'));
    check('workspace access still requires the authenticator', [afterChange.status, afterChange.codes.includes('password_change_required')], [403, false]);
    await h.authWindow();
    check('the one-time password no longer works', (await h.browser().call('/api/auth/staff/sign-in/email', { email: fresh.member.email, password: fresh.one_time_password, rememberMe: false })).status, 401);

    t.setPhase('isolation and audit');
    const birchTeam = await ok(birch.call('/api/v1/admin/staff-members'), Team);
    check('another organisation sees none of these members', birchTeam.members.some(m => created.includes(m.id)), false);
    check('another organisation cannot deactivate them', (await birch.call(`/api/v1/admin/staff-members/${fresh.member.id}/deactivate`, {}, key())).status, 404);
    const report = await ok(owner.call('/api/v1/admin/entitlements'), S.schemas.EntitlementReport);
    check('the licence report shows member seats as a counted limit', report.limit_usage.some(u => u.limit === 'MEMBER_SEATS' && u.licensed === used + 2 && u.within), true);
    const audited = (await db.query(`SELECT operation, count(*)::int n FROM app.audit_events WHERE resource_id = ANY($1) AND operation LIKE 'staff_member.%' GROUP BY 1 ORDER BY 1`, [created])).rows.map(r => r.operation);
    check('creation, deactivation and reactivation are audited', ['staff_member.create', 'staff_member.deactivate', 'staff_member.reactivate'].every(o => audited.includes(o)), true);
    const client = await db.connect();
    try {
      await client.query('BEGIN'); await client.query('SET LOCAL ROLE orvia_app');
      const direct = await client.query(`INSERT INTO staff_auth.authority(user_id,tenant_id,legal_entity_id,environment_id,role) VALUES($1,$1,$1,$1,'ORG_ADMIN')`, [randomUUID()]).then(() => 'accepted', (e: { code?: string }) => e.code);
      check('the application role cannot write the identity store directly', direct, '42501');
    } finally { await client.query('ROLLBACK').catch(() => {}); client.release(); }
    const noCaller = await db.query('SELECT app.staff_member_create($1,$2,$3,$4,$5)', [randomUUID(), email('direct'), 'Synthetic direct', 'MEMBER', 'x']).then(() => 'accepted', (e: { code?: string }) => e.code);
    check('the creation function refuses a caller without staff authority', noCaller, '42501');
  } finally {
    // Leave no seat taken, so reruns start from the same count.
    for (const id of created) await admin.call(`/api/v1/admin/staff-members/${id}/deactivate`, {}, key()).catch(() => {});
  }
});
