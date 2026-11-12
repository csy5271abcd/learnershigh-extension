import { browser, page, audit, contrast } from './lib.mjs';
const b=await browser();
const scheme=process.argv[2]||'light', W=+(process.argv[3]||1600);
const p=await page(b,W,scheme,'/student-care/y');
await p.waitForTimeout(1500);
await p.screenshot({path:`y-${W}-${scheme}-viewport.png`});
// header crop
await p.locator('.y-table thead').screenshot({path:`y-${W}-${scheme}-thead.png`});
console.log('contrast', (await contrast(p,'.y-page')).join('\n '));
for(const nm of (process.argv[4]||'').split(',').filter(Boolean)){
  await p.fill('.y-search',nm); await p.waitForTimeout(250);
  const row=p.locator('.y-table tbody tr').first(); 
  await row.screenshot({path:`y-${W}-${scheme}-${nm}-row.png`});
  await row.click(); await p.waitForTimeout(500);
  const det=p.locator('.y-detail').first();
  const a=await audit(p,'.y-detail'); console.log(nm, a.length?'\n  '+a.join('\n  '):'ok');
  await det.screenshot({path:`y-${W}-${scheme}-${nm}-detail.png`});
  const txt=await p.locator('.y-table tbody tr').first().innerText(); console.log('  row:',txt.replace(/\s+/g,' '));
  await row.click(); await p.waitForTimeout(150);
}
console.log('errors',p._errs);
await b.close();
