import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
for (const cs of ['light','dark']) {
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:cs })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.addStyleTag({content:'header[class*=header]{position:static!important}'})
await p.getByText('학습관별',{exact:true}).first().click(); await p.waitForTimeout(1200)
// click gray bar on 11/5 : approx coordinates
await p.mouse.move(406,620); await p.waitForTimeout(400); await p.screenshot({path:`22-hover-${cs}.png`,clip:{x:270,y:400,width:960,height:380}})
await p.mouse.click(406,620); await p.waitForTimeout(1000)
await p.screenshot({path:`23-click-${cs}.png`})
const t=(await p.innerText('body')); console.log(cs, t.slice(t.indexOf('공부 시간 변화'), t.indexOf('공부 시간 변화')+100).replace(/\n/g,' | '))
if(cs==='light') console.log(t.slice(-900))
await p.close()}
await b.close()
