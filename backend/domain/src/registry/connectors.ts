import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { adapterFor } from '../../../../connectors/src/shared/connector-adapters.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, pageOf, predicate, refuse, scope, only } from '../operations/shared.ts';

/**
 * Connector bindings (domain model s12). A system is bound to an adapter; the
 * capabilities recorded are copied from that adapter's code at binding time and
 * are never typed in by an operator. Which data categories a system is the
 * system of record for is customer configuration, and is what a correction uses
 * to decide where to write first.
 */
type BindingRow = { id: string; system_id: string; adapter: string; capabilities: Record<string, unknown>; capability_version: string; system_of_record_for: string[]; holds_data_categories: string[]; valid_from: Date; valid_to: Date | null };
const bindingView = (b: BindingRow) => R.ConnectorBinding.parse({ ...only(R.ConnectorBinding, b), valid_from: iso(b.valid_from), valid_to: iso(b.valid_to) });

export async function bindConnector(c: Context, input: unknown) {
  const value = R.ConnectorBindingCreate.parse(input);
  const system = (await c.tx.query(`SELECT connector FROM app.systems WHERE ${predicate} AND id=$4`, [...scope(c), value.system_id])).rows[0];
  if (!system) refuse(404, 'system_id', 'not_found');
  // A manual system has no synthetic target behind it, so it cannot be bound to the test adapter.
  if (value.adapter === 'SYNTHETIC_RECORDS_TEST_ADAPTER' && system.connector === 'LEGACY_MANUAL') refuse(409, 'adapter', 'manual_system_has_no_connector_target');
  for (const category of [...value.system_of_record_for, ...value.holds_data_categories]) await exists(c, 'personal_data_categories', category, 'data_category_ids');
  const adapter = adapterFor(value.adapter)!;
  await c.tx.query(`UPDATE app.connector_bindings SET valid_to=clock_timestamp() WHERE ${predicate} AND system_id=$4 AND valid_to IS NULL`, [...scope(c), value.system_id]);
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.connector_bindings(tenant_id,legal_entity_id,environment_id,id,system_id,adapter,capabilities,capability_version,system_of_record_for,holds_data_categories,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
  [...scope(c), id, value.system_id, value.adapter, adapter.capabilities, adapter.version, value.system_of_record_for, [...new Set([...value.holds_data_categories, ...value.system_of_record_for])], c.actor.actor_id])).rows[0];
  await audit(c, 'connector_binding.create', id);
  return bindingView(row);
}
export async function bindingList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.connector_bindings WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows as BindingRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(bindingView), next_cursor: paged.next_cursor };
}
