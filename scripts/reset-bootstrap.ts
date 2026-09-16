import { resetBootstrap } from '../packages/testing/src/reset.ts';
import { safeError } from '../packages/testing/src/evidence.ts';
try{
  if(process.argv.length!==4)throw new Error('Usage: reset:bootstrap <named-profile> <profile-bootstrap-only>');
  await resetBootstrap(process.argv[2]!,process.argv[3]!);
}catch(error){console.error(safeError(error));process.exitCode=1;}
