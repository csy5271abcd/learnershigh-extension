import { navigate } from '../../../app/adminLocation.ts'
import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { CalendarIcon, MonthlyPlanner, type TeachingPlanEntry } from '../components/canonicalUi.ts'
import styles from './review.module.css'

// 4단계 월별 교수·학습 운영 계획 (실제 서비스 경로).
// 서버 분석 결과(backend-adapter-0.2)에는 운영 계획이 없다 → 공용 MonthlyPlanner에 서버가 준 행만 넘긴다(지금은 0개).
// 가짜 계획을 만들지 않고 정직한 빈 상태를 보여 준다. 샘플 동작은 개발 전용 Preview(/assessment/dev/monthly-planner)에서만 본다.
export function TeachingPlanStep({ view, onJump }: { view: EvaluationPlanAnalysisView; onJump: (page: number) => void }) {
  const slot = view.slot
  // 0.3 계약 연결 전: 서버 응답에 teachingPlan 행이 없다
  const entries: TeachingPlanEntry[] = []
  return (
    <div data-testid="review-step-teaching">
      <h3 className={styles.title}>월별 교수·학습 운영 계획</h3>
      <p className={styles.lead}>단원·성취기준·수업 방법을 달력으로 확인해요. 원문에 적힌 날짜·주차·월 단위를 그대로 지키고, 적혀 있지 않은 날짜는 만들지 않아요. 이 단계는 확정 조건에 들어가지 않아요.</p>
      {slot ? (
        <MonthlyPlanner
          academicYear={slot.academicYear}
          semester={slot.semester}
          entries={entries}
          mode="admin"
          onOpenSource={onJump}
          emptyState={
            <div data-testid="teaching-plan-pending" style={{ display: 'grid', justifyItems: 'center', gap: 8, maxWidth: 440 }}>
              <CalendarIcon size={28} />
              <strong>아직 운영 계획 분석 결과가 없어요</strong>
              <span className={styles.muted}>분석기와 운영 계획을 주고받는 형식이 확정되면 여기에 달력으로 표시돼요. &lsquo;원문에 운영 계획이 없음&rsquo;이 아니니 원문의 해당 쪽을 직접 확인해 주세요.</span>
              {import.meta.env.DEV && (
                <button type="button" className={styles.link} onClick={() => navigate('/assessment/dev/monthly-planner')} data-testid="open-planner-preview">
                  샘플 데이터로 달력 미리보기 (개발 전용)
                </button>
              )}
            </div>
          }
        />
      ) : (
        <p className={styles.muted}>문서의 학년도·학기 정보를 받지 못했어요.</p>
      )}
    </div>
  )
}
