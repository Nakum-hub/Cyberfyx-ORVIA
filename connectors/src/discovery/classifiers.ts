/**
 * Deterministic value classifiers (ruleset `value-classifiers v1`).
 *
 * Each classifier accepts a single value and says whether it has the shape of
 * the category, using a checksum wherever the category defines one: Aadhaar
 * numbers carry a Verhoeff check digit and payment card numbers a Luhn check
 * digit, so a twelve- or sixteen-digit number that fails is not classified. No
 * classifier learns, and none is applied to free text as a whole: a column is
 * classified from the share of its sampled values that match.
 */
export const RULESET = 'value-classifiers v1';
export const CATEGORIES = ['EMAIL', 'PHONE_IN', 'PAN', 'AADHAAR', 'PAYMENT_CARD', 'IFSC', 'IPV4'] as const;
export type Category = typeof CATEGORIES[number];
/** Share of non-empty sampled values that must match for a column to be classified, and to be flagged as possible. */
export const CONFIRMED_SHARE = 0.8;
export const POSSIBLE_SHARE = 0.3;

const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
export function verhoeffValid(digits: string) {
  let c = 0;
  const reversed = [...digits].reverse();
  for (let i = 0; i < reversed.length; i++) c = D[c]![P[i % 8]![Number(reversed[i])]!]!;
  return c === 0;
}
export function luhnValid(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}
const compact = (value: string) => value.replace(/[\s-]/g, '');
const TESTS: Record<Category, (value: string) => boolean> = {
  EMAIL: v => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v.trim()),
  PHONE_IN: v => /^(\+91|0091|0)?[6-9]\d{9}$/.test(compact(v)),
  PAN: v => /^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/.test(v.trim().toUpperCase()),
  AADHAAR: v => { const d = compact(v); return /^[2-9]\d{11}$/.test(d) && verhoeffValid(d); },
  PAYMENT_CARD: v => { const d = compact(v); return /^\d{13,19}$/.test(d) && luhnValid(d); },
  IFSC: v => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim().toUpperCase()),
  IPV4: v => { const m = v.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); return Boolean(m && m.slice(1).every(o => Number(o) <= 255)); },
};
export function matches(value: string): Category[] { return CATEGORIES.filter(c => TESTS[c](value)); }

export type ColumnCounts = { column: string; sampled: number; non_empty: number; matches: Record<Category, number> };
export type ColumnResult = ColumnCounts & { category: Category | null; confidence: 'CONFIRMED' | 'POSSIBLE' | 'NONE'; share: number };
/** Counts only: the caller discards the values once they are counted. */
export function countColumn(column: string, values: (string | null)[]): ColumnCounts {
  const counts = Object.fromEntries(CATEGORIES.map(c => [c, 0])) as Record<Category, number>;
  let nonEmpty = 0;
  for (const value of values) {
    if (value === null || value.trim() === '') continue;
    nonEmpty++;
    for (const c of matches(value)) counts[c]++;
  }
  return { column, sampled: values.length, non_empty: nonEmpty, matches: counts };
}
export function decide(counts: ColumnCounts): ColumnResult {
  let best: Category | null = null; let bestCount = 0;
  for (const c of CATEGORIES) if (counts.matches[c] > bestCount) { best = c; bestCount = counts.matches[c]; }
  const share = counts.non_empty ? bestCount / counts.non_empty : 0;
  const confidence = share >= CONFIRMED_SHARE ? 'CONFIRMED' : share >= POSSIBLE_SHARE ? 'POSSIBLE' : 'NONE';
  return { ...counts, category: confidence === 'NONE' ? null : best, confidence, share: Math.round(share * 1000) / 1000 };
}
