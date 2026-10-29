import {test,expect} from '@playwright/test'

const memo='상담 · 통화 — 오전 등원으로 변경한 이유를 확인함.\n학교 보충 수업 때문에 이번 주는 19시에 입실하기로 함. '+ '학습 계획과 실제 진행 내용을 함께 확인했습니다. '.repeat(24)+'끝까지 보존된 상담 원문'
test.beforeEach(async({page})=>{
 await page.route('https://**',r=>r.abort())
 await page.route('**/api/admin/student-care/students/*/history?branchId=demo_large',async route=>{
  const response=await route.fetch(),history=await response.json()
  history.items=history.student.studentId==='demo_s001'?[{eventId:'history_long',caseId:'care_history',type:'NOTE',occurredOn:'2026-10-27',createdAt:'2026-10-27T10:00:00Z',content:memo,noteChannel:'CALL'}]:[]
  await route.fulfill({json:history})
 })
})

test('history filters all roster students and expands the stored original in the same row',async({page})=>{
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'관리 이력',exact:true}).click()
 const student=page.getByRole('combobox',{name:'이력 학생 선택',exact:true})
 await expect(student.locator('option')).toHaveCount(61)
 const expand=page.getByRole('button',{name:/기록 내용 펼치기/}).first()
 await expect(expand).toBeVisible()
 await expand.scrollIntoViewIfNeeded()
 const before=await page.evaluate(()=>scrollY)
 await expand.click()
 const detail=page.getByRole('region',{name:'기록 원문',exact:true})
 await expect(detail).toContainText('끝까지 보존된 상담 원문')
 await expect(detail.locator('.sc-history-original')).toHaveText(memo)
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(5)
 await expect(page.getByRole('tab',{name:'관리 이력',exact:true})).toHaveAttribute('aria-selected','true')
 await student.selectOption('demo_s002')
 await expect(page.getByText('이 학생의 관리 이력이 없습니다.',{exact:true})).toBeVisible()
 await expect(detail).toHaveCount(0)
 await page.getByRole('button',{name:'전체 학생',exact:true}).click()
 await expect(expand).toBeVisible()
})

for(const theme of ['light','dark'] as const)test(`history detail remains readable at three widths ${theme}`,async({page})=>{
 await page.emulateMedia({colorScheme:theme})
 for(const width of [1600,850,390]){
  await page.setViewportSize({width,height:1000})
  await page.goto('/student-care')
  await page.getByRole('tab',{name:'관리 이력',exact:true}).click()
  await page.getByRole('button',{name:/기록 내용 펼치기/}).first().click()
  await expect(page.getByRole('region',{name:'기록 원문',exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
  await page.screenshot({path:`test-results/history-${theme}-${width}.png`,fullPage:true})
 }
})

test('history clears a removed student filter when the same branch roster refreshes',async({page})=>{
 let changed=false
 await page.route('**/api/admin/student-care/board?branchId=demo_large',async route=>{
  const response=await route.fetch(),board=await response.json()
  if(changed)board.students=board.students.filter((s:{studentId:string})=>s.studentId!=='demo_s002')
  await route.fulfill({json:board})
 })
 await page.route('**/api/admin/student-care/settings?branchId=demo_large',async route=>{
  if(route.request().method()!=='PUT')return route.continue()
  const settings=await(await page.request.get('/api/admin/student-care/settings?branchId=demo_large')).json()
  changed=true;await route.fulfill({json:settings})
 })
 await page.goto('/student-care')
 await page.getByRole('tab',{name:'관리 이력',exact:true}).click()
 const picker=page.getByRole('combobox',{name:'이력 학생 선택',exact:true})
 await picker.selectOption('demo_s002')
 await expect(page.getByText('이 학생의 관리 이력이 없습니다.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'관리 기준 설정',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'저장',exact:true}).click()
 await expect(picker).toHaveValue('')
 await expect(picker.locator('option')).toHaveCount(60)
 await expect(page.getByRole('button',{name:/기록 내용 펼치기/}).first()).toBeVisible()
})
