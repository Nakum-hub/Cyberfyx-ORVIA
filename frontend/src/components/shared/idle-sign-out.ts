'use client';
import { useEffect } from 'react';
import { SESSION_IDLE_SECONDS } from '@orvia/contracts';

/**
 * 30 minutes without activity ends the session (owner decision 2026-10-03). The server already expires a session that
 * sees no request for that long; this covers screens that refresh themselves in the background, which would otherwise
 * keep an unattended session alive. Activity means the person's own input. The last-activity time is shared between
 * this person's open tabs, so working in one tab keeps the others signed in.
 */
const KEY = 'orvia.last-activity';
const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'scroll'] as const;

function readShared(): number {
  try { return Number(window.localStorage.getItem(KEY)) || 0; } catch { return 0; }
}
function writeShared(at: number) {
  try { window.localStorage.setItem(KEY, String(at)); } catch { /* per-tab timing still applies */ }
}

export function useIdleSignOut(active: boolean, signOut: () => Promise<void>, signInHref: string) {
  useEffect(() => {
    if (!active) return;
    let last = Date.now(); let written = 0; let ending = false;
    writeShared(last);
    const touch = () => {
      last = Date.now();
      if (last - written > 15_000) { written = last; writeShared(last); }
    };
    const check = async () => {
      if (ending) return;
      const latest = Math.max(last, readShared());
      if (Date.now() - latest < SESSION_IDLE_SECONDS * 1000) return;
      ending = true;
      try { await signOut(); } catch { /* the server expiry ends it regardless */ }
      window.location.assign(`${signInHref}${signInHref.includes('?') ? '&' : '?'}expired=1`);
    };
    for (const name of EVENTS) window.addEventListener(name, touch, { passive: true });
    // A laptop waking from sleep fires visibilitychange; check at once rather than waiting for the next tick.
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void check(), 30_000);
    return () => {
      for (const name of EVENTS) window.removeEventListener(name, touch);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [active, signOut, signInHref]);
}

/** Shown on the sign-in page after an inactivity sign-out. */
export function signedOutForInactivity(): boolean {
  try { return new URLSearchParams(window.location.search).get('expired') === '1'; } catch { return false; }
}
