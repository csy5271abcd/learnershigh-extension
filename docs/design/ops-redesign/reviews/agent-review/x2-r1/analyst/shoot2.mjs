import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
import fs from 'fs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const out={};
for (const scheme of ['light','dark']) {
  const p = await b.newPage({ viewport:{width:1280,height:1400}, colorScheme:scheme });
  const go=async()=>{await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500); await p.addStyleTag({content:'header[class*=header]{position:static!important}'});};
  await go();
  await p.screenshot({path:`s2-list-${scheme}.png`});
  // overflow check
  out['overflow-'+scheme]=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  // 학습관별
  await p.getByRole('tab',{name:'학습관별'}).or(p.getByText('학습관별',{exact:true})).first().click(); await p.waitForTimeout(2500);
  await p.screenshot({path:`s2-branch-${scheme}.png`,fullPage:true});
  out['branchText-'+scheme]=(await p.innerText('body')).slice(0,3500);
  // weekly
  const wk=p.getByText('주별',{exact:false}).first(); if(await wk.count()){await wk.click().catch(()=>{});await p.waitForTimeout(1500);await p.screenshot({path:`s2-branch-week-${scheme}.png`,fullPage:true});}
  await go();
  await p.getByText('관리 기준',{exact:true}).first().click(); await p.waitForTimeout(1000);
  await p.screenshot({path:`s2-settings-${scheme}.png`});
  out['settings-'+scheme]=(await p.innerText('body')).slice(-2500);
  await p.close();
}
fs.writeFileSync('out2.json',JSON.stringify(out,null,1));
await b.close();
