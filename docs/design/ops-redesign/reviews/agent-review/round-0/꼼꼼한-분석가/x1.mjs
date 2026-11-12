import { browser, page, audit } from './lib.mjs';
const b=await browser();
const studs=process.argv[2].split(',');
const scheme=process.argv[3]||'light', W=+(process.argv[4]||1600);
const p=await page(b,W,scheme,'/student-care/x');
for(const nm of studs){
  await p.fill('.x-search',nm); await p.waitForTimeout(200);
  await p.click('.x-list tbody tr'); await p.waitForTimeout(300);
  for(const tab of ['공부 시간','입실 시각','계획','사진 관찰']){
    await p.click(`.x-tabs button:has-text("${tab}")`); 
    for(const per of ['일간','주간']){
      const sw=p.locator('.xs-seg button',{hasText:per}).first(); if(await sw.count()) await sw.click();
      await p.waitForTimeout(250);
      const a=await audit(p,'.x-panel');
      const f=`x-${W}-${scheme}-${nm}-${tab.replace(' ','')}-${per}.png`;
      await p.locator('.x-panel').screenshot({path:f});
      console.log(nm,tab,per,a.length?('\n  '+a.join('\n  ')):'ok');
    }
    await p.locator('.xs-seg button',{hasText:'일간'}).first().click().catch(()=>{});
  }
}
console.log('errors',p._errs);
await b.close();
