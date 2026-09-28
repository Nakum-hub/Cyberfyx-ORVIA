'use client';
import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from './ui.tsx';

export const DELETE_WORD = 'DELETE';

/**
 * A deletion confirmation that needs the word DELETE typed exactly (capital
 * letters, nothing else). The button stays disabled until it matches; the
 * server checks the same word again, so this is not the only guard.
 */
export function TypeToDelete({ title, children, busy, onCancel, onConfirm }: {
  title: string; children: ReactNode; busy?: boolean; onCancel: () => void; onConfirm: (confirmation: typeof DELETE_WORD) => void;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed === DELETE_WORD;
  return (
    <ConfirmDialog title={title} confirmLabel="Delete" tone="danger" busy={busy} confirmDisabled={!matches} onCancel={onCancel} onConfirm={() => { if (matches) onConfirm(DELETE_WORD); }}>
      {children}
      <label style={{ display: 'block', marginTop: 'var(--s3)' }}>
        Type <strong>{DELETE_WORD}</strong> to confirm
        <input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby="type-to-delete-hint" style={{ display: 'block', marginTop: 'var(--s2)' }} />
      </label>
      <p id="type-to-delete-hint" className="muted">{typed.length === 0 ? 'Capital letters, exactly as shown.' : matches ? 'Confirmed. Press Delete to continue.' : 'This does not match yet.'}</p>
    </ConfirmDialog>
  );
}
