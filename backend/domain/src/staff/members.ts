import { randomBytes, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { hashPassword } from '../../../auth/src/bootstrap-password.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context } from '../shared/transaction.ts';
import { iso, refuse } from '../operations/shared.ts';

/**
 * Organisation member logins. An owner or administrator creates MEMBER and
 * AUDITOR logins for their own organisation, and deactivates or reactivates
 * them. How many may be active is the signed licence's member_seats; owner and
 * administrator logins are not counted. Every check that matters (caller scope,
 * role and capability, the seat count under a lock, the active unexpired
 * licence) is made inside the database functions of migration 0060, so a
 * second path around this module would meet the same refusals.
 *
 * A new login receives a one-time password, shown once to the administrator to
 * hand over and never stored in the clear. It carries no authority until its
 * holder has replaced it and enrolled an authenticator.
 */
type Row = QueryResultRow;
const memberView = (r: Row) => X.StaffMember.parse({ id: r.id, display_name: r.display_name, email: r.email, role: r.role, active: r.active, must_change_password: r.must_change_password,
  authenticator_enrolled: r.authenticator_enrolled, counts_against_seats: r.counts_against_seats, created_by: r.created_by, created_at: iso(r.created_at), deactivated_at: iso(r.deactivated_at), deleted_at: iso(r.deleted_at) });

/** Database refusals carry their code in the message and the field in the hint. */
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    const e = error as { code?: string; message?: string; hint?: string };
    if (e.code === '42501') throw new AccessError(403, 'FORBIDDEN');
    if (e.code === 'P0002') refuse(404, e.hint ?? 'id', 'not_found');
    if (e.code === 'P0001') refuse(409, e.hint ?? 'member', e.message ?? 'refused');
    throw error;
  }
}
async function seats(c: Context) {
  const s = (await c.tx.query('SELECT * FROM app.member_seats()')).rows[0]!;
  return X.MemberSeats.parse({ licence_state: s.licence_state, licensed: s.licensed, used: s.used, available: s.licensed === null ? 0 : Math.max(0, s.licensed - s.used) });
}
async function member(c: Context, id: string) {
  const r = (await c.tx.query('SELECT * FROM app.staff_member_list() WHERE id=$1', [id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return memberView(r);
}

export async function team(c: Context) {
  return guarded(async () => X.StaffTeam.parse({
    seats: await seats(c), members: (await c.tx.query('SELECT * FROM app.staff_member_list()')).rows.map(memberView),
    limits: ['Owner and administrator logins are created by the protected local setup and are not counted against member seats.',
      'Member seats come from the vendor-signed licence imported into this installation; they cannot be raised here.'],
  }));
}
export async function createMember(c: Context, input: unknown) {
  const v = X.StaffMemberCreate.parse(input);
  const id = randomUUID();
  const oneTimePassword = randomBytes(24).toString('base64url');
  const hash = await hashPassword(oneTimePassword);
  return guarded(async () => {
    await c.tx.query('SELECT app.staff_member_create($1,$2,$3,$4,$5)', [id, v.email, v.display_name, v.role, hash]);
    await audit(c, 'staff_member.create', id);
    return X.StaffMemberCreated.parse({ member: await member(c, id), one_time_password: oneTimePassword, seats: await seats(c) });
  });
}
/**
 * Deleting a login is a permanent suspension: no password, no authenticator, no
 * session, no reactivation, seat freed, address released; the row and its name
 * stay for the record. The confirmation word is checked by the schema here and
 * again by the database function.
 */
export async function deleteMember(c: Context, id: string, input: unknown) {
  const v = X.LoginDeleteConfirm.parse(input);
  if (id === c.actor.actor_id) refuse(409, 'id', 'use_delete_my_login');
  return guarded(async () => {
    await c.tx.query('SELECT app.staff_delete_login($1,$2)', [id, v.confirmation]);
    await audit(c, 'staff_member.delete', id);
    return member(c, id);
  });
}
export async function deleteOwnLogin(c: Context, input: unknown) {
  const v = X.LoginDeleteConfirm.parse(input);
  return guarded(async () => {
    await c.tx.query('SELECT app.staff_delete_login($1,$2)', [c.actor.actor_id, v.confirmation]);
    await audit(c, 'staff_login.delete_own', c.actor.actor_id);
    return X.OwnLoginDeleted.parse({ deleted_at: new Date().toISOString(), signed_out: true });
  });
}
export async function setMemberActive(c: Context, id: string, active: boolean) {
  return guarded(async () => {
    await c.tx.query('SELECT app.staff_member_set_active($1,$2)', [id, active]);
    await audit(c, active ? 'staff_member.reactivate' : 'staff_member.deactivate', id);
    return member(c, id);
  });
}
