import {test,expect} from '@playwright/test'

test('subject ten/ninety shares use one full scale and progress beyond 100 stays visible',async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.route('**/api/admin/student-care/students/demo_s001?branchId=demo_large',async route=>{
  const response=await route.fetch(),data=await response.json()
  data.review.subjects=[{name:'수학',plannedMinutes:70,actualMinutes:756,plannedShare:10,actualShare:90},{name:'국어',plannedMinutes:630,actualMinutes:84,plannedShare:90,actualShare:10}]
  for(const day of data.review.days){day.attendance='PRESENT';day.submission='SUBMITTED';day.scheduled=true;day.plannedMinutes=100;day.actualMinutes=120;day.minutes=120}
  data.review.current.executionRate=120
  await route.fulfill({json:data})
 })
 for(const width of [1600,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care/5')
  await page.locator('#rs-open-demo_s001').click()
  const detail=page.locator('.rs-detail')
  await expect(detail.locator('.cm-subject-axis')).toContainText('100%')
  const math=detail.locator('.cm-subject').filter({has:page.getByText('수학',{exact:true})})
  await expect(math).toContainText('+80%p')
  const planned=await math.locator('.cm-subject-pair i').first().boundingBox(),actual=await math.locator('.cm-subject-pair i').last().boundingBox()
  expect(actual!.width/planned!.width).toBeCloseTo(9,1)
  const graph=detail.getByRole('group',{name:'계획 대비 진행률 날짜별 그래프',exact:true})
  await expect(graph.getByRole('button',{name:'10/21 계획 대비 진행률 120%',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:`test-results/metric-extremes-${width}.png`,fullPage:true})
 }
})

test('persisted local example history matches the API original and stays within the history tab',async({page})=>{
 await page.route('https://**',r=>r.abort())
 const history=await(await page.request.get('/api/admin/student-care/students/demo_s035/history?branchId=demo_large')).json()
 const note=history.items.find((item:{content:string})=>item.content.includes('[화면 확인용 예시]'))
 expect(note).toBeDefined()
 for(const width of [1600,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care/5')
  await page.getByRole('tab',{name:'관리 이력',exact:true}).click()
  await page.getByRole('combobox',{name:'이력 학생 선택',exact:true}).selectOption('demo_s035')
  const record=page.locator('.sc-history-expand').filter({hasText:'[화면 확인용 예시]'})
  await record.click()
  await expect(page.locator('.sc-history-original')).toHaveText(note.content)
  await expect(page.getByRole('tab',{name:'관리 이력',exact:true})).toHaveAttribute('aria-selected','true')
  await page.screenshot({path:`test-results/history-persisted-${width}.png`,fullPage:true})
 }
})
