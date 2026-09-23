'use client';
import { useState } from 'react';
import { TextField } from './ui.tsx';

/** Navigates only to a contract-valid local record ID, never an arbitrary URL. */
export function OpenRecord({ label, base }: { label: string; base: string }) {
  const [id, setId] = useState('');
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  return (
    <form onSubmit={event => { event.preventDefault(); if (valid) globalThis.location.assign(`${base}/${id}`); }}>
      <TextField label={label} value={id} onChange={setId} required />
      <button type="submit" disabled={!valid}>Open recorded ID</button>
      <p className="muted" style={{ fontSize: 13, marginTop: 'var(--s2)' }}>Enter the exact UUID of an authorized record. The server still checks your scope.</p>
    </form>
  );
}
