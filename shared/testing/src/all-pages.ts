/** Every item of a paged list, following `next_cursor` (pages hold at most 100). A long-lived test profile holds more than one
 *  page of most collections, so a suite looking for its own record must not assume the first page contains it. */
export async function allPages<T>(call: (path: string) => Promise<Response>, path: string, parse: (value: unknown) => { items: T[]; next_cursor: string | null }, maxPages = 100) {
  const items: T[] = [];
  const url = new URL(path, 'http://synthetic-test.invalid');
  url.searchParams.delete('limit'); url.searchParams.delete('cursor');
  const base = url.pathname + url.search;
  const seen = new Set<string>();
  let cursor: string | null = null;
  for (let n = 0; n < maxPages; n++) {
    const sep = base.includes('?') ? '&' : '?';
    const response = await call(`${base}${sep}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    if (response.status !== 200) throw new Error(`Unexpected ${response.status} listing ${path}`);
    const page = parse(await response.json());
    items.push(...page.items); cursor = page.next_cursor;
    if (!cursor) return items;
    if (seen.has(cursor)) throw new Error(`Repeated cursor listing ${path}`);
    seen.add(cursor);
  }
  throw new Error(`More than ${maxPages} pages listing ${path}`);
}

export async function allPageList<T>(call: (path: string) => Promise<Response>, path: string, parse: (value: unknown) => { items: T[]; next_cursor: string | null }) {
  return { items: await allPages(call, path, parse), next_cursor: null };
}
