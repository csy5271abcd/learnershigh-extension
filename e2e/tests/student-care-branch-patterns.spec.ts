import {test,expect} from '@playwright/test'
import {mkdirSync} from 'node:fs'
const evidence=process.env.CARE_EVIDENCE_DIR??'test-results/care-evidence'
mkdirSync(evidence,{recursive:true})

test('branch patterns expose several students, date-local absences, and average comparison',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 await expect(page.getByText('집계 기준',{exact:true})).toHaveCount(0)
 const study=page.locator('[data-metric=study]')
 await expect(study.getByRole('heading',{name:'학습 시간',exact:true})).toBeVisible()
 expect(await study.locator('.bov-pattern-row').count()).toBeGreaterThan(1)
 await study.locator('.bov-pattern-row input').first().check()
 await study.locator('.bov-pattern-row input').nth(1).check()
 await expect(study.locator('.bov-selected-line')).toHaveCount(2)
 const arrival=page.locator('[data-metric=arrival]')
 expect(await arrival.locator('.bov-pattern-row').count()).toBeGreaterThan(1)
 await expect(arrival.locator('.bov-pattern-head time')).toHaveCount(7)
 const absence=page.locator('[data-metric=absence]')
 const date=absence.locator('.bov-absence button:not([data-count="0"]):not([data-count="unknown"])').first()
 await date.click()
 const inline=absence.getByRole('region',{name:'날짜별 결석 학생'})
 await expect(inline).toBeVisible()
 expect(await inline.getByRole('button').count()).toBeGreaterThan(0)
 const name=(await inline.getByRole('button').first().innerText()).replace(' →','')
 await inline.getByRole('button').first().click()
 await expect(absence.getByRole('region',{name:`${name} 출결 기록`,exact:true})).toBeVisible()
 await expect(page.getByRole('tab',{name:'학습관별',exact:true})).toHaveAttribute('aria-selected','true')
})

test('six comparisons keep dates visible and can be removed after the list filter changes',async({page})=>{
 test.setTimeout(120000)
 await page.route('https://**',r=>r.abort())
 for(const width of [850,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care/5')
  await page.getByRole('tab',{name:'학습관별',exact:true}).click()
  const study=page.locator('[data-metric=study]')
  await study.locator('.bov-pattern-more').click()
  const checks=study.locator('.bov-pattern-row input')
  for(let i=0;i<6;i++)await checks.nth(i).check()
  await expect(checks.nth(6)).toBeDisabled()
  await study.getByRole('button',{name:'변화 학생만',exact:true}).click()
  await expect(study.locator('.bov-selected-line')).toHaveCount(6)
  await study.locator('.bov-distribution-date-hit').nth(2).hover({position:{x:2,y:5}})
  const tip=study.getByRole('tooltip')
  await expect(tip).toBeVisible()
  const tr=await tip.boundingBox(),date=await study.locator('.bov-date>text').first().boundingBox()
  expect(tr!.y+tr!.height).toBeLessThanOrEqual(date!.y)
  expect(tr!.x).toBeGreaterThanOrEqual(0)
  expect(tr!.x+tr!.width).toBeLessThanOrEqual(width)
  await page.screenshot({path:`${evidence}/six-selected-${width}.png`})
  await study.locator('.bov-key button').first().click()
  await expect(study.locator('.bov-selected-line')).toHaveCount(5)
 }
})


test('chart details expand inside the clicked card without jumping to the page bottom',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 expect(await page.getByLabel('학습관',{exact:true}).innerText()).not.toMatch(/대형|중형|소형/)
 const card=page.locator('[data-metric=arrival]')
 await expect(card).not.toContainText('60분 이상')
 const target=card.locator('.bov-distribution-date-hit').nth(2)
 await target.scrollIntoViewIfNeeded()
 const before=await page.evaluate(()=>scrollY)
 await target.click({position:{x:2,y:5}})
 await expect(card.getByRole('region',{name:'입실 변화 학생별 기록',exact:true})).toBeVisible()
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(5)
 await card.getByRole('button',{name:'접기',exact:true}).click()
 await expect(card.locator('.bov-detail')).toHaveCount(0)
})

test('named change markers show exact values and open local seven-day records',async({page})=>{
 test.setTimeout(120000)
 await page.route('https://**',r=>r.abort())
 for(const width of [1600,850,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care/5')
  await page.getByRole('tab',{name:'학습관별',exact:true}).click()
  const study=page.locator('[data-metric=study]'),label=study.locator('.bov-tail-name').first()
  const name=(await label.textContent())!.trim()
  await label.hover()
  const tip=study.getByRole('tooltip')
  await expect(tip).toContainText(name)
  await expect.poll(async()=>{
   const t=await tip.boundingBox(),d=await study.locator('.bov-date text').first().boundingBox()
   return t&&d?t.y+t.height-d.y:999
  }).toBeLessThan(0)
  await label.click()
  const detail=study.getByRole('region',{name:`${name} 학습 시간 기록`,exact:true})
  await expect(detail).toBeVisible()
  await expect(detail.locator('tbody tr')).toHaveCount(7)
  await expect(page.getByRole('tab',{name:'학습관별',exact:true})).toHaveAttribute('aria-selected','true')
  await page.mouse.move(0,0)
  await page.screenshot({path:`${evidence}/student-local-${width}.png`,fullPage:true})
  await detail.getByRole('button',{name:'닫기',exact:true}).click()
  await expect(detail).toHaveCount(0)
 }
})

test('current study average includes visits without a usable baseline and unknown arrival is not zero',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const payload=await(await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 let minutes=0,samples=0
 for(const row of payload.students){
  for(const day of row.review.days)if(day.scheduled!==false&&day.attendance==='PRESENT'&&day.minutes!==null){minutes+=day.minutes;samples++}
  for(const base of row.review.weekdayBaseline){base.minutes=0;base.startMinutes=null}
 }
 await page.route('**/api/admin/student-care/metrics?branchId=demo_large',r=>r.fulfill({json:payload}))
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 await expect.poll(async()=>Number(await page.locator('[data-metric=study] .bov-summary strong').getAttribute('data-average'))).toBeCloseTo(minutes/samples,6)
 await expect(page.locator('[data-metric=arrival] .bov-summary strong')).toHaveText('—')
 await expect(page.locator('[data-metric=arrival]')).toContainText('비교 기록 없음')
 await expect(page.locator('[data-metric=arrival] .bov-tail-point')).toHaveCount(0)
})

test('a whole group shift is visible without cross-sectional outliers and late changes do not hide behind early arrivals',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const payload=await(await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 for(const row of payload.students)for(const day of row.review.days){
  const base=row.review.weekdayBaseline.find((b:{date:string})=>b.date===day.date)
  day.scheduled=true;day.attendance='PRESENT';day.startMinutes=700;day.minutes=50;base.startMinutes=600;base.minutes=100
 }
 await page.route('**/api/admin/student-care/metrics?branchId=demo_large',r=>r.fulfill({json:payload}))
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 for(const kind of ['study','arrival'])await expect(page.locator(`[data-metric=${kind}] .bov-tail-point`)).toHaveCount(420)
 await expect(page.locator('[data-metric=arrival] .bov-summary strong')).toHaveText('60명')
 const more=page.locator('[data-metric=arrival]').getByRole('button',{name:'변화 학생 60명 전체 기록',exact:true})
 await more.click()
 await expect(page.locator('[data-metric=arrival] .bov-impact-tools')).toContainText('최근 7일')
})

test('an extra visit keeps its actual study and clock instead of becoming an off-day dash',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const payload=await(await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 const row=payload.students[0],day=row.review.days[0],base=row.review.weekdayBaseline.find((b:{date:string})=>b.date===day.date)
 day.scheduled=false;day.attendance='PRESENT';day.minutes=120;day.startMinutes=620;base.minutes=100;base.startMinutes=600
 await page.route('**/api/admin/student-care/metrics?branchId=demo_large',r=>r.fulfill({json:payload}))
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const study=page.locator('[data-metric=study]')
 const date=`${Number(day.date.slice(5,7))}/${Number(day.date.slice(8))}`
 const point=study.getByRole('button',{name:`${row.student.studentName} ${date} +20%`,exact:true})
 await point.focus();await point.press('Enter')
 const detail=study.getByRole('region',{name:`${row.student.studentName} 학습 시간 기록`,exact:true})
 await expect(detail.locator('tbody tr').first()).toContainText('2시간')
})

test('optional marker explanations expose the configured meaning without a permanent threshold paragraph',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const settings=await(await page.request.get('/api/admin/student-care/settings?branchId=demo_large')).json()
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=arrival]')
 await expect(card.locator('.bov-meaning')).toHaveCount(0)
 await card.getByRole('button',{name:'입실 지연 표시 기준',exact:true}).click()
 await expect(card.locator('.bov-meaning')).toContainText(`${settings.startShiftMinutes}분`)
 await card.getByRole('button',{name:'입실 지연 표시 기준',exact:true}).click()
 await expect(card.locator('.bov-meaning')).toHaveCount(0)
})

test('an actual plan submission remains visible even with no entry and no scheduled visit',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const payload=await(await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 const row=payload.students[0],day=row.review.days[0]
 day.scheduled=false;day.attendance='UNSCHEDULED';day.submission='SUBMITTED';day.minutes=0;day.startMinutes=null
 await page.route('**/api/admin/student-care/metrics?branchId=demo_large',r=>r.fulfill({json:payload}))
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=submission]')
 await card.getByRole('textbox',{name:'계획 미제출 학생 검색',exact:true}).fill(row.student.studentName)
 await card.locator('.bov-pattern-name button').click()
 const detail=card.getByRole('region',{name:`${row.student.studentName} 계획 제출 기록`,exact:true})
 await expect(detail.locator('tbody tr').first()).toContainText('제출')
})

test('missing-day identity lines break and missing comparison symbols have an explicit key',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care/5')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=study]')
 await expect(card.locator('.bov-pattern-legend')).toContainText('— 일정 없음 · ? 비교 기록 부족')
 await card.getByRole('button',{name:'이하린 변화 기록',exact:true}).click()
 const data=await(await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 const row=data.students.find((r:{student:{studentName:string}})=>r.student.studentName==='이하린')
 const days=row.review.days
 const expected=days.filter((d:{attendance:string;minutes:number|null},i:number)=>i>0&&d.attendance==='PRESENT'&&d.minutes!==null&&days[i-1].attendance==='PRESENT'&&days[i-1].minutes!==null).length
 await expect(card.locator('.bov-selected-line line')).toHaveCount(expected)
})
