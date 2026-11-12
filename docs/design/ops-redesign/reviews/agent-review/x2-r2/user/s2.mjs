import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.addStyleTag({content:'header[class*=header]{position:static!important}'})
await p.getByText('구서아').first().click(); await p.waitForTimeout(1500)
await p.screenshot({path:'02-seoa.png'})
console.log((await p.innerText('body')).replace(/[\s\S]*?구서아/,'구서아').slice(0,3000))
await b.close()
