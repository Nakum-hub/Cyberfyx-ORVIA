'use client';
import { useId, useState, type ReactNode } from 'react';

/** Keeps a draft mounted when closed; collapsing is presentation, never authority. */
export function RecordAction({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? `Close: ${label}` : label}</button>
    <div id={id} hidden={!open}>{children}</div>
  </div>;
}
