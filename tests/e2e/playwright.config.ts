import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { privateDirectory } from '../../scripts/local-private.ts';

if(process.env.ORVIA_PROFILE!=='rehearsal')throw new Error('Browser suite requires the named rehearsal profile');
process.env.ORVIA_BROWSER_RUN_ID ??= new Date().toISOString().replaceAll(':','-');
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('.local/tools/playwright');
const directory=resolve('.local/browser-evidence',process.env.ORVIA_BROWSER_RUN_ID);
privateDirectory(directory);
export default defineConfig({
  testDir:'.',testMatch:'*.spec.ts',fullyParallel:false,workers:1,retries:0,forbidOnly:true,
  timeout:240000,expect:{timeout:20000},outputDir:resolve(directory,'raw'),
  reporter:[['./reporter.ts']],
  use:{baseURL:'https://127.0.0.1:4330',browserName:'chromium',headless:true,viewport:{width:1440,height:1000},
    ignoreHTTPSErrors:false,trace:'retain-on-failure',screenshot:'only-on-failure',video:'off',actionTimeout:20000},
});
