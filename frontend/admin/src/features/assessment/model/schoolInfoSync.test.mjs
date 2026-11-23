// A27-UX 부록 E 학교알리미 3개년 자동 확인 표시 시험 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coverageLabel, isSchoolInfoSource, needsAttention, planYearOptions, recentAcademicYears, relativeYearLabel, sameRange, slotBadge, slotOf } from './schoolInfoSync.ts'

test('최근 3개 학년도는 KST 달력 연도 기준이고 연말 경계를 KST로 넘긴다', () => {
  assert.deepEqual(recentAcademicYears(new Date('2026-09-30T03:00:00Z')), [2026, 2025, 2024])
  // UTC 2026-12-31 15:30 = KST 2027-01-01 00:30
  assert.deepEqual(recentAcademicYears(new Date('2026-12-31T15:30:00Z')), [2027, 2026, 2025])
  assert.deepEqual(recentAcademicYears(new Date('2026-12-31T14:30:00Z')), [2026, 2025, 2024])
})

const result = {
  jobId: 'j', schoolId: 's', requestedAcademicYears: [2026, 2025, 2024], state: 'PARTIAL', yearStatuses: [],
  slotStatuses: [
    { academicYear: 2026, grade: 1, semester: 1, status: 'REGISTERED', sourceFileCount: 2, registeredPlanCount: 2, analysisStatus: 'ANALYZING' },
    { academicYear: 2026, grade: 2, semester: 2, status: 'NO_SOURCE_FOR_SLOT', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' },
    { academicYear: 2024, grade: 1, semester: 1, status: 'YEAR_MISMATCH', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' },
  ],
  counts: { expectedSlots: 18, verifiedSlots: 1, uniqueSourceFiles: 2, registeredPlans: 2, slotLinks: 2, downloads: 2, reused: 0, analysisCompleted: 0 },
  unresolvedFiles: [],
}

test('칸 배지는 수집과 분석을 나란히 보이고, 0개 칸을 오류로 보지 않는다', () => {
  assert.equal(slotBadge(slotOf(result, 2026, 1, 1)), '학교알리미: 원본 등록 완료 2개 · 분석 중')
  assert.equal(slotBadge(slotOf(result, 2026, 2, 2)), '학교알리미: 이 칸 공시 파일 없음')
  assert.equal(slotBadge(slotOf(result, 2024, 1, 1)), '학교알리미: 학년도 불일치')
  assert.equal(needsAttention('NO_SOURCE_FOR_SLOT'), false)
  assert.equal(slotBadge({ academicYear: 2026, grade: 3, semester: 1, status: 'REMOVED_BY_ADMIN', sourceFileCount: 0, registeredPlanCount: 0, analysisStatus: 'NONE' }), '학교알리미: 관리자가 삭제함(다시 받지 않음)')
  assert.equal(needsAttention('YEAR_MISMATCH'), true)
  assert.equal(slotOf(result, 2023, 1, 1), undefined, '최근 3개 학년도 밖은 자동 확인 대상이 아니다')
  assert.equal(slotBadge(undefined), null)
})

test('18개 중 실제 등록 칸 수만 센다', () => {
  assert.equal(coverageLabel(result), '18개 구간 중 원본 등록 1개')
})

test('학교알리미 출처 판별과 범위 비교', () => {
  assert.equal(isSchoolInfoSource('https://www.schoolinfo.go.kr/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=x&JG_YEAR=2026'), true)
  assert.equal(isSchoolInfoSource('http://127.0.0.1:1/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=x&JG_YEAR=2026'), true)
  assert.equal(isSchoolInfoSource('https://example.org/plan.pdf'), false)
  assert.equal(isSchoolInfoSource(null), false)
  assert.equal(sameRange([2026, 2025, 2024], [2026, 2025, 2024]), true)
  assert.equal(sameRange([2026, 2025, 2024], [2027, 2026, 2025]), false)
})

test('부록 N5-2: 학년도 선택지는 올해·작년·재작년을 항상 포함(등록 문서 해와 합침, 큰 해부터) · KST 연도 경계', () => {
  const nov2026 = new Date('2026-11-21T03:00:00Z')
  assert.deepEqual(planYearOptions([2026], nov2026), [2026, 2025, 2024])
  assert.deepEqual(planYearOptions([], nov2026), [2026, 2025, 2024])
  assert.deepEqual(planYearOptions([2022, 2026], nov2026), [2026, 2025, 2024, 2022])
  // 2026-12-31 15:30 UTC = 2027-01-01 00:30 KST → 2027 기준
  assert.deepEqual(planYearOptions([2026], new Date('2026-12-31T15:30:00Z')), [2027, 2026, 2025])
  assert.equal(relativeYearLabel(2026, nov2026), '올해')
  assert.equal(relativeYearLabel(2025, nov2026), '작년')
  assert.equal(relativeYearLabel(2024, nov2026), '재작년')
  assert.equal(relativeYearLabel(2022, nov2026), null)
})
