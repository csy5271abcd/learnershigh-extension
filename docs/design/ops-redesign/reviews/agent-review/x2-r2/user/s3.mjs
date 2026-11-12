import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
const p = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:'light' })
await p.goto('http://localhost:5174/student-care/x2'); await p.waitForTimeout(2500)
await p.getByText('구서아').first().click(); await p.waitForTimeout(1200)
// find scroll container
const sc = await p.evaluate(()=>{const els=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50&&getComputedStyle(e).overflowY.match(/auto|scroll/));return els.map(e=>e.className+':'+e.scrollHeight+'/'+e.clientHeight)})
console.log(sc)
const sel = await p.evaluateHandle(()=>[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50&&getComputedStyle(e).overflowY.match(/auto|scroll/)).pop())
await sel.evaluate(e=>e.scrollTop=700); await p.waitForTimeout(400); await p.screenshot({path:'03-seoa-scroll1.png'})
await sel.evaluate(e=>e.scrollTop=1500); await p.waitForTimeout(400); await p.screenshot({path:'04-seoa-scroll2.png'})
// chip click: 계획 미제출
await sel.evaluate(e=>e.scrollTop=0)
const chip = p.locator('button:has-text("미제출 6일")').first()
console.log('chip count', await chip.count())
await chip.click(); await p.waitForTimeout(900); await p.screenshot({path:'05-chip-plan.png'})
await sel.evaluate(e=>e.scrollTop=0)
await p.locator('button:has-text("결석 6일")').first().click(); await p.waitForTimeout(900); await p.screenshot({path:'06-chip-absent.png'})
await b.close()
