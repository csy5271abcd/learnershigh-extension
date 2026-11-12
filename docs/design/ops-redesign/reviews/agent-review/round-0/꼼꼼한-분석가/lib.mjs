import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
export async function browser(){ return chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' }) }
export async function page(b, w, scheme, path){
  const p = await b.newPage({ viewport:{width:w,height:1000}, colorScheme:scheme });
  p._errs=[]; p.on('console',m=>{if(m.type()==='error')p._errs.push(m.text())}); p.on('pageerror',e=>p._errs.push('pageerror '+e.message));
  await p.goto('http://localhost:5174'+path,{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
  await p.addStyleTag({content:'header[class*=header]{position:static!important}'});
  return p;
}
// overlap audit inside root selector
export async function audit(p, root){
  return p.evaluate((root)=>{
    const R=document.querySelector(root); if(!R) return ['no root '+root];
    const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&cs.opacity!=='0'};
    const texts=[...R.querySelectorAll('svg text')].filter(vis).filter(t=>t.textContent.trim());
    const marks=[...R.querySelectorAll('svg rect, svg circle, svg line')].filter(vis).filter(e=>!/hit|grid|track|axis/.test(e.getAttribute('class')||''));
    const out=[];
    const box=e=>{const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom}};
    const ov=(a,b,pad=0.5)=>Math.min(a.r,b.r)-Math.max(a.l,b.l)>pad&&Math.min(a.b,b.b)-Math.max(a.t,b.t)>pad;
    const tb=texts.map(t=>({t,b:box(t)}));
    for(let i=0;i<tb.length;i++)for(let j=i+1;j<tb.length;j++){ if(tb[i].t.contains(tb[j].t)||tb[j].t.contains(tb[i].t)) continue; if(ov(tb[i].b,tb[j].b,1)) out.push(`TEXT×TEXT "${tb[i].t.textContent}" × "${tb[j].t.textContent}"`)}
    for(const {t,b} of tb){ const svg=t.ownerSVGElement.getBoundingClientRect(); if(b.l<svg.left-0.5||b.r>svg.right+0.5||b.t<svg.top-0.5||b.b>svg.bottom+0.5) out.push(`CLIP "${t.textContent}" svg=${Math.round(svg.left)}-${Math.round(svg.right)} text=${Math.round(b.l)}-${Math.round(b.r)} y ${Math.round(b.t)}-${Math.round(b.b)} svgY ${Math.round(svg.top)}-${Math.round(svg.bottom)}`)
      for(const m of marks){ if(m.ownerSVGElement!==t.ownerSVGElement) continue; const mb=box(m); if((m.getAttribute('class')||'').includes('usual')&&false) continue; if(ov(b,mb,1.5)) out.push(`TEXT×MARK "${t.textContent}" × ${m.tagName}.${m.getAttribute('class')}`)} }
    // html overflow
    for(const e of R.querySelectorAll('*')){ if(e.closest('svg')) continue; if(e.scrollWidth>e.clientWidth+1 && ['hidden','clip'].includes(getComputedStyle(e).overflowX) && e.clientWidth>0 && e.children.length===0) out.push(`HTML-CLIP ${e.tagName}.${e.className} "${(e.textContent||'').slice(0,30)}"`) }
    return out;
  }, root);
}
export async function contrast(p, root){
  return p.evaluate((root)=>{
    const R=document.querySelector(root); if(!R) return [];
    const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}};
    const lum=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
    const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
    const bgOf=e=>{for(let n=e;n;n=n.parentElement){ if(n instanceof SVGElement && n.tagName!=='svg') continue; const c=parse(getComputedStyle(n).backgroundColor); if(c&&c.a>0.5) return c;} return {r:255,g:255,b:255,a:1}};
    const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity)>0.2};
    const out=new Map();
    const add=(kind,fg,bg,need,sample,op=1)=>{if(!fg||fg.a<0.05)return; const r=ratio(fg,bg); if(r<need){const k=`${kind} fg=rgb(${fg.r},${fg.g},${fg.b}) bg=rgb(${bg.r},${bg.g},${bg.b}) ${r.toFixed(2)}:1 <${need}`; if(!out.has(k)) out.set(k,[]); if(out.get(k).length<4) out.get(k).push(sample)}};
    for(const t of R.querySelectorAll('svg text')){ if(!vis(t)||!t.textContent.trim())continue; const cs=getComputedStyle(t); const fs=parseFloat(cs.fontSize); add('svgtext',parse(cs.fill),bgOf(t),fs>=18.66||(fs>=14&&+cs.fontWeight>=700)?3:4.5,t.textContent.trim().slice(0,20))}
    for(const m of R.querySelectorAll('svg rect, svg circle, svg line, svg path')){ const c=m.getAttribute('class')||''; if(/hit|grid|track|band/.test(c)||!vis(m))continue; const cs=getComputedStyle(m); const fg=parse(m.tagName==='line'?cs.stroke:cs.fill); if(fg) {fg.a*=parseFloat(cs.opacity)||1;} if(fg&&fg.a>0.3) add('mark.'+c,fg,bgOf(m),3,c)}
    const walker=document.createTreeWalker(R,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){const n=walker.currentNode; if(!n.textContent.trim())continue; const e=n.parentElement; if(e.closest('svg')||!vis(e))continue; const cs=getComputedStyle(e); const fs=parseFloat(cs.fontSize); add('text',parse(cs.color),bgOf(e),fs>=18.66||(fs>=14&&+cs.fontWeight>=700)?3:4.5,n.textContent.trim().slice(0,20))}
    return [...out.entries()].map(([k,v])=>k+' e.g. '+v.join(' | '));
  },root);
}
