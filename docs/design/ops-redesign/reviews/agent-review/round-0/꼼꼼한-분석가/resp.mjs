import { browser, page, audit, contrast } from './lib.mjs';
const b=await browser();
for(const v of ['x','y','z2']) for(const W of [1600,1280,1024]) for(const scheme of ['light','dark']){
  const p=await page(b,W,scheme,'/student-care/'+v);
  const o=await p.evaluate(()=>{const d=document.documentElement;const wide=[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0}).slice(0,5).map(e=>e.tagName+'.'+String(e.className).slice(0,40)+' r='+Math.round(e.getBoundingClientRect().right));return {sw:d.scrollWidth,cw:d.clientWidth,wide}});
  const root=v==='x'?'.x-page':v==='y'?'.y-page':'.z-page';
  const a=await audit(p,root); const c=await contrast(p,root);
  console.log(`${v} ${W} ${scheme} scroll ${o.sw}/${o.cw} wide=${o.wide.join(';')}\n   audit:${a.slice(0,6).join(' / ')}\n   contrast:${c.slice(0,6).join('\n            ')}`);
  if(scheme==='dark'||W!==1600) await p.screenshot({path:`${v}-${W}-${scheme}-top.png`});
  await p.close();
}
await b.close();
