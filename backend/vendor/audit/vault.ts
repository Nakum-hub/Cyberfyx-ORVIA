import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Evidence at rest on the vendor installation. Each package gets its own
 * random 256-bit data key; every item is sealed with AES-256-GCM under that key
 * and the data key is itself sealed under the installation's vault key (the
 * protected <profile>/auth/vault-key). Purging a package destroys its wrapped
 * key and ciphertext together.
 */
export type Sealed = { ciphertext: Buffer; nonce: Buffer; tag: Buffer };
export function seal(key: Buffer, plaintext: Buffer, aad: string): Sealed {
  if (key.length !== 32) throw new Error('Vault key must be 256 bits');
  const nonce = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, nonce); cipher.setAAD(Buffer.from(aad, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext, nonce, tag: cipher.getAuthTag() };
}
export function open(key: Buffer, sealed: Sealed, aad: string): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, sealed.nonce); decipher.setAAD(Buffer.from(aad, 'utf8')); decipher.setAuthTag(sealed.tag);
  return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]);
}
export const newDataKey = () => randomBytes(32);
export const vaultKeyFrom = (hex: string) => { if (!/^[a-f0-9]{64}$/.test(hex)) throw new Error('Invalid vault key'); return Buffer.from(hex, 'hex'); };
