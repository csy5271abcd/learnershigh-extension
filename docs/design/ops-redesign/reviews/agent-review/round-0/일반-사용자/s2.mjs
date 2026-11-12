import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const v=process.argv[2];
const p = await b.newPage({ viewport:{width:1600,height:1000}, colorScheme:'light' });
await p.goto('http://localhost:5174/student-care/'+v); await p.waitForTimeout(2500);
const els = await p.evaluate(()=>[...document.querySelectorAll('main button, main [role=tab], main select, main input, main textarea, main a, main th[aria-sort], main [tabindex]')].map(e=>`${e.tagName} ${e.getAttribute('role')||''} [${(e.innerText||e.getAttribute('aria-label')||e.placeholder||'').replace(/\s+/g,' ').slice(0,40)}] ${e.className.toString().slice(0,40)}`));
console.log([...new Set(els)].slice(0,120).join('\n'));
await b.close();
