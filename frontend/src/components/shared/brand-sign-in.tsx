'use client';
import { useEffect, useState, type ReactNode } from 'react';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/800.css';
import './brand-sign-in.css';

/**
 * The one sign-in interface for every person who signs in to ORVIA: staff of an organisation, its customers in the
 * Privacy Centre, vendor members and auditors, and client account holders (owner design 2026-10-03, the sign-in preview
 * in frontend/src/components). The shield opens, CYBERFYX and ORVIA slide in, then the form appears. The intro plays
 * once per browser tab; later visits in the same tab, a key press or click, and reduced-motion settings show the final
 * state at once. Authentication itself is unchanged: each page passes its own form and steps as children.
 */
const INTRO_KEY = 'orvia.sign-in-intro';
type Stage = 'start' | 'go' | 's1' | 's2' | 's3' | 'instant';
const CLASSES: Record<Stage, string> = {
  start: '', go: 'go', s1: 'go s1', s2: 'go s1 s2', s3: 'go s1 s2 s3', instant: 'instant s1 s2 s3',
};

export function BrandSignIn({ area, children }: { area: string; children: ReactNode }) {
  const [stage, setStage] = useState<Stage>('start');
  useEffect(() => {
    let seen = false;
    try { seen = window.sessionStorage.getItem(INTRO_KEY) === '1'; } catch { /* storage unavailable: play the intro */ }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (seen || reduce) { setStage('instant'); return; }
    try { window.sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* convenience only */ }
    setStage('go');
    const timers = [setTimeout(() => setStage('s1'), 2400), setTimeout(() => setStage('s2'), 3500), setTimeout(() => setStage('s3'), 4600)];
    const skip = () => { timers.forEach(clearTimeout); setStage(current => (current === 's3' ? current : 'instant')); };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => { timers.forEach(clearTimeout); window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip); };
  }, []);
  return (
    <main className={`cfx ${CLASSES[stage]}`} id="main" tabIndex={-1}>
      <div className="cfx-lockup" aria-label="Cyberfyx ORVIA" role="img">
        {/* A local static asset: the brand mark is served by this installation. */}
        <img className="cfx-shield" src="/brand/shield.png" alt="" width={493} height={670} />
        <div className="cfx-reveal" aria-hidden="true"><div className="cfx-inner"><span className="cfx-name">CYBERFYX</span><span className="cfx-orvia">- ORVIA</span></div></div>
      </div>
      <div className="cfx-formwrap"><div className="cfx-formclip"><div className="cfx-body">
        <h2 className="cfx-area">{area}</h2>
        {children}
      </div></div></div>
      <p className="cfx-foot">Synthetic test environment · customer-local · nothing on this page is sent outside this installation</p>
    </main>
  );
}
