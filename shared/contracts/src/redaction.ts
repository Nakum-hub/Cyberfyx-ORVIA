/**
 * Deterministic detection of contact details and identifiers in free text, used
 * before text leaves a customer installation (package statements, finding
 * responses) and before free text is stored in a vendor engagement file
 * (working papers, review notes, request messages). E-mail addresses, phone-like
 * and Aadhaar-like digit runs and PAN-format identifiers are replaced. It is a
 * safety net, not a guarantee: names and other personal data are not detected,
 * so people still review what they write and share.
 */
export const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Ten or more digits, optionally separated by single spaces or hyphens, not inside a longer token: a date or an identifier is not a phone number.
export const PHONE = /(?<![\w-])\+?\d(?:[\s-]?\d){9,13}(?![\w-])/g;
export const PAN = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
export function redactContactDetails(text: string) {
  let count = 0;
  const out = text.replace(EMAIL, () => { count++; return '[redacted: e-mail]'; }).replace(PHONE, () => { count++; return '[redacted: number]'; }).replace(PAN, () => { count++; return '[redacted: identifier]'; });
  return { text: out, redactions: count };
}
