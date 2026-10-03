// Run 3 fixture preparation only. Enrol the generated local identities through
// the real authentication API; keep secrets in the protected bootstrap journal.
import {HttpFixture} from '../../shared/testing/src/http-fixture.ts';
import {loadProfile} from '../../shared/testing/src/config.ts';
const profile=loadProfile();
if(!['codex-a00','rehearsal'].includes(profile.profile))throw new Error('Owned Round 10 customer profiles only');
const h=new HttpFixture();
try {
  await h.start();
  for(const name of ['owner','admin','reviewer','member']) {
    await h.login(name);
    if(!h.users[name]?.totp_uri)throw new Error('Synthetic authenticator preparation incomplete');
    console.log(JSON.stringify({profile:profile.profile,fixture:name,mfa_verified:true}));
  }
}finally{await h.stop();}
