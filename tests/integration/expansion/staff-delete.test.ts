// Deleting a login (permanent suspension) through the real HTTP boundary.
// Under test: the confirmation must be exactly DELETE, checked by the API and by
// the database function; an administrator deletes a member, who is signed out,
// cannot sign in, cannot be reactivated, frees the seat, and whose address can be
// used again for a new login; the row and name stay listed; owner and
// administrator logins cannot be deleted through the member route, and the owner
// cannot delete their own login; members and auditors delete their own; another
// organisation can do nothing; each deletion is audited.
//
// Plays the vendor to sign a licence (vendor key from .local/vendor/signing/).
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { authenticatorCode } from '../../../shared/testing/src/http-fixture.ts';
import { operationsSuite, key } from '../../../shared/testing/src/operations-fixture.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';

const t = operationsSuite('staff-delete');
const { h, check, ok, codes, db } = t;
const Team = S.schemas.StaffTeam; const Created = S.schemas.StaffMemberCreated; const Member = S.schemas.StaffMember;
const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

await t.run(async () => {
  const owner = await h.login('owner'); const admin = await h.login('admin'); const member = await h.login('member'); const birch = await h.login('birch');
  const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id as string;
  const vendor = vendorSigningKey('licence');
  const teamOf = async () => ok(admin.call('/api/v1/admin/staff-members'), Team);
  const email = (label: string) => `${label}.${randomUUID().slice(0, 8)}@aster.example`;
  const create = async (role: 'MEMBER' | 'AUDITOR', address = email('del')) => ok(admin.call('/api/v1/admin/staff-members', { display_name: `Synthetic ${role.toLowerCase()} to delete`, email: address, role }, key()), Created, [201]);
  const del = (id: string, confirmation: unknown, who = admin) => who.call(`/api/v1/admin/staff-members/${id}/delete`, confirmation === undefined ? {} : { confirmation }, key());
  const signIn = async (address: string, password: string) => { const b = h.browser(); await h.authWindow(); const r = await b.call('/api/auth/staff/sign-in/email', { email: address, password, rememberMe: false }); return { b, status: r.status }; };
  // Sign a new login in and bring it to a usable state: replace the one-time password, and enrol an authenticator unless it is an auditor.
  const activate = async (made: { member: { email: string; role: string }; one_time_password: string }) => {
    const { b } = await signIn(made.member.email, made.one_time_password);
    const chosen = `Synthetic-${randomUUID()}`;
    await b.call('/api/auth/staff/change-password', { currentPassword: made.one_time_password, newPassword: chosen, revokeOtherSessions: false });
    if (made.member.role !== 'AUDITOR') {
      const enrolled = await (await b.call('/api/auth/staff/two-factor/enable', { password: chosen, method: 'totp' })).json() as { totpURI: string };
      await b.call('/api/auth/staff/two-factor/verify-totp', { code: authenticatorCode(enrolled.totpURI), trustDevice: false });
    }
    return { b, chosen };
  };
  const created: string[] = [];
  try {
    t.setPhase('setup');
    const used = (await teamOf()).seats.used;
    const claims = { licence_id: randomUUID(), edition: 'CONTROL', entitlements: ['PRIVACY_GRAPH'], installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION', valid_from: days(-1), valid_to: days(365), licensed_limits: { environments: 3, staff_members: 25, member_seats: used + 3 } };
    const signature = sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(vendor.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
    await ok(owner.call('/api/v1/admin/licences', { licence: { algorithm: 'Ed25519', claims, signing_key_id: vendor.key_id, signature } }, key()), S.schemas.LicenceState, [200, 201]);

    t.setPhase('the word DELETE, exactly');
    const a = await create('MEMBER'); created.push(a.member.id);
    const aSession = await activate(a);
    for (const wrong of ['delete', 'Delete', 'DELETE ', ' DELETE', 'DELET', '']) check(`"${wrong}" is not accepted`, (await del(a.member.id, wrong)).status, 400);
    check('no confirmation at all is not accepted', (await del(a.member.id, undefined)).status, 400);
    const client = await db.connect();
    try {
      await client.query('BEGIN'); await client.query('SET LOCAL ROLE orvia_app');
      const s = h.users.admin!.scope;
      await client.query(`SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true),set_config('orvia.actor_domain','STAFF',true),set_config('orvia.role','ORG_ADMIN',true),set_config('orvia.capabilities','staff.manage',true)`, [s.tenant_id, s.legal_entity_id, s.environment_id, h.users.admin!.id]);
      const dbWord = await client.query('SELECT app.staff_delete_login($1,$2)', [a.member.id, 'delete']).then(() => 'accepted', (e: { message?: string }) => e.message);
      check('the database function itself refuses anything but DELETE', dbWord, 'confirmation_required');
    } finally { await client.query('ROLLBACK').catch(() => {}); client.release(); }
    check('the member was not deleted by any of those attempts', (await teamOf()).members.find(m => m.id === a.member.id)?.deleted_at, null);

    t.setPhase('an administrator deletes a member');
    const before = (await teamOf()).seats.used;
    const gone = await ok(del(a.member.id, 'DELETE'), Member, [200]);
    check('the login is deleted and inactive, name and address kept on the list', [gone.active, gone.deleted_at !== null, gone.display_name, gone.email], [false, true, a.member.display_name, a.member.email]);
    check('the seat is freed', (await teamOf()).seats.used, before - 1);
    check('the deleted member is signed out at once', (await aSession.b.call('/api/auth/staff/orvia/password-state')).status, 401);
    check('the deleted member cannot sign in with their password', (await signIn(a.member.email, aSession.chosen)).status, 401);
    check('a deleted login cannot be reactivated', await codes(admin.call(`/api/v1/admin/staff-members/${a.member.id}/reactivate`, {}, key())), { status: 409, codes: ['login_deleted'] });
    check('a deleted login cannot be deleted twice', await codes(del(a.member.id, 'DELETE')), { status: 409, codes: ['already_deleted'] });
    const again = await create('MEMBER', a.member.email); created.push(again.member.id);
    check('the same address can be added again as a new login', [again.member.id !== a.member.id, again.member.email], [true, a.member.email]);

    t.setPhase('who may delete whom');
    const ownerRow = (await teamOf()).members.find(m => m.role === 'ORG_SUPER_ADMIN')!;
    const adminRow = (await teamOf()).members.find(m => m.id === h.users.admin!.id)!;
    check('the owner cannot be deleted through the member route', await codes(del(ownerRow.id, 'DELETE')), { status: 409, codes: ['owner_and_administrator_are_managed_by_protected_setup'] });
    check('an administrator is not deleted through the member route', await codes(del(adminRow.id, 'DELETE', owner)), { status: 409, codes: ['owner_and_administrator_are_managed_by_protected_setup'] });
    check('an administrator deletes their own login only through My login', await codes(del(adminRow.id, 'DELETE')), { status: 409, codes: ['use_delete_my_login'] });
    check('a member cannot delete another login', (await del(again.member.id, 'DELETE', member)).status, 403);
    check('the owner cannot delete their own login', (await owner.call('/api/v1/admin/my-login/delete', { confirmation: 'DELETE' }, key())).status, 403);
    check('another organisation cannot delete this organisation\'s member', (await del(again.member.id, 'DELETE', birch)).status, 404);

    t.setPhase('people delete their own login');
    const auditorMade = await create('AUDITOR'); created.push(auditorMade.member.id);
    const auditorSession = await activate(auditorMade);
    check('self-deletion also needs the exact word', (await auditorSession.b.call('/api/v1/admin/my-login/delete', { confirmation: 'delete' }, key())).status, 400);
    const own = await auditorSession.b.call('/api/v1/admin/my-login/delete', { confirmation: 'DELETE' }, key());
    check('an auditor deletes their own login and is signed out', [own.status, (await own.json() as { signed_out?: boolean }).signed_out, (await auditorSession.b.call('/api/auth/staff/orvia/password-state')).status], [200, true, 401]);
    const memberSession = await activate(again);
    check('a member with an authenticator deletes their own login', (await memberSession.b.call('/api/v1/admin/my-login/delete', { confirmation: 'DELETE' }, key())).status, 200);
    const listed = (await teamOf()).members;
    check('both self-deleted logins are listed as deleted', [listed.find(m => m.id === auditorMade.member.id)?.deleted_at !== null, listed.find(m => m.id === again.member.id)?.deleted_at !== null], [true, true]);

    t.setPhase('audit');
    const ops = (await db.query(`SELECT DISTINCT operation FROM app.audit_events WHERE resource_id = ANY($1) AND operation IN ('staff_member.delete','staff_login.delete_own')`, [created])).rows.map(r => r.operation).sort();
    check('deletion by an administrator and self-deletion are both audited', ops, ['staff_login.delete_own', 'staff_member.delete']);
  } finally {
    for (const id of created) await admin.call(`/api/v1/admin/staff-members/${id}/deactivate`, {}, key()).catch(() => {});
  }
});
