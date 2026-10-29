import {test,expect} from '@playwright/test'

test('one 학생 케어 menu opens the final screen; removed comparison designs are gone',async({page})=>{
 await page.goto('/student-care?preview=1')
 await expect(page.getByRole('button',{name:'학생 케어',exact:true})).toBeVisible()
 for(const v of [1,2,3,4,5,6,7])await expect(page.getByRole('button',{name:`학생 케어 ${v}`,exact:true})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'학생 케어',exact:true})).toBeVisible()
 await expect(page.getByText('API 연결',{exact:false})).toHaveCount(0)
 // The old final-design address keeps working; removed designs are not routed.
 await page.goto('/student-care/5?preview=1');await expect(page.locator('.rs-summary')).toHaveCount(10)
 for(const v of [1,2,3]){await page.goto(`/student-care/${v}`);await expect(page.getByText('페이지를 찾을 수 없어요.')).toBeVisible()}
})

test('preview roster contains all students, filters names and changes branch without a popup',async({page})=>{
 await page.goto('/student-care?preview=1');await expect(page.locator('.rs-summary')).toHaveCount(10)
 await page.locator('#rs-open-stu_002').click();await expect(page.locator('.rs-detail')).toHaveCount(1)
 for(let day=18;day<=24;day++)await expect(page.locator('.cm-status-card')).toContainText(`10/${day}`)
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.locator('.rs-detail-head').getByRole('button',{name:'접기',exact:true}).click();await expect(page.locator('#rs-open-stu_002')).toBeFocused()
 await page.getByLabel('학생 검색',{exact:true}).fill('박민지');await expect(page.locator('.rs-summary')).toHaveCount(1)
 await page.getByLabel('학습관',{exact:true}).selectOption('br_bundang');await expect(page.locator('.rs-summary')).toHaveCount(3)
})

test('preview counseling is visible on expansion and saved notes appear in history',async({page})=>{
 await page.goto('/student-care?preview=1');await page.locator('#rs-open-stu_002').click()
 await page.getByRole('radio',{name:'면담',exact:true}).check()
 await page.getByLabel('상담 내용',{exact:true}).fill('새 화면 상담 기록 확인')
 await page.getByRole('radio',{name:'계속 관리',exact:true}).check()
 await page.getByRole('button',{name:'저장',exact:true}).click()
 await page.getByRole('button',{name:'과거 관리 이력',exact:false}).click()
 await expect(page.locator('.cm-history')).toContainText('새 화면 상담 기록 확인')
 await page.getByRole('tab',{name:'관리 이력',exact:true}).click()
 // History lists one row per case; the saved note is in that case's timeline.
 await page.getByRole('combobox',{name:'이력 학생 선택',exact:true}).selectOption('stu_002')
 await page.locator('.sc-history-expand').first().click()
 await expect(page.locator('.sc-history-timeline')).toContainText('새 화면 상담 기록 확인')
})

test('preview missing source remains unconfirmed and no approved-leave feature is introduced',async({page})=>{
 await page.goto('/student-care?preview=1');await page.locator('#rs-open-stu_008').click()
 // Missing source days stay '—'; they are neither absences nor a separate '미확인' label.
 await expect(page.locator('.cm-status-card')).toContainText('—')
 await expect(page.locator('.cm-status-card')).not.toContainText('미확인')
 await expect(page.locator('.cm-status-card')).not.toContainText('결석')
 await expect(page.locator('.rs-detail')).not.toContainText('승인 휴무')
 await expect(page.locator('.rs-detail')).not.toContainText('입실 기록 없음')
})
