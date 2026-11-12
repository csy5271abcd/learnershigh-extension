import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.addStyleTag({content:'header[class*=header]{position:static!important}'})
await p.getByRole('tab',{name:'학습관별'}).or(p.getByText('학습관별',{exact:true})).first().click(); await p.waitForTimeout(1500)
await p.screenshot({path:'20-branch.png',fullPage:true})
console.log((await p.innerText('body')).replace(/[\s\S]*학습관별\n/,'').slice(0,3500))
await b.close()
