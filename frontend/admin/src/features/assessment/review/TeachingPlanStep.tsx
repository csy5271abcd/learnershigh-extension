import type { EvaluationPlanAnalysisView } from '../api/types.ts'
import { TeachingPlanCalendar } from './TeachingPlanCalendar.tsx'
import styles from './review.module.css'

// 4단계 월별 교수·학습 운영 계획. 현재 분석 계약(backend-adapter-0.2)에 운영 계획이 없어 서버 데이터가 없다.
// 가짜 운영 계획을 만들지 않고 빈 달력과 '분석 대기' 안내만 보여 준다. 수행평가 항목과 섞지 않는다.
export function TeachingPlanStep({ view }: { view: EvaluationPlanAnalysisView }) {
  const slot = view.slot
  return (
    <div data-testid="review-step-teaching">
      <h3 className={styles.stepTitle}>월별 교수·학습 운영 계획</h3>
      <p className={styles.stepLead}>단원·성취기준·수업 방법을 달력으로 보여 줄 자리예요. 원문에 적힌 날짜·주차·월 단위를 그대로 지키고, 적혀 있지 않은 날짜는 만들지 않아요.</p>
      <div className={styles.notice} data-tone="info" role="status" data-testid="teaching-plan-pending">
        <div>
          <strong>분석기 연동을 기다리는 중이에요</strong>
          <p>운영 계획 추출 결과를 주고받는 형식이 아직 확정되지 않았어요. &lsquo;원문에 운영 계획이 없음&rsquo;이 아니에요. 지금은 원문의 해당 쪽을 직접 확인해 주세요. 이 단계는 확정 조건에 포함되지 않아요.</p>
        </div>
      </div>
      {slot ? (
        <TeachingPlanCalendar
          academicYear={slot.academicYear}
          semester={slot.semester}
          entries={[]}
          subjects={view.subjects.map((subject) => subject.subjectName)}
          emptyMessage="분석기가 운영 계획을 보내면 날짜·주차·월 단위로 여기에 표시돼요."
        />
      ) : (
        <p className={styles.muted}>문서의 학년도·학기 정보를 받지 못했어요.</p>
      )}
    </div>
  )
}
