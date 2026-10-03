import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifiedSourcePaths,qualifiedDirty} from '../../scripts/source-paths.mjs';
test('browser evidence never changes the packaged source inventory, while application edits do',()=>{
 assert.deepEqual(qualifiedSourcePaths('output/playwright/crawl/page.png\nfrontend/src/app/page.tsx\nhandoffs/codex/result.json'),['frontend/src/app/page.tsx']);
 assert.equal(qualifiedDirty(' M output/playwright/crawl/page.png'),false);
 assert.equal(qualifiedDirty(' M frontend/src/app/page.tsx'),true);
});
