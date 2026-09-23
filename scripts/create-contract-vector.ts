import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { signCommand } from '../shared/contracts/src/crypto.ts';
import { examplePayload } from '../shared/contracts/src/examples.ts';
// Regenerate only when the contract changes. Private fixture key is never saved.
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
mkdirSync('shared/contracts/fixtures',{recursive:true});
writeFileSync('shared/contracts/fixtures/command-vector.json',JSON.stringify({fixture_kind:'PUBLIC_SYNTHETIC_SIGNATURE_VECTOR',not_a_runtime_trust_root:true,public_key_spki_base64:publicKey.export({format:'der',type:'spki'}).toString('base64'),command:signCommand(examplePayload,privateKey)},null,2)+'\n');
console.log('Wrote public synthetic vector; private key discarded without export.');
