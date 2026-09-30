import type { Page } from '@playwright/test';

/** Network quiet can precede hydration/effects, especially in WebKit. Require
 * the visible session and query loading states to finish before inspecting a
 * page or navigating away and cancelling its reads. A stuck loader still fails. */
export async function waitForPageContent(page: Page, timeout = 30_000) {
  const ready = await page.waitForFunction(() => {
    const main = document.querySelector('main');
    const text = (main?.innerText ?? '').trim();
    if (/^(loading|reading|opening)/i.test(text) && text.length < 80) return false;
    return ![...(main?.querySelectorAll<HTMLElement>('[role="status"]') ?? [])].some(state =>
      state.getClientRects().length > 0 && state.querySelector('h3')?.textContent?.trim() === 'Loading');
  }, undefined, { timeout, polling: 100 });
  await ready.dispose();
}
