import assert from 'node:assert/strict';
import {firefox} from '@playwright/test';
import {HttpFixture} from '../../shared/testing/src/http-fixture.ts';

const h=new HttpFixture();
try {
  await h.start();
  const session=await h.login('owner');
  const browser=await firefox.launch();
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.addCookies(session.headers().cookie.split('; ').map(value=>{
      const split=value.indexOf('=');
      return {name:value.slice(0,split),value:value.slice(split+1),url:h.config.origin};
    }));
    const page=await context.newPage();
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/eval|Content.Security.Policy/i.test(message.text()))errors.push(message.text());});
    await page.goto(h.config.origin+'/workspace/capabilities');
    await page.getByRole('navigation',{name:'Programme module pages'}).waitFor();
    const modules=new Set<string>();
    for(let index=0;index<7;index++) {
      await page.getByRole('navigation',{name:'Programme module pages'}).getByText(`Modules ${index*5+1}–${Math.min((index+1)*5,33)} of 33`,{exact:true}).waitFor();
      const headings=page.locator('article h4').filter({hasText:/^M\d/});
      await headings.first().waitFor();
      const names=await headings.allTextContents();
      assert.equal(names.length,index===6?3:5);
      names.forEach(name=>modules.add(name));
      if(index<6)await page.getByRole('button',{name:'Next modules'}).click();
    }
    assert.equal(modules.size,33);
    assert.equal(await page.getByRole('button',{name:'Next modules'}).isDisabled(),true);
    await page.screenshot({path:'handoffs/codex/artifacts/R3-polish-capabilities-mobile.png',fullPage:true});
    console.log('PASS all 33 programme modules remain reachable in seven pages, at most five per page');
    await page.goto(h.config.origin+'/workspace/configuration');
    const toggle=page.getByRole('button',{name:'Create purpose',exact:true});
    await toggle.waitFor();
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.equal(await page.getByLabel('Purpose name',{exact:true}).isVisible(),false);
    await toggle.click();
    await page.getByLabel('Purpose name',{exact:true}).fill('Synthetic unsaved draft');
    await page.getByRole('button',{name:'Close: Create purpose',exact:true}).click();
    await page.getByRole('button',{name:'Create purpose',exact:true}).click();
    assert.equal(await page.getByLabel('Purpose name',{exact:true}).inputValue(),'Synthetic unsaved draft');
    await page.screenshot({path:'handoffs/codex/artifacts/R3-polish-configuration-mobile.png',fullPage:true,mask:[page.locator('input,code,pre')]});
    console.log('PASS action starts collapsed and retains an unsaved draft across close/reopen');
    assert.deepEqual(errors,[]);
    console.log('PASS Firefox reports no page errors or CSP eval errors on the changed screens');
  } finally {await browser.close();}
} finally {await h.stop();}
