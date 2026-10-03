'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * On desktop the workspace fits the window and only the content pane scrolls (owner request 2026-10-03). Long screens
 * get a sticky "On this page" bar built from their own sections, so a reader jumps to a part instead of scrolling past
 * everything above it. Nothing is hidden: every section stays on the page, in order. Shown only for three or more sections.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // A new screen starts at its top (the pane, not the window, scrolls), or at the anchor named in the address.
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) { main.scrollTop = 0; return; }
    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.getElementById(hash);
      if (target || ++tries > 30) { window.clearInterval(timer); target?.scrollIntoView({ block: 'start' }); }
    }, 100);
    return () => window.clearInterval(timer);
  }, [pathname]);

  // The sections are read from the rendered screen and re-read as its data arrives.
  useEffect(() => {
    const main = document.getElementById('main');
    if (!main) return;
    const read = () => {
      // The bar sits directly under the screen's heading, in a slot of its own.
      const head = main.querySelector<HTMLElement>('.page-head');
      let place = main.querySelector<HTMLElement>(':scope .section-tabs-slot');
      if (head && (!place || place.previousElementSibling !== head)) { place?.remove(); place = document.createElement('div'); place.className = 'section-tabs-slot'; head.after(place); }
      setSlot(prev => prev === place ? prev : place);
      const found = [...main.querySelectorAll<HTMLElement>('section.section')]
        .filter(el => !el.parentElement?.closest('section.section') && el.offsetParent !== null)
        .map((el, i) => {
          const title = el.getAttribute('aria-label') ?? el.querySelector('h3')?.textContent ?? `Part ${i + 1}`;
          if (!el.id) el.id = `part-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${i}`;
          return { id: el.id, title };
        });
      setSections(prev => prev.length === found.length && prev.every((p, i) => p.id === found[i]!.id && p.title === found[i]!.title) ? prev : found);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(main, { childList: true, subtree: true });
    const onScroll = () => {
      const top = main.getBoundingClientRect().top + 90;
      let current: string | null = null;
      for (const el of main.querySelectorAll<HTMLElement>('section.section[id]')) if (el.getBoundingClientRect().top <= top) current = el.id;
      // At the end of the pane the last part may never reach the top; it is the one being read.
      const all = main.querySelectorAll<HTMLElement>('section.section[id]');
      if (all.length && main.scrollTop + main.clientHeight >= main.scrollHeight - 2) current = all[all.length - 1]!.id;
      setActive(current);
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => { observer.disconnect(); main.removeEventListener('scroll', onScroll); };
  }, [pathname]);

  if (sections.length < 3 || !slot?.isConnected) return null;
  return createPortal(
    <nav className="section-tabs" aria-label="On this page">
      {sections.map(s => (
        <button key={s.id} type="button" aria-current={active === s.id ? 'true' : undefined}
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ block: 'start' })}>{s.title}</button>
      ))}
    </nav>, slot);
}
