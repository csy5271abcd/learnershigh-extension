import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b=await chromium.launch({executablePath:'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe'})
const p=await b.newPage({viewport:{width:1280,height:900},colorScheme:'light'})
await p.goto('http://localhost:5174/student-care/x2');await p.waitForTimeout(2500)
await p.addStyleTag({content:'header[class*=header]{position:static!important}'})
await p.click('tr[aria-label="강하준 상세 열기"]');await p.waitForTimeout(1500)
console.log(await p.evaluate(()=>{const d=document.querySelector('[role=dialog]');return d?d.className+' '+d.innerText.slice(0,2500):'none'}))
await p.screenshot({path:'d-ganghajun.png'})
await b.close()
