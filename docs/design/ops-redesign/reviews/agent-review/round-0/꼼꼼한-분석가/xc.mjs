import { browser, page, contrast } from './lib.mjs';
const b=await browser();
for(const scheme of ['light','dark']){
 const p=await page(b,1600,scheme,'/student-care/x');
 for(const nm of ['문가영','탁예린']){ await p.fill('.x-search',nm); await p.waitForTimeout(200); await p.click('.x-list tbody tr'); await p.waitForTimeout(300);
  for(const tab of ['공부 시간','입실 시각','계획','사진 관찰']){ await p.click(`.x-tabs button:has-text("${tab}")`); await p.waitForTimeout(400);
   const c=await contrast(p,'.x-page'); console.log(scheme,nm,tab,'\n  '+c.join('\n  '));
   if(nm==='탁예린') await p.locator('.x-panel').screenshot({path:`x-1600-${scheme}-탁예린-${tab.replace(' ','')}-cont.png`});
 }}
 await p.close();
}
await b.close();
