/**
 * ORVIA-CJSON-1: UTF-8 JSON, sorted UTF-16 object keys, ordered arrays, finite safe integers.
 * Kept in a module with no imports so that any contract module (including the
 * audit exchange formats that index.ts itself imports) can use it without a cycle.
 * crypto.ts re-exports it unchanged.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    if (!value.isWellFormed()) throw new Error('Ill-formed Unicode is not canonical');
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error('Canonical number must be a safe integer');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${Array.from(value,item=>canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object' && value && Object.getPrototypeOf(value) === Object.prototype) {
    const record = value as Record<string,unknown>;
    return `{${Object.keys(record).sort().map(key=>`${canonicalJson(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new Error('Unsupported canonical value');
}
