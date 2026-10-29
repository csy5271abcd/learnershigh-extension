import {test,expect} from '@playwright/test'
import {mkdirSync} from 'node:fs'
const evidence=process.env.CARE_EVIDENCE_DIR??'test-results/care-evidence'
mkdirSync(evidence,{recursive:true})
test.beforeEach(async({page})=>{await page.route('https://**',r=>r.abort())})

test('a stale branch list is refreshed after the backend reports a removed branch',async({page})=>{
 let branchLoads=0,serverChanged=false
 await page.route('**/api/admin/student-care/branches',async route=>{
  branchLoads++
  if(!serverChanged)await route.fulfill({json:{items:[{branchId:'br_gangnam',name:'이전 학습관',studentCount:10}]}})
  else await route.continue()
 })
 await page.route('**/api/admin/student-care/board?branchId=br_gangnam',async route=>{serverChanged=true;await route.continue()})
 await page.goto('/student-care',{waitUntil:'domcontentloaded'})
 await expect(page.getByLabel('학습관',{exact:true})).toHaveValue('demo_large')
 await expect(page.locator('.rs-summary')).toHaveCount(60)
 expect(branchLoads).toBeGreaterThan(1)
 await expect(page.getByRole('alert')).toHaveCount(0)
})

test('an already loaded tab recovers when the source changes before opening branch metrics',async({page})=>{
 let changed=false
 const board=await (await page.request.get('/api/admin/student-care/board?branchId=demo_large')).json()
 const metrics=await (await page.request.get('/api/admin/student-care/metrics?branchId=demo_large')).json()
 await page.route('**/api/admin/student-care/branches',async route=>changed?route.continue():route.fulfill({json:{items:[{branchId:'br_gangnam',name:'이전 학습관',studentCount:60}]}}))
 await page.route('**/api/admin/student-care/board?branchId=br_gangnam',async route=>changed?route.continue():route.fulfill({json:{...board,branch:{branchId:'br_gangnam',name:'이전 학습관'}}}))
 await page.route('**/api/admin/student-care/metrics?branchId=br_gangnam',async route=>changed?route.continue():route.fulfill({json:{...metrics,branch:{branchId:'br_gangnam',name:'이전 학습관'}}}))
 await page.goto('/student-care',{waitUntil:'domcontentloaded'})
 await expect(page.locator('.rs-summary')).toHaveCount(60)
 changed=true
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 await expect(page.getByLabel('학습관',{exact:true})).toHaveValue('demo_large')
 await expect(page.locator('.bov-card')).toHaveCount(4)
 await expect(page.getByRole('alert')).toHaveCount(0)
})

test('three persisted populations and aggregate metrics use actual API samples',async({page})=>{
 const branches=await (await page.request.get('/api/admin/student-care/branches')).json()
 expect(branches.items.map((b:{studentCount:number})=>b.studentCount).sort((a:number,b:number)=>a-b)).toEqual([10,30,60])
 await page.goto('/student-care',{waitUntil:'domcontentloaded'})
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 for(const [branch,count] of [['demo_large',60],['demo_medium',30],['demo_small',10]] as const){
  await page.getByLabel('학습관',{exact:true}).selectOption(branch)
  await expect(page.locator('.bov-population')).toContainText(`전체 ${count}명`)
  await expect(page.locator('.bov-card')).toHaveCount(4)
  const data=await (await page.request.get(`/api/admin/student-care/metrics?branchId=${branch}`)).json()
  let actual=0,baseline=0,presentActual=0,presentSamples=0
  for(const row of data.students){for(const day of row.review.days){
   if(day.scheduled===false||day.attendance==='UNSCHEDULED')continue
   const usual=row.review.weekdayBaseline.find((d:{date:string})=>d.date===day.date)?.minutes
   if(day.minutes!==null&&usual!==null&&usual!==undefined){actual+=day.minutes;baseline+=usual;if(day.attendance==='PRESENT'&&usual>0){presentActual+=day.minutes;presentSamples++}}
  }}
  const card=page.locator('[data-metric=study] .bov-summary>strong')
  expect(Number(await card.getAttribute('data-value'))).toBeCloseTo(actual,6)
  expect(Number(await card.getAttribute('data-baseline'))).toBeCloseTo(baseline,6)
  expect(Number(await card.getAttribute('data-average'))).toBeCloseTo(presentActual/presentSamples,6)
  await expect(page.locator('.bov-dashboard')).not.toContainText('이상치')
  await expect(page.locator('.cm-care-queue,.cm-care-line')).toHaveCount(0)
 }
})

test('metric click reveals contributors; exclusion recomputes the same population and restores it',async({page})=>{
 test.setTimeout(90000)
 await page.goto('/student-care',{waitUntil:'domcontentloaded'})
 await page.getByLabel('학습관',{exact:true}).selectOption('demo_large')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const before=await page.locator('[data-metric=arrival] .bov-summary>strong').getAttribute('data-value')
 await page.getByRole('button',{name:'입실 시간 학생별 기록 펼치기',exact:true}).click()
 const detail=page.getByRole('region',{name:'입실 시간 학생별 기록',exact:true})
 await expect(detail.getByRole('heading')).toBeInViewport()
 await expect(detail.locator('tbody tr')).toHaveCount(8)
 const row=detail.locator('tbody tr').first(),name=(await row.locator('th a').innerText()).replace(' →','')
 await row.getByRole('button',{name:`${name} 집계에서 제외`,exact:true}).click()
 await expect(page.locator('.bov-population')).toContainText('59명 선택 / 전체 60명')
 await expect(page.locator('.bov-whole')).toHaveCount(4)
 expect(await page.locator('[data-metric=arrival] .bov-summary>strong').getAttribute('data-value')).not.toBe(before)
 await page.getByRole('button',{name:`${name} 집계에 복원`,exact:true}).click()
 await expect(page.locator('.bov-population')).toContainText('전체 60명')
 await expect(page.locator('[data-metric=arrival] .bov-summary>strong')).toHaveAttribute('data-value',before!)
 const open=detail.locator('tbody tr').first().locator('th a'),studentName=(await open.innerText()).replace(' →','')
 const popupPromise=page.waitForEvent('popup')
 await open.click()
 const popup=await popupPromise
 await expect(popup.getByRole('region',{name:`${studentName} 상세 지표`,exact:true})).toBeVisible()
 await popup.close()
 await expect(page.getByRole('tab',{name:'학습관별',exact:true})).toHaveAttribute('aria-selected','true')
})

test('multiple exclusions reset on branch change; recorded off-days are not rendered as required missed plans',async({page})=>{
 await page.goto('/student-care',{waitUntil:'domcontentloaded'})
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 await page.getByRole('button',{name:'학생 포함·제외',exact:true}).click()
 const filters=page.getByRole('region',{name:'집계 학생 선택',exact:true})
 await expect(filters.getByRole('checkbox')).toHaveCount(60)
 await filters.getByRole('checkbox').nth(0).uncheck();await filters.getByRole('checkbox').nth(1).uncheck()
 await expect(page.locator('.bov-population')).toContainText('58명 선택 / 전체 60명')
 await page.getByLabel('학습관',{exact:true}).selectOption('demo_small')
 await expect(page.locator('.bov-population')).toContainText('전체 10명')
 await expect(page.locator('.bov-exclusions')).toHaveCount(0)
 const data=await (await page.request.get('/api/admin/student-care/metrics?branchId=demo_small')).json()
 const record=data.students.find((r:{review:{days:{scheduled:boolean|null}[]}})=>r.review.days.some(d=>d.scheduled===false))
 const index=record.review.days.findIndex((d:{scheduled:boolean|null})=>d.scheduled===false)
 expect(record.review.days[index].submission).toBe('MISSING')
 await page.getByRole('tab',{name:'학생별',exact:true}).click()
 await page.locator(`#rs-open-${record.student.studentId}`).click()
 await expect(page.locator('.cm-status-card tbody tr[aria-label="계획 제출"] td').nth(index)).toHaveText('—')
})

for(const theme of ['light','dark'] as const)test(`overview and date interactions at three widths ${theme}`,async({page})=>{
 test.setTimeout(120000);await page.emulateMedia({colorScheme:theme})
 for(const width of [1600,850,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care',{waitUntil:'domcontentloaded'})
  await page.getByRole('tab',{name:'학습관별',exact:true}).click()
  await expect(page.locator('.bov-card')).toHaveCount(4)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  const card=page.locator('[data-metric=arrival]')
  await card.locator('.bov-distribution-date-hit').nth(2).hover({position:{x:2,y:5}});await expect(card.getByRole('tooltip')).toContainText('확인된 학생')
  const rects=await card.locator('.bov-date>text:first-of-type').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right}}))
  expect(rects.every((r,i)=>i===0||rects[i-1].right<=r.left)).toBe(true)
  const legend=await card.locator('.bov-pattern-legend').evaluate(el=>{
   const range=document.createRange();range.selectNodeContents(el)
   const text=range.getBoundingClientRect(),box=el.getBoundingClientRect()
   return {textLeft:text.left,textRight:text.right,left:box.left,right:box.right}
  })
  expect(legend.textLeft).toBeGreaterThanOrEqual(legend.left-1)
  expect(legend.textRight).toBeLessThanOrEqual(legend.right+1)
  await card.locator('.bov-distribution-date-hit').nth(2).press('Escape');await expect(card.getByRole('tooltip')).toHaveCount(0)
  expect(await card.locator('.bov-distribution-date-hit').nth(2).evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('none')
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:`${evidence}/${theme}-${width}-overview.png`,fullPage:true})
  for(const metric of ['study','arrival']){
   const box=await page.locator(`[data-metric=${metric}]`).boundingBox()
   await page.screenshot({path:`${evidence}/${theme}-${width}-${metric}-card.png`,fullPage:true,clip:box!})
  }
  await card.locator('.bov-distribution-date-hit').nth(2).click({position:{x:2,y:5}})
  await expect(page.getByRole('region',{name:'입실 시간 학생별 기록',exact:true})).toBeVisible()
 }
})
