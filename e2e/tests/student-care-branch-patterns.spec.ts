import {test,expect} from '@playwright/test'
import {mkdirSync} from 'node:fs'
const evidence=process.env.CARE_EVIDENCE_DIR??'test-results/care-evidence'
mkdirSync(evidence,{recursive:true})

test('branch patterns expose several students, date-local absences, and average comparison',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care')
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
 const date=absence.locator('.bov-absence button[data-unexpected=true]').first()
 await date.click()
 const inline=absence.getByRole('region',{name:'날짜별 미입실 학생'})
 await expect(inline).toBeVisible()
 expect(await inline.getByRole('link').count()).toBeGreaterThan(0)
 const link=inline.getByRole('link').first()
 const popupPromise=page.waitForEvent('popup')
 await link.click()
 const popup=await popupPromise
 await expect(popup.getByRole('tab',{name:'학생별',exact:true})).toHaveAttribute('aria-selected','true')
 await popup.close()
 await expect(page.getByRole('tab',{name:'학습관별',exact:true})).toHaveAttribute('aria-selected','true')
})

test('six comparisons keep dates visible and can be removed after the list filter changes',async({page})=>{
 test.setTimeout(120000)
 await page.route('https://**',r=>r.abort())
 for(const width of [850,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care')
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
  expect(await tip.evaluate(e=>e.scrollHeight<=e.clientHeight&&e.scrollWidth<=e.clientWidth)).toBe(true)
  await page.screenshot({path:`${evidence}/six-selected-${width}.png`})
  await study.locator('.bov-key button').first().click()
  await expect(study.locator('.bov-selected-line')).toHaveCount(5)
 }
})


test('chart details expand inside the clicked card without jumping to the page bottom',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 expect(await page.getByLabel('학습관',{exact:true}).innerText()).not.toMatch(/대형|중형|소형/)
 const card=page.locator('[data-metric=arrival]')
 await expect(card).not.toContainText('60분 이상')
 const target=card.locator('.bov-distribution-date-hit').nth(2)
 await target.scrollIntoViewIfNeeded()
 const before=await page.evaluate(()=>scrollY)
 await target.click({position:{x:2,y:5}})
 await expect(card.getByRole('region',{name:'입실 시간 학생별 기록',exact:true})).toBeVisible()
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(5)
 await card.getByRole('button',{name:'접기',exact:true}).click()
 await expect(card.locator('.bov-detail')).toHaveCount(0)
})

test('names isolate a graph and student links open the selected detail in a new tab',async({page})=>{
 test.setTimeout(120000)
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=study]')
 const label=card.locator('.bov-tail-name:not(.bov-tail-all)').first(),name=(await label.textContent())!.trim()
 await label.click()
 await expect(card.locator('.bov-selected-line')).toHaveCount(1)
 await expect(card.locator('.bov-change-line,.bov-distribution-band')).toHaveCount(0)
 // The branch average stays as a reference line for the selected student and can be switched off.
 expect(await card.locator('.bov-distribution-mean').count()).toBeGreaterThan(0)
 const meanToggle=card.getByRole('button',{name:'학습관 평균',exact:true})
 await meanToggle.click()
 await expect(meanToggle).toHaveAttribute('aria-pressed','false')
 await expect(card.locator('.bov-distribution-mean')).toHaveCount(0)
 await meanToggle.click()
 expect(await card.locator('.bov-distribution-mean').count()).toBeGreaterThan(0)
 const point=card.locator('.bov-population-point').first()
 await point.hover()
 await expect(card.locator('.bov-inline-tooltip')).toContainText('학습관 평균 변화')
 expect(await card.locator('.bov-population-point').count()).toBeLessThanOrEqual(7)
 await expect(card.locator('.bov-student-detail')).toHaveCount(0)
 await page.mouse.move(0,0)
 await card.screenshot({path:`${evidence}/single-student-graph.png`})
 await card.getByRole('button',{name:'전체 학생',exact:true}).click()
 expect(await card.locator('.bov-population-point').count()).toBeGreaterThan(7)
 for(const kind of ['study','absence']){
  const source=page.locator(`[data-metric=${kind}]`),link=source.locator('.bov-pattern-name a').first()
  const name=(await link.innerText()).trim(),href=await link.getAttribute('href')
  const popupPromise=page.waitForEvent('popup')
  await link.click()
  const popup=await popupPromise
  await expect(popup).toHaveURL(new RegExp(`studentId=${new URL(href!,'http://localhost').searchParams.get('studentId')}`))
  await expect(popup.getByRole('region',{name:`${name} 상세 지표`,exact:true})).toBeVisible()
  await expect(popup.getByRole('tab',{name:'학생별',exact:true})).toHaveAttribute('aria-selected','true')
  await popup.close()
  await expect(page.getByRole('tab',{name:'학습관별',exact:true})).toHaveAttribute('aria-selected','true')
  await expect(source.locator('.bov-student-detail')).toHaveCount(0)
 }
 await expect(page.locator('[data-metric=arrival] h3').first()).toHaveText('입실 시간')
 await page.screenshot({path:`${evidence}/name-toggle-and-graph-filter.png`,fullPage:true})
})

test('exact chart values stay outside the plot while hovering',async({page})=>{
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=study]'),plot=card.locator('.bov-plot'),readout=card.locator('.bov-inline-tooltip')
 const before=await plot.boundingBox()
 await card.locator('.bov-tail-name:not(.bov-tail-all)').first().hover()
 await expect(card.getByRole('tooltip')).toBeVisible()
 const box=await readout.boundingBox(),after=await plot.boundingBox()
 expect(box!.y+box!.height).toBeLessThanOrEqual(after!.y)
 expect(after!.y).toBe(before!.y)
 expect(await readout.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true)
 await page.mouse.move(0,0)
 await card.screenshot({path:`${evidence}/chart-readout-outside-plot.png`})
})

test('student graph selections belong to each metric independently',async({page})=>{
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const study=page.locator('[data-metric=study]'),arrival=page.locator('[data-metric=arrival]')
 await study.locator('.bov-tail-name:not(.bov-tail-all)').first().click()
 const studyId=await study.locator('.bov-population-point').first().getAttribute('data-student')
 await arrival.locator('.bov-tail-name:not(.bov-tail-all)').nth(1).click()
 await expect(study.locator('.bov-population-point').first()).toHaveAttribute('data-student',studyId!)
 await expect(study.locator('.bov-selected-line')).toHaveCount(1)
 await expect(arrival.locator('.bov-selected-line')).toHaveCount(1)
 await arrival.getByRole('button',{name:'전체 학생',exact:true}).click()
 await expect(study.locator('.bov-selected-line')).toHaveCount(1)
 await expect(arrival.locator('.bov-selected-line')).toHaveCount(0)
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
 await page.goto('/student-care')
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
 await page.goto('/student-care')
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
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const study=page.locator('[data-metric=study]')
 const date=`${Number(day.date.slice(5,7))}/${Number(day.date.slice(8))}`
 const point=study.getByRole('button',{name:`${row.student.studentName} ${date} +20%`,exact:true})
 await point.focus();await point.press('Enter')
 // The fixed readout above the chart shows the exact value of the focused point.
 const readout=study.locator('div').filter({hasText:new RegExp(`· ${row.student.studentName}`)}).filter({hasText:'평소'}).last()
 await expect(readout).toContainText('2시간')
 await expect(readout).toContainText('+20%')
})

test('optional marker explanations expose the configured meaning without a permanent threshold paragraph',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const settings=await(await page.request.get('/api/admin/student-care/settings?branchId=demo_large')).json()
 await page.goto('/student-care')
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
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=submission]')
 await card.getByRole('textbox',{name:'계획 미제출 학생 검색',exact:true}).fill(row.student.studentName)
 await expect(card.locator('.bov-pattern-cell').first()).toHaveText('제출')
})

test('missing-day identity lines break and missing comparison symbols have an explicit key',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=study]')
 // Missing comparisons stay '—' without the rejected '일정 없음 · 미확인' key.
 await expect(card.locator('.bov-pattern-legend')).not.toContainText('일정 없음')
 await card.getByRole('button',{name:'이하린 그래프만 보기',exact:true}).click()
 const data=await(await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 const row=data.students.find((r:{student:{studentName:string}})=>r.student.studentName==='이하린')
 const days=row.review.days
 const expected=days.filter((d:{attendance:string;minutes:number|null},i:number)=>i>0&&d.attendance==='PRESENT'&&d.minutes!==null&&days[i-1].attendance==='PRESENT'&&days[i-1].minutes!==null).length
 await expect(card.locator('.bov-selected-line line')).toHaveCount(expected)
})

test('absence days show unexcused counts, turn orange only with an unexcused absence, and list only unexcused students',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const response=await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')
 expect(response.ok()).toBe(true)
 const metrics=await response.json()
 // Same rule as the screen: no entry is an absence; four same-weekday baseline days without entry make it regular.
 const weekday=(date:string)=>new Date(`${date}T12:00:00Z`).getUTCDay()
 const expected=new Map<string,{total:number;unexpected:number;regular:number}>()
 for(const {review} of metrics.students)for(const day of review.days){
  const entry=expected.get(day.date)??{total:0,unexpected:0,regular:0}
  expected.set(day.date,entry)
  if(day.attendance==='PRESENT')continue
  const refs=review.baselineDays.filter((old:{date:string})=>old.date<day.date&&weekday(old.date)===weekday(day.date))
  const regular=refs.length===4&&refs.every((old:{attendance:string})=>old.attendance!=='PRESENT')
  entry.total++
  if(regular)entry.regular++
  else entry.unexpected++
 }
 const dates=[...expected.keys()].sort()
 expect([...expected.values()].some(e=>e.regular>0&&e.unexpected===0)).toBe(true)
 expect([...expected.values()].some(e=>e.regular>0&&e.unexpected>0)).toBe(true)

 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const absence=page.locator('[data-metric=absence]')
 // Everyone has a weekly day off, so the headline counts students with at least one unusual absence.
 const unusualStudents=metrics.students.filter((r:{review:{days:{date:string;attendance:string;minutes:number|null}[];baselineDays:{date:string;attendance:string;minutes:number|null}[]}})=>r.review.days.some(day=>{
  if(day.attendance==='PRESENT')return false
  const refs=r.review.baselineDays.filter(old=>old.date<day.date&&weekday(old.date)===weekday(day.date))
  return !(refs.length===4&&refs.every(old=>old.attendance!=='PRESENT'))
 })).length
 await expect(absence.locator('.bov-summary strong')).toHaveText(`${unusualStudents}명`)
 const buttons=absence.locator('.bov-absence button')
 await expect(buttons).toHaveCount(7)
 for(const [index,date] of dates.entries()){
  const e=expected.get(date)!
  await expect(buttons.nth(index)).toHaveAttribute('data-count',String(e.total))
  await expect(buttons.nth(index)).toHaveAttribute('data-unexpected',String(e.unexpected>0))
 }

 // A mixed day shows every count but lists names only for unexcused absences.
 const mixed=dates.findIndex(date=>{const e=expected.get(date)!;return e.regular>0&&e.unexpected>0})
 const e=expected.get(dates[mixed])!
 await buttons.nth(mixed).click()
 const list=absence.getByRole('region',{name:'날짜별 미입실 학생'})
 await expect(list.locator('.bov-absence-counts')).toContainText(`결석(무단) ${e.unexpected}명 · 결석(정기) ${e.regular}명`)
 await expect(list.locator('[data-pattern=regular]')).toHaveCount(0)
 await expect(list.locator('[data-pattern=unexpected] a')).toHaveCount(e.unexpected)
 await page.screenshot({path:`${evidence}/absence-mixed-day.png`,fullPage:false})
})

test('hovering a student row highlights that line; 특이 and 정상 views split the population',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const card=page.locator('[data-metric=study]')
 const row=card.locator('.bov-pattern-row').nth(2),id=await row.getAttribute('data-student')
 await row.hover()
 await expect(card.locator('.bov-distribution')).toHaveClass(/has-focus/)
 await expect(card.locator('g.is-focus')).toHaveCount(1)
 await expect(card.locator(`circle.is-focus[data-student="${id}"]`).first()).toBeVisible()
 await page.mouse.move(0,0)
 await expect(card.locator('.bov-distribution')).not.toHaveClass(/has-focus/)

 const all=await card.locator('.bov-population-point').count()
 const flaggedLabel=await card.getByRole('button',{name:'특이 학생 보기',exact:true}).textContent()
 await card.getByRole('button',{name:'특이 학생 보기',exact:true}).click()
 const flagged=await card.locator('.bov-population-point').count()
 expect(flagged).toBeGreaterThan(0)
 expect(flagged).toBeLessThan(all)
 await expect(card.locator('.bov-distribution-band')).toHaveCount(0)
 await card.getByRole('button',{name:'정상 학생 보기',exact:true}).click()
 const normal=await card.locator('.bov-population-point').count()
 expect(normal+flagged).toBe(all)
 await expect(card.locator('.bov-change-line')).toHaveCount(0)
 await card.getByRole('button',{name:'전체 학생 보기',exact:true}).click()
 await expect(card.locator('.bov-population-point')).toHaveCount(all)
 expect(flaggedLabel).toMatch(/특이 \d+/)
})
