import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.addStyleTag({content:'header[class*=header]{position:static!important}'})
await p.getByText('학습관별',{exact:true}).first().click(); await p.waitForTimeout(1200)
const h = p.getByText('공부 시간 변화').first(); await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(300)
await p.screenshot({path:'21-change.png'})
// click first 줄어듦 bar: find svg rects
const info = await p.evaluate(()=>{const s=[...document.querySelectorAll('[class*=x2]')].length;return s})
console.log(info)
await b.close()
