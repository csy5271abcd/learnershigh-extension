import { expect, test, type Page } from '@playwright/test'
import { expectOfficialSlotMatchesServer, ADMIN, STUDENT, blankPdf, runTag, uniquePdf } from '../support.ts'

// A27-UX 부록 H (2026-11-20) — LIVE-derived Fixture. 실제 학교알리미 실측(부록 G·H)에서 본 화면 구조를 가상 학교알리미(127.0.0.1:18769)로 재현한다.
//  · 검색 첫 화면은 고등학교 2곳만 보이고 '고등학교(N) 더보기'(SEARCH_MODE=3)로 나머지를 숨긴다('한빛고등학교' 실측: 대전한빛·위례한빛만 보이고 파주·담양 한빛고등학교가 숨음)
//  · 학교 상세 주소는 <span class="mt">주소 :</span>값</span>
//  · 항목 화면 '자료기준일'(1차 = 4월, 3차 = 9월)과 JG_CHASU
//  · 교과군 파일은 학년 표기가 없다(가좌고 실측) → 고1·고2·고3 공통
// 학교 이름은 Mock 학업 Context(예시고등학교)에 맞춘 가상 이름, 주소 번지·파일은 가상 값이다. 실제 학교알리미 접속 없음.
const STUB = 'http://127.0.0.1:18769'

async function noOverflow(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${name} 가로 넘침`).toBeLessThanOrEqual(1)
}

test('숨은 동명 학교까지 찾아 지역으로 고르고 · 공시 4월은 1학기, 9월은 2학기, 학년 미표기는 세 칸(원본 하나) · 충돌은 보류 · 학생 비공개', async ({ page, request }) => {
  const tag = runTag()
  const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()))
  const file = (name: string) => ({ name, base64: uniquePdf(`${tag}-${name}`).toString('base64') })
  // 교과군 합본(가좌고 실측 모양): 이름·본문 모두 학년·학기 표기 없음 — 공용 PDF 는 본문에 '1학기'가 있어 쓰지 않는다
  const plain = (name: string, key: string) => ({ name, base64: blankPdf(`${tag}-${key}`).toString('base64') })
  const paju = '0b9c5a4e-3333-4222-8333-0000000000c3'
  const damyang = '0b9c5a4e-4444-4222-8333-0000000000c4'
  const fixture = {
    realSearch: true,
    realAddress: true,
    schools: [
      { id: '0b9c5a4e-1111-4222-8333-0000000000c1', name: '대전예시고등학교', address: '대전광역시 중구 가상로 1', years: {} },
      { id: '0b9c5a4e-2222-4222-8333-0000000000c2', name: '위례예시고등학교', address: '경기도 성남시 가상로 2', years: {} },
      {
        id: paju, name: '예시고등학교', address: '경기도 파주시 한빛로 36',
        years: {
          [y]: {
            echo: y,
            chasu: {
              '1': { month: 4, files: [plain(`${y}학년도 국어과 교수학습 및 평가 운영 계획 ${tag}.pdf`, 'kor')] },
              '3': { month: 9, files: [plain(`${y}학년도 수학과 교수학습 및 평가 운영 계획 ${tag}.pdf`, 'math'), file(`${y}_2학기_2학년_확률과통계_교수학습평가운영계획 ${tag}.pdf`)] },
            },
          },
          // 4월 공시인데 원문은 '2학기' → 보류(1학기로 넣지 않는다)
          [y - 1]: { echo: y - 1, chasu: { '1': { month: 4, files: [file(`${y - 1}학년도 2학기 미술과 평가 운영 계획 ${tag}.pdf`)] } } },
        },
      },
      { id: damyang, name: '예시고등학교', address: '전남광주통합특별시 담양군 가상로 3', years: { [y]: { echo: y, files: [file(`${y}학년도 1학년 1학기 담양 ${tag}.pdf`)] } } },
    ],
  }
  expect((await request.put(`${STUB}/__fixture`, { data: fixture })).status()).toBe(204)
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y}`)
  const summary = page.getByTestId('schoolinfo-sync')
  await expect(summary).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 60_000 })
  // 이전 시험의 확인 기록이 24시간 안이라 관리자가 '다시 확인'을 누른다 → 고른 학교가 없으면 검색
  await page.getByTestId('schoolinfo-sync-retry').click()
  // 앞 시험(z-a27-autosync)이 고른 가상 학교는 이 Fixture 에 없다 → '선택 무효 → 다시 고르기'(MAPPING_CHANGED) 또는 처음 고르기
  await expect(page.getByTestId('schoolinfo-sync-selection')).toContainText(/같은 이름의 학교가 여러 곳|다시 골라야/, { timeout: 60_000 })
  const log1: string[] = await (await request.get(`${STUB}/__log`)).json()
  expect(log1, '검색 첫 화면 뒤 고등학교 더보기 목록을 받는다').toContain('search SEARCH_MODE=3')
  expect(log1.filter((l) => l.startsWith('/ei/pp/')), '고르기 전 평가계획 조회 0').toEqual([])

  await page.getByTestId('schoolinfo-select-open').click()
  const dialog = page.getByTestId('schoolinfo-select-dialog')
  await expect(dialog).toContainText('이름이 같은 학교가 2곳')
  await expect(dialog).not.toContainText('대전예시')
  await expect(dialog).not.toContainText('위례예시')
  const region = page.getByTestId('schoolinfo-select-region')
  await expect(region.locator('option')).toHaveText(['전체 2곳', '경기도', '전남광주통합특별시'])
  await region.selectOption('경기도')
  await page.getByTestId('schoolinfo-select-candidates').getByRole('radio').check()
  await expect(page.getByTestId('schoolinfo-select-summary')).toContainText('경기도 파주시 한빛로 36')
  for (const [w, h] of [[800, 600], [1366, 768], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h })
    await noOverflow(page, `학교 선택 ${w}`)
  }
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.screenshot({ path: 'test-results/a27h-select-paju-1600.png' })
  await page.getByTestId('schoolinfo-select-confirm').click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('schoolinfo-sync-selected')).toContainText('경기도 파주시 한빛로 36', { timeout: 60_000 })
  await expect(summary).not.toHaveAttribute('data-state', /RUNNING|PENDING/, { timeout: 90_000 })

  // 4월 국어과(학년 미표기) → 1학기 세 칸 · 9월 수학과(미표기) → 2학기 세 칸 · 9월 확률과통계(2학년 명시) → 고2-2 만
  for (const grade of [1, 2, 3]) {
    await expect(page.getByTestId(`plan-slot-${grade}-1`).getByTestId('plan-slot-doc').filter({ hasText: `국어과 교수학습 및 평가 운영 계획 ${tag}` })).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByTestId(`plan-slot-${grade}-2`).getByTestId('plan-slot-doc').filter({ hasText: `수학과 교수학습 및 평가 운영 계획 ${tag}` })).toHaveCount(1)
    await expect(page.getByTestId(`plan-slot-${grade}-2`).getByTestId('plan-slot-doc').filter({ hasText: `확률과통계_교수학습평가운영계획 ${tag}` })).toHaveCount(grade === 2 ? 1 : 0)
    await expect(page.getByTestId(`plan-slot-${grade}-1`).getByTestId('plan-slot-doc').filter({ hasText: `수학과 교수학습 및 평가 운영 계획 ${tag}` })).toHaveCount(0)
  }
  await expect(page.locator('body')).not.toContainText(`담양 ${tag}`)
  const log2: string[] = await (await request.get(`${STUB}/__log`)).json()
  expect(log2.filter((l) => l.startsWith('/ei/pp/Pneipp_b06_s0p.do')).length, '고른 학교의 학년도 3개 × (기본 + 다른 차수)만 조회').toBeLessThanOrEqual(6)
  await page.screenshot({ path: 'test-results/a27h-live-derived-slots-1600.png', fullPage: true })
  for (const [w, h] of [[800, 600], [1366, 768], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: h })
    await noOverflow(page, `6칸 ${w}`)
  }
  await page.setViewportSize({ width: 1600, height: 900 })

  // 관리자 분류 창: 학년 미표기 자동 공통 적용 묶음(사유·연결 칸)이 보인다
  await page.getByTestId('schoolinfo-classify-open').click()
  const classify = page.getByTestId('schoolinfo-classify-dialog')
  const auto = classify.getByTestId('schoolinfo-classify-group-auto')
  await expect(auto).toContainText('학년 미표기 → 고1·고2·고3 공통 적용', { timeout: 15_000 })
  const kor = auto.getByTestId('schoolinfo-classify-auto-row').filter({ hasText: `국어과 교수학습 및 평가 운영 계획 ${tag}` })
  await expect(kor).toContainText('학년 표기 없음 → 고1·고2·고3 공통 적용')
  await expect(kor).toContainText('연결 칸 고1 1학기, 고2 1학기, 고3 1학기')
  await expect(auto.getByTestId('schoolinfo-classify-auto-row').filter({ hasText: `확률과통계` })).toHaveCount(0)
  // 4월 공시 ↔ 원문 2학기 충돌은 자동 등록하지 않고 분류 대상으로 남긴다
  await expect(classify).toContainText(`${y - 1}학년도 2학기 미술과 평가 운영 계획 ${tag}`)
  await page.setViewportSize({ width: 800, height: 600 })
  await noOverflow(page, '분류 창 800')
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.screenshot({ path: 'test-results/a27h-classify-auto-1600.png' })
  await page.keyboard.press('Escape')
  await expect(classify).toBeHidden()

  // 새로고침 뒤에도 원본 하나 · 세 칸 유지(중복 없음)
  await page.reload()
  for (const grade of [1, 2, 3]) {
    await expect(page.getByTestId(`plan-slot-${grade}-1`).getByTestId('plan-slot-doc').filter({ hasText: `국어과 교수학습 및 평가 운영 계획 ${tag}` })).toHaveCount(1, { timeout: 30_000 })
  }
  await page.goto(`${ADMIN}/assessment/evaluation-plans?school=school_001&year=${y - 1}`)
  await expect(page.getByTestId('plan-slots')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-testid^="plan-slot-"]').getByTestId('plan-slot-doc').filter({ hasText: `미술과 평가 운영 계획 ${tag}` })).toHaveCount(0)

  // 학생(부록 K): 1학년 2학기 학생 → 9월 공시 수학과(학년 미표기, 세 칸) 원본만. 4월(1학기)·2학년 원본은 없다. 분석 후보는 비공개
  await page.goto(`${STUDENT}/assessment`)
  await expectOfficialSlotMatchesServer(page, request)
  const mine = page.getByTestId('home-official-slot').first()
  await expect(mine).toContainText(`수학과 교수학습 및 평가 운영 계획 ${tag}`)
  await expect(mine).toContainText('9월 공시')
  await expect(mine).not.toContainText(`국어과 교수학습 및 평가 운영 계획 ${tag}`)
  await expect(mine).not.toContainText(`확률과통계_교수학습평가운영계획 ${tag}`)
  await page.goto(`${STUDENT}/assessment/evaluation-plans`)
  await expect(page.getByTestId('official-sources')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('confirmed-plan').filter({ hasText: tag })).toHaveCount(0)
  await request.delete(`${STUB}/__fixture`)
})
