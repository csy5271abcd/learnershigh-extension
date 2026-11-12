import { browser, page, audit, contrast } from './lib.mjs';
const b=await browser();
const scheme=process.argv[2]||'light', W=+(process.argv[3]||1600);
const p=await page(b,W,scheme,'/student-care/z2');
await p.waitForTimeout(1500);
await p.screenshot({path:`z2-${W}-${scheme}-viewport.png`});
for(const nm of (process.argv[4]||'').split(',').filter(Boolean)){
  await p.fill('.z-search',nm); await p.waitForTimeout(250);
  await p.locator(`[data-care-roster-row]`).first().click(); await p.waitForTimeout(700);
  // expand rest
  await p.evaluate(()=>document.querySelectorAll('.z-dialog details').forEach(d=>d.open=true)); await p.waitForTimeout(300);
  const a=await audit(p,'.z-dialog'); console.log(nm, a.length?'\n  '+a.join('\n  '):'ok');
  const c=await contrast(p,'.z-dialog'); if(c.length) console.log('  contrast '+c.join('\n  '));
  const t=await p.evaluate(()=>[...document.querySelectorAll('.z-dialog .zz-card h3, .z-dialog .zz-sub, .z-dialog summary, .z-dialog .zp-sum, .z-dialog .z2-head, .z-dialog .zz-zero')].map(e=>e.innerText.replace(/\s+/g,' ')).join(' | '));
  console.log('  text:',t);
  const st=await p.addStyleTag({content:'.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}'});
  await p.waitForTimeout(200);
  await p.locator('.z-dialog').screenshot({path:`z2-${W}-${scheme}-${nm}-dialog.png`});
  await st.evaluate(e=>e.remove());
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
}
console.log('errors',p._errs);
await b.close();
