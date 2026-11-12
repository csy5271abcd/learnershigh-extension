import { browser, page } from './lib.mjs';
const b=await browser(); const p=await page(b,1600,'light','/student-care/y');
console.log(await p.evaluate(()=>{const t=document.querySelector('.yc-head text');const cs=getComputedStyle(t);const m=document.querySelector('.yc-track');return [cs.fill,cs.fontSize,getComputedStyle(m).fill, getComputedStyle(document.querySelector('.y-card')).backgroundColor, getComputedStyle(document.querySelector('.y-table th small')||document.body).color]}));
await b.close();
