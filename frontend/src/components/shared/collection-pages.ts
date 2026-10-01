/** Publish a complete collection only after every page succeeds. */
export async function collectPages<T>(read: (cursor?: string) => Promise<{ items: T[]; next_cursor: string | null }>) {
  const items: T[] = []; const seen = new Set<string>();
  let cursor: string | undefined;
  for (let n = 0; n < 100; n++) {
    const page = await read(cursor);
    items.push(...page.items);
    if (!page.next_cursor) return items;
    if (seen.has(page.next_cursor)) throw new Error('Collection pagination did not complete; no partial list is displayed.');
    seen.add(page.next_cursor); cursor = page.next_cursor;
  }
  throw new Error('Collection pagination did not complete; no partial list is displayed.');
}
