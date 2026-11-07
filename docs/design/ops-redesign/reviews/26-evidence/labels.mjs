import{createRequire}from'node:module';import{writeFileSync}from'node:fs';
const require=createRequire(new URL('../../../../../e2e/package.json',import.meta.url));const{chromium}=require('@playwright/test');const dir=new URL('./',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');const b=await chromium.launch({channel:'chrome',args:['--no-proxy-server']});const out=[];
for(const width of [1600,1280])for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width,height:900},colorScheme:theme});await p.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort());await p.goto('http://localhost:5174/student-care/a');await p.waitForTimeout(1200);await p.getByRole('tab',{name:'학습관별',exact:true}).click();await p.waitForTimeout(200);
 const result=await p.locator('#a-metric-absence svg').evaluate(s=>{const texts=[...s.querySelectorAll('text')].filter(e=>/10\//.test(e.textContent));return texts.slice(0,-1).map((a,i)=>{const bb=a.getBoundingClientRect(),bc=texts[i+1].getBoundingClientRect();return{a:a.textContent,b:texts[i+1].textContent,gap:bc.left-bb.right};});});await p.screenshot({path:dir+`a-date-labels-${width}-${theme}.png`});out.push({width,theme,result});await p.close();
}
await b.close();writeFileSync(dir+'labels.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));
