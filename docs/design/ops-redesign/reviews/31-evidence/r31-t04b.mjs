// 31차 독립 검토(Claude): 비교선 범례 이름의 실제 크기와 그림 글자(머리 숫자·▲) 겹침 측정. 실제 자료, 읽기 전용.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
const records=[],errors=[],blocked=[];
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const v of ['a','c'])for(const metric of ['학습 시간','입실 시각']){
  const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});p.setDefaultTimeout(7000);
  await p.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():(blocked.push(r.request().url()),r.abort()));
  try{
    await p.goto('http://localhost:5174/student-care/'+v);await p.getByRole('tab').first().waitFor();await p.waitForTimeout(400);
    await p.getByRole('tab',{name:v==='c'?'학습관 현황':'학습관별',exact:true}).click();
    await p.locator('.v5-bands th button').filter({hasText:metric}).click();
    const root=p.locator('.v5-inline-detail');
    await root.locator('svg g[role=button]').first().click();await p.waitForTimeout(150);
    const result=root.locator('.v5-result').last();
    for(let i=0;i<3;i++){await result.getByRole('button',{name:'비교',exact:true}).first().click();await p.waitForTimeout(60);}
    const m=await root.locator('.v5-plot').first().evaluate(plot=>{
      const R=e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
      const keys=[...plot.querySelectorAll(".v5-key-line")].map(e=>{const rg=document.createRange();rg.selectNodeContents(e);return{name:e.textContent,box:R(e),...R(rg)}});
      const texts=[...plot.querySelectorAll('svg text')].filter(t=>t.textContent.trim()).map(t=>({t:t.textContent,...R(t)}));
      const hit=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
      return{keys,overlaps:keys.flatMap(k=>texts.filter(t=>hit(k,t)).map(t=>k.name+'×'+t.t))};
    });
    records.push({v,width,theme,metric,...m});
    if(metric==='입실 시각')await root.locator('.v5-plot').first().screenshot({path:dir+`r31-t04b-${v}-start-${width}-${theme}.png`});
  }catch(e){errors.push({v,width,theme,metric,error:e.message.split('\n')[0]});}
  await p.close();
}
await b.close();
writeFileSync(dir+'r31-t04b.json',JSON.stringify({records,errors,blocked},null,2));
console.log(JSON.stringify({states:records.length,errors,blocked:blocked.length}));
