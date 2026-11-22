import { navigate } from '../../../app/adminLocation.ts'
import type { ConfirmedTeachingPlan } from '../model/confirmedTeachingPlan.ts'
import review from '../review/review.module.css'
import { paths } from '../routes/paths.ts'

// A28-22 운영계획 빈 상태의 이유를 나눠 보인다(전체 현황·월별 운영계획 공용). 숫자는 문서 수다(운영계획 행 수 아님).
// - 평가계획서 없음 / 운영계획 후보가 있지만 미확정(검토·승인 링크) / 분석 결과에 운영계획 행이 없음(확정할 수 없음 — 가짜 행을 만들지 않음)
export function TeachingPlanEmpty({ data, grade, semester, testId }: { data: ConfirmedTeachingPlan; grade: number; semester: number; testId: string }) {
  if (data.documents === 0) {
    return (
      <div className={review.empty} data-testid={testId} data-reason="no-documents">
        <strong>{`고${grade} ${semester}학기 평가계획서가 아직 없어요`}</strong>
        <span className={review.muted}>평가계획서 탭에서 원본을 등록해 주세요.</span>
      </div>
    )
  }
  if (data.confirmed > 0) {
    return (
      <div className={review.empty} data-testid={testId} data-reason="no-rows">
        <strong>확정된 운영계획에 달력에 놓을 행이 없어요</strong>
      </div>
    )
  }
  return (
    <div className={review.empty} data-testid={testId} data-reason={data.pending.length > 0 ? 'pending' : 'no-candidates'}>
      <strong>{data.pending.length > 0 ? '운영계획이 아직 확정되지 않았어요' : '운영계획 분석 결과가 없어요'}</strong>
      <PendingList data={data} />
    </div>
  )
}

/** 확정 전·분석 결과 없는 문서 목록(빈 상태 아래, 또는 일부만 확정된 경우 Planner 위) */
export function PendingList({ data }: { data: ConfirmedTeachingPlan }) {
  if (data.pending.length === 0 && data.noCandidates.length === 0) return null
  return (
    <ul className={review.pendingDocs} data-testid="teaching-plan-pending">
      {data.pending.map((doc) => (
        <li key={doc.planId}>
          <span>
            {doc.fileName} · 운영계획 후보 {doc.candidateRows}행 · 미확정
          </span>
          <button type="button" className={review.link} onClick={() => navigate(paths.planReview(doc.planId, doc.revisionId))}>
            검토·최종 승인
          </button>
        </li>
      ))}
      {data.noCandidates.map((doc) => (
        <li key={doc.planId} data-testid="teaching-plan-no-candidates">
          <span>
            {doc.fileName} · {doc.analyzed ? '분석 결과에 월별 운영계획 행이 없어 확정할 수 없어요(원문 표 형식을 읽지 못한 경우일 수 있어요)' : '아직 분석하지 않았어요'}
          </span>
          <button type="button" className={review.link} onClick={() => navigate(doc.analyzed ? paths.planReview(doc.planId, doc.revisionId) : paths.analysis())}>
            {doc.analyzed ? '문서 보기' : '분석 탭으로'}
          </button>
        </li>
      ))}
    </ul>
  )
}
