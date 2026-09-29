import { createPrivateKey, sign } from 'node:crypto';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { AuditDocument, SignedAuditDocument } from '../../../shared/contracts/src/audit-exchange.ts';

/**
 * Signs an audit document (request list, findings, report) with the vendor
 * audit key. Only the vendor installation holds this key
 * (.local/vendor/signing/audit.json in development); installations verify with
 * the public key in their trust file.
 */
export type AuditKey = { key_id: string; private: string; public: string };
export function signAuditDocument(document: unknown, key: AuditKey) {
  const parsed = AuditDocument.parse(document);
  const signature = sign(null, Buffer.from(canonicalJson(parsed), 'utf8'), createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
  return SignedAuditDocument.parse({ algorithm: 'Ed25519', signing_key_id: key.key_id, document: parsed, signature });
}
