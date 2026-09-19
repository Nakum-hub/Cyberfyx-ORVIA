import type pg from 'pg';
import type { Authority } from '../../../db/src/runtime.ts';
export async function targetTransaction<T>(pool: pg.Pool, actor: Authority, work: (tx: pg.PoolClient)=>Promise<T>) {
 const tx=await pool.connect();try {
  await tx.query('BEGIN');
  const role=(await tx.query('SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
  if(!['orvia_target_agent','orvia_target_observer'].includes(role?.name)||role.rolsuper||role.rolbypassrls)throw new Error('Unsafe target role');
  await tx.query(`SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true)`,[actor.scope.tenant_id,actor.scope.legal_entity_id,actor.scope.environment_id,actor.actor_id]);
  const result=await work(tx);await tx.query('COMMIT');return result;
 }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
}
