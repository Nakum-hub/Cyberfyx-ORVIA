'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/800.css';
import './brand-sign-in.css';
import { signedOutForInactivity } from './idle-sign-out.ts';

/**
 * The one sign-in interface for every person who signs in to ORVIA: the organisation's staff, vendor members and
 * auditors, and client account holders (owner design 2026-10-03, the sign-in preview in frontend/src/components).
 *
 * The intro follows the preview's timeline exactly, animated with framer-motion (bundled locally, nothing fetched):
 * the shield spins open in perspective (0–2.3 s), CYBERFYX slides out from behind it (2.4 s), "- ORVIA" follows (3.5 s),
 * then the form rises in (4.6 s). It plays on every visit, as the preview does. A key press or click skips straight to
 * the form, and people who ask their system for reduced motion see the final page at once. Authentication itself is
 * unchanged: each page passes its own form and steps as children.
 */
const EASE_OUT_EXPO: Transition['ease'] = [0.22, 1, 0.36, 1];
const AT = { name: 2.4, orvia: 3.5, form: 4.6 } as const;

/**
 * `area` names the sign-in for assistive technology; it is shown only when `showArea` is set (recovery and account setup),
 * so the sign-in itself looks exactly like the preview: email, password, Sign in. `links` sit in the small line at the
 * bottom edge of the page, with the synthetic-environment label.
 */
export function BrandSignIn({ area, children, showArea = false, links }: { area: string; children: ReactNode; showArea?: boolean; links?: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const [skipped, setSkipped] = useState(false);
  const [expired, setExpired] = useState(false);
  const [opened, setOpened] = useState(false); // once the form has risen, focus rings may extend past its edge
  useEffect(() => { setExpired(signedOutForInactivity()); }, []);
  useEffect(() => {
    const skip = () => setSkipped(true);
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => { window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip); };
  }, []);
  const instant = reduce || skipped;
  // When skipped, every element moves to its final state immediately; otherwise each starts at its point in the timeline.
  const at = (delay: number, transition: Transition): Transition => (instant ? { duration: 0 } : { ...transition, delay });
  return (
    <main className="cfx" id="main" tabIndex={-1}>
      <div className="cfx-lockup" aria-label="Cyberfyx ORVIA" role="img">
        {/* A local static asset: the brand mark is served by this installation. */}
        <motion.img className="cfx-shield" src="/brand/shield.png" alt="" width={493} height={670}
          style={{ transformPerspective: 800 }}
          initial={{ scale: 0, rotateY: -360, opacity: 0 }}
          animate={instant ? { scale: 1, rotateY: 0, opacity: 1 } : { scale: [0, 1, 1], rotateY: [-360, -281, 0], opacity: [0, 1, 1] }}
          transition={instant ? { duration: 0 } : { duration: 2.3, ease: 'linear', times: [0, 0.22, 1] }} />
        <motion.div className="cfx-reveal" aria-hidden="true"
          initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }}
          transition={at(AT.name, { duration: 1, ease: EASE_OUT_EXPO })}>
          <div className="cfx-inner">
            <span className="cfx-name">CYBERFYX</span>
            <motion.span className="cfx-orvia" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={at(AT.orvia, { duration: 0.6, ease: 'easeOut' })}>- ORVIA</motion.span>
          </div>
        </motion.div>
      </div>
      <motion.div className="cfx-formwrap" initial={{ height: 0 }} animate={{ height: 'auto' }} style={opened ? { overflow: 'visible' } : undefined}
        onAnimationComplete={() => setOpened(true)}
        transition={at(AT.form, { duration: 0.9, ease: EASE_OUT_EXPO })}>
        <motion.div className="cfx-body" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={at(AT.form + 0.35, { duration: 0.8, ease: EASE_OUT_EXPO })}>
          <h2 className={showArea ? 'cfx-area' : 'cfx-area cfx-sr'}>{area}</h2>
          {expired ? <div className="notice notice-info cfx-expired" role="status">You were signed out after 30 minutes without activity. Sign in again to continue.</div> : null}
          {children}
        </motion.div>
      </motion.div>
      <motion.p className="cfx-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={at(AT.form + 0.35, { duration: 0.8 })}>
        {links ? <>{links}<span aria-hidden="true"> · </span></> : null}Synthetic test environment · customer-local · nothing on this page is sent outside this installation
      </motion.p>
    </main>
  );
}
