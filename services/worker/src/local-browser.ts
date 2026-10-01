import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * The headless Chromium the website scanners use. Chromium's own background services (component and safe-browsing updates,
 * metrics, sync, domain reliability, pings) would otherwise contact Google from the customer's installation; master rule:
 * no vendor or third-party telemetry. These switches turn them off; what a page itself requests is governed by each scanner.
 */
export const QUIET_CHROMIUM_ARGS = [
  '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps', '--no-pings',
  '--disable-domain-reliability', '--metrics-recording-only', '--disable-client-side-phishing-detection', '--disable-breakpad',
  '--disable-features=OptimizationHints,MediaRouter,Translate,AutofillServerCommunication,CertificateTransparencyComponentUpdater,InterestFeedContentSuggestions',
];
export function launchLocalChromium() {
  const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  return chromium.launch({ headless: true, args: QUIET_CHROMIUM_ARGS, ...executablePath ? { executablePath } : {} });
}
