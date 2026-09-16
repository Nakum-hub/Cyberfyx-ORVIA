// Explicit setup-time metadata resolution; never imported by runtime services.
import { mkdir, writeFile } from 'node:fs/promises';
const packages = ['pnpm','typescript','next','react','react-dom','tailwindcss','@tailwindcss/postcss',
  'drizzle-orm','drizzle-kit','better-auth','pg','@types/pg','@types/node','@types/react','@types/react-dom',
  'zod','openapi-typescript','tsx','@temporalio/client','@temporalio/worker','@temporalio/workflow',
  '@temporalio/activity','@temporalio/common','@playwright/test','eslint','@eslint/js','typescript-eslint'];
async function json(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
const metadata = [];
for (let i = 0; i < packages.length; i += 4) {
  const results = await Promise.allSettled(packages.slice(i,i+4).map(async name => {
    const major = name === 'typescript' ? 5 : name === '@types/node' ? 24 : undefined;
    let value;
    if (major) {
      const registry = await json(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
      const version = Object.keys(registry.versions).filter(v => /^\d+\.\d+\.\d+$/.test(v) && Number(v.split('.')[0]) === major && Date.parse(registry.time[v]) <= Date.now() - 86_400_000)
        .sort((a,b) => { const x=a.split('.').map(Number),y=b.split('.').map(Number); return y[0]-x[0] || y[1]-x[1] || y[2]-x[2]; })[0];
      value = registry.versions[version];
    } else value = await json(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
    return { name, version:value.version, engines:value.engines, peers:value.peerDependencies, integrity:value.dist.integrity };
  }));
  for (const result of results) {
    if (result.status !== 'fulfilled') throw result.reason;
    metadata.push(result.value);
  }
}
const node = (await json('https://nodejs.org/dist/index.json')).find(item => item.version.startsWith('v24.') && item.lts);
const images = [];
for (const [name,tag] of [['library/postgres','17-bookworm'],['openpolicyagent/opa','latest-static'],['temporalio/temporal','latest'],['library/node',`${node.version.slice(1)}-bookworm-slim`]]) {
  const token = await json(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${name}:pull`);
  const response = await fetch(`https://registry-1.docker.io/v2/${name}/manifests/${tag}`, {
    headers: { Authorization:`Bearer ${token.token}`, Accept:'application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json' },
    signal:AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Image manifest lookup failed: ${name} (${response.status})`);
  const digest = response.headers.get('docker-content-digest');
  if (!/^sha256:[a-f0-9]{64}$/.test(digest ?? '')) throw new Error('Missing immutable image digest');
  images.push({ name, queried_tag:tag, reference:`${name}@${digest}` });
}
await mkdir('.local',{recursive:true});
await writeFile('.local/toolchain.json',JSON.stringify({checked_at:new Date().toISOString(),node,packages:metadata,images},null,2)+'\n');
console.log(JSON.stringify({node:node.version,packages:metadata.map(({name,version})=>({name,version})),images},null,2));
