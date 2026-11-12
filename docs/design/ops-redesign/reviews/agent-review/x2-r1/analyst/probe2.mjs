import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const p = await b.newPage({ viewport:{width:1280,height:900} });
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500);
await p.locator('tr',{hasText:'탁예린'}).first().click(); await p.waitForTimeout(1500);
console.log(await p.evaluate(()=>{const t=[...document.querySelectorAll('*')].find(e=>e.textContent.trim()==='학습관 생활'&&e.children.length==0);let r=[];let e=t;while(e&&e!==document.body){r.push(e.tagName+'.'+e.className+'|'+(e.getAttribute('role')||''));e=e.parentElement}return r.join('\n')}));
await b.close();
