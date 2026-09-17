import type { NextConfig } from 'next';

/**
 * Conservative customer-local policy. Every fetching directive is 'self', so the
 * product's central claim — no remote script, font, analytics or model is used —
 * is enforced by the browser rather than only asserted in copy and checked by a
 * test.
 *
 * Known limitation, deliberately not hidden: script-src and style-src keep
 * 'unsafe-inline' because the App Router streams its RSC payload through inline
 * bootstrap scripts. Removing it requires a per-request nonce issued from
 * middleware, which is a production hardening change outside the prototype's
 * agreed scope. An injected *external* script is blocked either way; an inline
 * injection would not be, so this is not a substitute for output escaping.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
].join('; ');

const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@orvia/contracts', '@orvia/auth'],
  experimental: { cpus: 1 },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
    ] }];
  },
};
export default config;
