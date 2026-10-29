import {test,expect} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
const evidence='C:/Users/green/.codex/visualizations/2026/10/23/01a1691a-65a2-76b1-b9a0-578fcef98c40/oct26-diverse-data'
mkdirSync(evidence,{recursive:true})

test('live population contains mixed attendance, submissions and genuine missing records',async({page})=>{
 const response=await page.request.get('/api/admin/student-care/metrics?branchId=br_gangnam')
 expect(response.ok()).toBe(true)
 const payload=await response.json()
 const rows=payload.students as {student:{studentId:string};review:{days:{date:string;attendance:string;submission:string;minutes:number|null;startMinutes:number|null;plannedMinutes:number|null}[];current:{studyMinutes:number;attendanceDays:number;submissionDays:number;recordedDays:number}}}[]
 const days=rows.flatMap(r=>r.review.days)
 expect(days.some(d=>d.attendance==='ABSENT'&&d.submission==='SUBMITTED')).toBe(true)
 expect(days.some(d=>d.attendance==='PRESENT'&&d.submission==='MISSING')).toBe(true)
 expect(days.some(d=>d.attendance==='UNKNOWN'&&d.minutes===null)).toBe(true)
 expect(days.some(d=>d.attendance==='PRESENT'&&d.startMinutes===null)).toBe(true)
 expect(rows.some(r=>r.review.current.attendanceDays===7)).toBe(true)
 expect(new Set(rows.map(r=>r.review.current.attendanceDays)).size).toBeGreaterThanOrEqual(3)
 const dailyCounts=Array.from({length:7},(_,i)=>rows.filter(r=>r.review.days[i].attendance==='PRESENT').length)
 expect(new Set(dailyCounts).size).toBeGreaterThan(2)
 writeFileSync(`${evidence}/population.json`,JSON.stringify(payload,null,2))
 await page.goto('/student-care');await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 for(let i=0;i<7;i++)await expect(page.locator('.cm-attendance-bars').nth(i)).toHaveAttribute('aria-label',new RegExp(`입실 ${dailyCounts[i]}명`))
})

test('whole student row opens metrics without redundant viewing labels, records or collapsed counseling',async({page})=>{
 await page.goto('/student-care')
 await expect(page.locator('.rs-summary')).toHaveCount(10)
 await expect(page.locator('.rs-open').first()).not.toContainText('보기')
 await page.locator('.rs-open').first().click()
 await expect(page.getByLabel('상담 내용',{exact:true})).toBeVisible()
 await expect(page.locator('.rs-records,.ww-date-hits,.ww-readout')).toHaveCount(0)
 await expect(page.locator('.rs-detail')).toContainText('결석')
})

test('hovered attendance bars remain clickable and tooltip escape works',async({page})=>{
 await page.goto('/student-care');await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const bar=page.locator('.cm-attendance-bars').nth(3)
 await bar.scrollIntoViewIfNeeded();const rect=await bar.boundingBox();await page.mouse.move(rect!.x+rect!.width/2,rect!.y+35)
 await expect(page.locator('.cm-attendance [role=tooltip]')).toBeVisible()
 await page.mouse.click(rect!.x+rect!.width/2,rect!.y+35)
 await expect(page.locator('.cm-absentees')).toContainText('10/21')
 await bar.focus();await page.keyboard.press('Escape');await expect(page.locator('.cm-attendance [role=tooltip]')).toHaveCount(0)
})

test('extreme subject shares and morning student use real mock API fields',async({page})=>{
 await page.goto('/student-care');await page.locator('#rs-open-stu_005').click()
 const math=page.locator('.cm-subject').filter({has:page.getByText('수학',{exact:true})})
 await expect(math).toBeVisible()
 const values=await math.locator('i').evaluateAll(bars=>bars.map(b=>Number(b.getAttribute('data-value'))))
 expect(values[0]).toBeGreaterThan(9);expect(values[0]).toBeLessThan(11);expect(values[1]).toBeGreaterThan(80);expect(values[1]).toBeLessThan(90)
 const widths=await math.locator('i').evaluateAll(bars=>bars.map(b=>b.getBoundingClientRect().width));expect(widths[1]/widths[0]).toBeGreaterThan(7.5)
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const clock=page.locator('.cm-branch-chart').nth(1)
 await expect(clock.getByRole('button',{name:'박민지 비교',exact:true})).toContainText(/(?:09|10):/)
 await expect(page.locator('.cm-outlier-dot')).toHaveCount(0)
 await expect(page.getByRole('region',{name:'상담 필요',exact:true})).not.toContainText('박민지')
})

for(const theme of ['light','dark'] as const)test(`readability measurements and actual screenshots ${theme}`,async({page})=>{
 test.setTimeout(120000);await page.emulateMedia({colorScheme:theme})
 const measurements=[]
 for(const width of [1600,850,390]){
  await page.setViewportSize({width,height:1000});await page.goto('/student-care');await expect(page.locator('.rs-summary')).toHaveCount(10)
  const alignment=await page.locator('.rs-summary').first().evaluate(row=>{const selectors=['.rs-open b','.rs-status','.cm-list-cell>b'];return selectors.map(s=>{const r=row.querySelector(s)!.getBoundingClientRect();return r.y+r.height/2})})
  expect(Math.max(...alignment)-Math.min(...alignment)).toBeLessThan(4)
  await page.screenshot({path:`${evidence}/${theme}-${width}-roster.png`,fullPage:true})
  await page.locator('#rs-open-stu_001').click();await expect(page.getByLabel('상담 내용',{exact:true})).toBeVisible()
  const chart=page.locator('.cm-timeline').first();await chart.locator('.cm-day-target').nth(3).hover();await expect(chart.getByRole('tooltip')).toContainText('0분')
  const noBox=await chart.locator('.cm-day-target rect').evaluateAll(nodes=>nodes.every(n=>['none','rgba(0, 0, 0, 0)'].includes(getComputedStyle(n).stroke)))
  expect(noBox).toBe(true)
  const dates=await chart.locator('.cm-day-target').evaluateAll(nodes=>nodes.map(n=>{const t=n.querySelector('text')!.getBoundingClientRect();return {left:t.left,right:t.right}}))
  expect(dates.every((d,i)=>i===0||dates[i-1].right<=d.left)).toBe(true)
  const labels=await chart.locator('.cm-day-target text').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top))
  const tip=await chart.getByRole('tooltip').boundingBox();expect(tip!.y+tip!.height).toBeLessThan(Math.min(...labels))
  const coveredDots=await chart.evaluate(el=>{const tip=el.querySelector('[role=tooltip]')!.getBoundingClientRect();return [...el.querySelectorAll('.cm-series circle,.cm-baseline circle')].filter(dot=>{const r=dot.getBoundingClientRect();return Math.min(r.right,tip.right)>Math.max(r.left,tip.left)&&Math.min(r.bottom,tip.bottom)>Math.max(r.top,tip.top)}).length})
  expect(coveredDots).toBe(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await chart.screenshot({path:`${evidence}/${theme}-${width}-study.png`})
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${evidence}/${theme}-${width}-detail.png`,fullPage:true})
  await page.getByRole('tab',{name:'학습관별',exact:true}).click()
  const branch=page.locator('.cm-branch-chart').first();await branch.getByRole('button',{name:'김서준 비교',exact:true}).click();await branch.getByRole('button',{name:'박민지 비교',exact:true}).click()
  await expect(branch.locator('.cm-selected-line')).toHaveCount(2)
  await branch.locator('.cm-day-target').nth(2).focus();await expect(branch.getByRole('tooltip')).toContainText('10/20')
  await page.keyboard.press('Escape');await expect(branch.getByRole('tooltip')).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await branch.getByRole('heading').click()
  await branch.screenshot({path:`${evidence}/${theme}-${width}-branch.png`})
  measurements.push({width,alignment,noBox,dates})
 }
 writeFileSync(`${evidence}/${theme}-measurements.json`,JSON.stringify(measurements,null,2))
})

test('touch date labels open nearby exact values and support multiple selected students',async({browser})=>{
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}})
 const page=await context.newPage()
 try{
  await page.goto('http://127.0.0.1:5174/student-care');await page.locator('#rs-open-stu_001').tap()
  const chart=page.locator('.cm-timeline').first()
  await chart.locator('.cm-day-target').nth(3).locator('text').first().tap();await expect(chart.getByRole('tooltip')).toContainText('0분 · 결석')
  await chart.locator('.cm-day-target').nth(4).locator('text').first().tap();await expect(chart.getByRole('tooltip')).toContainText('10/22')
  await page.getByRole('tab',{name:'학습관별',exact:true}).tap()
  const branch=page.locator('.cm-branch-chart').first();await branch.getByRole('button',{name:'김서준 비교',exact:true}).tap();await branch.getByRole('button',{name:'박민지 비교',exact:true}).tap()
  await expect(branch.locator('.cm-selected-line')).toHaveCount(2)
 }finally{await context.close()}
})

test('branch comparisons support multiple students and combine daily attendance with submissions',async({page})=>{
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'학습관별',exact:true}).click()
 const chart=page.locator('.cm-branch-chart').first()
 await chart.getByRole('button',{name:'김서준 비교',exact:true}).click()
 await chart.getByRole('button',{name:'최학생 비교',exact:true}).click()
 await expect(chart.locator('.cm-selected-line')).toHaveCount(2)
 await expect(page.getByRole('heading',{name:'입실·계획 제출',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'평소보다 늦은 입실',exact:true})).toBeVisible()
 await expect(page.getByText('분포 기준',{exact:true})).toHaveCount(0)
 await expect(page.locator('.bd-date-target,.bd-readout')).toHaveCount(0)
})
