// A28-36 재분석이 끝난 뒤 다음 동작(순수 함수). 화면: ReanalyzeDialog.
// - 'close'  : 확정 문서 · 같은 분석 결과 · 승인할 운영계획 없음(이미 확정 또는 후보 0행) → '닫기'만
// - 'review' : 검토 화면 최종 확정 단계로(미확정 문서 · 확정 문서의 남은 운영계획 후보)
// - 'reopen' : 확정 문서인데 새 분석 결과 → 재검토(평가 정보, 운영계획이 확정돼 있으면 운영계획도)를 연 뒤 최종 확정 단계로.
//              재검토 시작은 학생 공개값을 바꾸지 않는다(최종 승인 때만 바뀜).
export type ReanalyzeNext = { kind: 'close' } | { kind: 'review' } | { kind: 'reopen'; teaching: boolean }

export function reanalyzeNext(input: { confirmed: boolean; changed: boolean; teachingConfirmed: boolean; candidates: number | null }): ReanalyzeNext {
  const { confirmed, changed, teachingConfirmed, candidates } = input
  if (!confirmed) return { kind: 'review' }
  if (changed) return { kind: 'reopen', teaching: teachingConfirmed }
  if (teachingConfirmed || (candidates ?? 0) === 0) return { kind: 'close' }
  return { kind: 'review' }
}
