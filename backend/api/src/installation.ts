import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { runtimeConfig } from '../../auth/src/config.ts';

/**
 * Installation kind (revision 1.5 addendum). The same build serves either a
 * client organisation's CUSTOMER_INSTALLATION or the vendor's own
 * VENDOR_SERVICE installation. The installer fixes the kind when it provisions
 * the installation: it writes the protected <profile>/installation.json and
 * the database records the same kind in an immutable row. No route changes it.
 *
 * Every gated request checks both: the configured kind decides which surface
 * exists (anything else is a plain 404), and the database record must agree
 * before anything is served (otherwise 503). A profile without the file is a
 * customer installation, the default.
 */
export const InstallationKind = z.enum(['CUSTOMER_INSTALLATION', 'VENDOR_SERVICE']);
export type InstallationKind = z.infer<typeof InstallationKind>;
export const InstallationRecord = z.strictObject({ kind: InstallationKind, installation_id: z.uuid(), recorded_at: z.iso.datetime() });

export function installationFile(directory = runtimeConfig().directory) { return resolve(directory, 'installation.json'); }

export function configuredKind(directory?: string): InstallationKind {
  const config = directory ? null : runtimeConfig();
  const file = installationFile(directory ?? config!.directory);
  if (!existsSync(file)) return 'CUSTOMER_INSTALLATION';
  const record = InstallationRecord.parse(JSON.parse(readFileSync(file, 'utf8')));
  if (config && record.installation_id !== config.installation_id) throw new Error('Installation record belongs to another installation');
  return record.kind;
}

/** How each kind's database reports its recorded kind. Loaded on demand, so a process never opens the other kind's database. */
const readers: Record<InstallationKind, () => Promise<unknown>> = {
  CUSTOMER_INSTALLATION: async () => { const { runtime } = await import('./runtime.ts'); return (await runtime().pool.query('SELECT app.installation_kind() AS kind')).rows[0]?.kind; },
  VENDOR_SERVICE: async () => { const { vendorRuntime } = await import('./vendor/runtime.ts'); return (await vendorRuntime().pool.query('SELECT vendor.installation_kind() AS kind')).rows[0]?.kind; },
};

let verified: Promise<InstallationKind> | undefined;
/** The configured kind, confirmed once per process against the database record. */
export function verifiedKind(): Promise<InstallationKind> {
  return verified ??= (async () => {
    const kind = configuredKind();
    const recorded = await readers[kind]();
    if (recorded !== kind) throw new Error('Installation kind in the database differs from the configured kind');
    return kind;
  })().catch(error => { verified = undefined; throw error; });
}

const plain = (status: number, code: string) => Response.json({ error: { code } }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/**
 * Wraps a route handler so it exists only on one installation kind. On the
 * other kind the path does not exist (404) and nothing else runs, in
 * particular no database of the other kind is ever opened.
 */
export function onlyOn<A extends unknown[]>(kind: InstallationKind, handler: (request: Request, ...rest: A) => Promise<Response> | Response) {
  return async (request: Request, ...rest: A): Promise<Response> => {
    let configured: InstallationKind;
    try { configured = configuredKind(); } catch { return plain(503, 'SERVICE_UNAVAILABLE'); }
    if (configured !== kind) return plain(404, 'NOT_FOUND');
    try { await verifiedKind(); } catch { return plain(503, 'SERVICE_UNAVAILABLE'); }
    return handler(request, ...rest);
  };
}
