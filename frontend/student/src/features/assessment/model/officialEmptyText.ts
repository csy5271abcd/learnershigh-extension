import type { StudentOfficialEnsure, StudentOfficialPlan } from '../api/types.ts'

/**
 * 원본이 없을 때 이유 (A28-01 상태 구분). 확인 실패를 '공개 원본 없음'으로 보이지 않는다.
 * 확인 중 / 학교 선택 필요 / 확인 실패 / 공개 원본 없음 / 조회할 학교 없음(학적 없음). '학적 정보 없음'은 카드가 따로 한 줄로 보인다.
 */
export function officialEmptyText(slot: StudentOfficialPlan, ensure: StudentOfficialEnsure | null): string {
  if (!slot.sourceConnected) return '공식 원본이 아직 확인되지 않았어요'
  if (!slot.basis && !slot.schoolId) return '조회할 학교 정보가 없어요'
  if (ensure?.state === 'RUNNING') return '확인 중 · 학교알리미에서 공식 원본을 확인하고 있어요'
  if (ensure?.state === 'SCHOOL_CONFIRMATION_REQUIRED') return '학교 확인이 필요해요(선생님 확인 전)'
  const year = ensure?.years.find((y) => y.academicYear === slot.academicYear)
  if (ensure?.state === 'FAILED' || year?.status === 'FAILED') return '확인 실패 · 공식 원본을 가져오지 못했어요'
  if (year?.status === 'NOT_PUBLISHED' || year?.status === 'YEAR_UNAVAILABLE') return '공개 원본 없음 · 학교알리미에 이 학년도 공시가 없어요'
  return '공개 원본 없음 · 이 학년·학기 공식 원본이 확인되지 않았어요'
}
