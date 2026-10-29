import {test,expect,type Page} from '@playwright/test'
import {writeFileSync} from 'node:fs'
test.setTimeout(90_000)
const base='/api/admin/student-care',branch='br_gangnam',student='stu_002'
const out='C:/Users/green/.codex/visualizations/2026/10/23/01a1691a-65a2-76b1-b9a0-578fcef98c40/oct26-diverse-data'
async function open(page:Page){await page.route('https://**',r=>r.abort());await page.goto('/student-care',{waitUntil:'domcontentloaded'});await expect(page.locator('.rs-summary')).toHaveCount(10)}
test('live roster and branch use bulk server values; selected detail uses the same server source',async({page})=>{
 const requested:string[]=[];page.on('request',r=>{if(r.url().includes(base))requested.push(r.url())})
 const metrics=await (await page.request.get(`${base}/metrics?branchId=${branch}`)).json()
 await open(page)
 expect(requested.filter(u=>u.includes('/students/'))).toHaveLength(0)
 expect(requested.some(u=>u.includes('/metrics?'))).toBe(true)
 const raw=metrics.students.find((s:{student:{studentId:string}})=>s.student.studentId===student).review
 const minutes=raw.current.studyMinutes
 await expect(page.locator('.rs-summary').filter({has:page.locator(`#rs-open-${student}`)})).toContainText(`${Math.floor(minutes/60)}시간 ${minutes%60}분`)
 await page.locator(`#rs-open-${student}`).click();await expect(page.locator('.cm-status-card')).toBeVisible()
 expect(requested.some(u=>u.includes(`/students/${student}?`))).toBe(true)
 for(let d=18;d<=24;d++)await expect(page.locator('.cm-status-card')).toContainText(`10/${d}`)
 const shares=await page.locator('.cm-subject-pair b').allTextContents()
 expect(shares.every(s=>!/[.]\d{2}/.test(s))).toBe(true)
 await page.screenshot({path:`${out}/final5-live-detail.png`,fullPage:true})
 await page.locator('.rs-detail-head h2').scrollIntoViewIfNeeded()
 await page.screenshot({path:`${out}/final5-live-detail-context.png`})
 await page.getByRole('tab',{name:'학습관별',exact:true}).click();const distribution=page.locator('.cm-branch-chart').first()
 await expect(distribution.locator('.cm-student-picker button[aria-pressed]')).toHaveCount(10)
 await distribution.locator('.cm-day-target').first().hover()
 await distribution.getByRole('button',{name:'최학생 비교',exact:true}).click()
 await expect(distribution.locator('.cm-selected-line')).toHaveCount(1)
 await expect(distribution.getByRole('button',{name:'최학생 비교',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.screenshot({path:`${out}/final5-live-branch.png`,fullPage:true})
 await distribution.screenshot({path:`${out}/final5-live-distribution.png`})
 writeFileSync(`${out}/final5-live-network.json`,JSON.stringify({requests:requested,studyMinutes:minutes,baselineFrom:raw.baselineFrom,baselineTo:raw.baselineTo,shares},null,2))
})
test('live settings PUT survives reload and is restored after verification',async({page})=>{
 const settingsUrl=`${base}/settings?branchId=${branch}`
 const original=await (await page.request.get(settingsUrl)).json()
 const changed=original.planMissingDays===2?3:2
 try{
  await open(page);await page.getByRole('button',{name:'관리 기준 설정',exact:true}).click()
  await page.getByLabel('계획 미제출 (7일 중)',{exact:true}).fill(String(changed))
  const response=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/settings?'))
  await page.getByRole('button',{name:'저장',exact:true}).click();expect((await response).ok()).toBe(true)
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'관리 기준 설정',exact:true}).click()
  await expect(page.getByLabel('계획 미제출 (7일 중)',{exact:true})).toHaveValue(String(changed))
  expect((await (await page.request.get(settingsUrl)).json()).planMissingDays).toBe(changed)
 }finally{const {ranges,...values}=original;void ranges;expect((await page.request.put(settingsUrl,{data:values})).ok()).toBe(true)}
})
test('live counseling POST and memo persist in inline/all history after browser reload',async({page})=>{
 const memo=`API 연결 검증 ${Date.now()}`
 const detailUrl=`${base}/students/${student}?branchId=${branch}`
 const before=await (await page.request.get(detailUrl)).json()
 await open(page);await page.locator(`#rs-open-${student}`).click()
 await expect(page.getByLabel('상담 내용',{exact:true})).toBeVisible()
 await page.getByRole('radio',{name:'면담',exact:true}).check()
 await page.getByLabel('상담 내용',{exact:true}).fill(memo)
 if(!before.activeCase)await page.getByRole('radio',{name:'계속 관리',exact:true}).check()
 const savedResponse=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes(`${base}/cases`))
 await page.getByRole('button',{name:'저장',exact:true}).click();const saved=await savedResponse;expect(saved.ok()).toBe(true)
 await page.getByRole('button',{name:'과거 관리 이력',exact:false}).click(); await expect(page.locator('.cm-history')).toContainText(memo)
 const after=await (await page.request.get(detailUrl)).json()
 if(!before.activeCase)expect(after.activeCase.recheckDate).toBe('2026-11-01')
 await page.getByRole('tab',{name:'관리 이력',exact:true}).click();await expect(page.locator('.sc-all')).toContainText(memo)
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'관리 이력',exact:true}).click();await expect(page.locator('.sc-all')).toContainText(memo)
 const history=await (await page.request.get(`${base}/students/${student}/history?branchId=${branch}`)).json()
 expect(history.items.some((item:{content:string})=>item.content.includes(memo))).toBe(true)
 writeFileSync(`${out}/final5-live-save.json`,JSON.stringify({memo,caseId:after.activeCase.caseId,today:after.today,recheckDate:after.activeCase.recheckDate,historyItems:history.items.filter((i:{content:string})=>i.content.includes(memo))},null,2))
})
test('live GET failure shows retry and never substitutes preview records',async({page})=>{
 await page.route(`**${base}/metrics?**`,r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'SOURCE_UNAVAILABLE',message:'원본 연결 실패'})}))
 await page.goto('/student-care',{waitUntil:'domcontentloaded'})
 await expect(page.getByRole('alert')).toContainText('학생 기록을 불러오지 못했습니다')
 await expect(page.locator('.rs-summary')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'다시 시도',exact:true})).toBeVisible()
})
test('source missing, no-entry with unknown schedule and entry without time remain distinct',async({page})=>{
 const detail=await (await page.request.get(`${base}/students/${student}?branchId=${branch}`)).json()
 const [a,b,c]=detail.review.days
 Object.assign(a,{attendance:'UNKNOWN',scheduled:null,minutes:0,startMinutes:null,plannedMinutes:null,actualMinutes:0,submission:'MISSING'})
 Object.assign(b,{attendance:'UNKNOWN',scheduled:false,minutes:null,startMinutes:null,plannedMinutes:null,actualMinutes:null,submission:'UNKNOWN'})
 Object.assign(c,{attendance:'PRESENT',minutes:60,startMinutes:null})
 await page.route(`**${base}/students/${student}?**`,r=>r.fulfill({json:detail}))
 await open(page);await page.locator(`#rs-open-${student}`).click()
 const chart=page.locator('.cm-card').filter({has:page.getByRole('heading',{name:'입실 시각',exact:true})})
 for(const [index,label] of [[0,'미입실'],[1,'미확인'],[2,'시각 없음']] as const){await chart.locator('.cm-day-target').nth(index).hover();await expect(chart.getByRole('tooltip')).toContainText(label)}
})
