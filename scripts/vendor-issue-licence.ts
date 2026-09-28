/**
 * VENDOR SIDE ONLY. Issues a signed licence file for a customer installation
 * from a catalogue plan option (backend/vendor/plans/catalogue.ts). Needs the
 * vendor licence key in .local/vendor/signing/licence.json; a customer
 * installation does not have it. Writes .local/vendor/issued/<licence_id>.json,
 * which the customer imports in the workspace (Licensing) of their installation.
 *
 * Usage:
 *   pnpm run vendor:issue-licence confirm:vendor --installation <uuid> --option tier_1_members_5 \
 *     --entitlements PRIVACY_GRAPH,RIGHTS_MANAGEMENT --environments 1 --days 365
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { issueLicence } from '../backend/vendor/licensing/issue.ts';
import { privateDirectory, writePrivateJson } from './local-private.ts';
import { vendorDirectory, vendorSigningKey } from './credentials.ts';

function argument(name: string) {
  const at = process.argv.indexOf(`--${name}`);
  const value = at > 0 ? process.argv[at + 1] : undefined;
  if (!value || value.startsWith('--')) throw new Error(`--${name} is required`);
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:vendor') throw new Error('Vendor tool: run with confirm:vendor');
  const days = Number(argument('days')); const environments = Number(argument('environments'));
  if (!Number.isInteger(days) || days < 1 || days > 3660) throw new Error('--days must be 1 to 3660');
  if (!Number.isInteger(environments) || environments < 1 || environments > 100) throw new Error('--environments must be 1 to 100');
  const now = Date.now();
  const { licence, plan } = issueLicence({ installation_id: argument('installation'), option: argument('option'), entitlements: argument('entitlements').split(','),
    environments, valid_from: new Date(now - 60_000).toISOString(), valid_to: new Date(now + days * 86_400_000).toISOString() }, vendorSigningKey('licence'));
  const directory = resolve(vendorDirectory(), 'issued'); privateDirectory(directory);
  const path = resolve(directory, `${licence.claims.licence_id}.json`);
  writePrivateJson(path, { licence });
  console.log(`Issued licence ${licence.claims.licence_id} for installation ${licence.claims.installation_id}: ${plan.tier} / ${plan.option}, ${plan.member_seats} member seats (owner and administrator included, not counted), valid to ${licence.claims.valid_to}. File: .local/vendor/issued/${licence.claims.licence_id}.json`);
}
