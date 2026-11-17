import { useState } from 'react'
import { MonthlyPlanner } from '../components/canonicalUi.ts'
import styles from '../review/review.module.css'
import { sampleAcademicYear, sampleSemester, teachingPlanSample } from './teachingPlanSample.ts'

// 개발 전용 Monthly Planner Preview (/assessment/dev/monthly-planner). 운영 Build에서는 Route 자체가 빠진다.
// 합성 샘플 데이터만 쓴다 — 실제 학교 문서·서버 데이터가 아니며 학생에게 공개되지 않는다.
export default function MonthlyPlannerPreview() {
  const [mode, setMode] = useState<'admin' | 'student'>('admin')
  const [lastSource, setLastSource] = useState<number | null>(null)
  // 학생 화면은 확정(CONFIRMED) 계획만 받는다는 계약 전제를 Preview에서도 그대로 지킨다
  const entries = mode === 'student' ? teachingPlanSample.filter((entry) => entry.status === 'CONFIRMED') : teachingPlanSample

  return (
    <div className={styles.listPage} data-testid="planner-preview">
      <div className={styles.listHead}>
        <h2>월별 운영 계획 미리보기</h2>
        <span className={styles.statusText} data-testid="planner-sample-badge">
          샘플 데이터 · 개발 환경 전용
        </span>
      </div>
      <p className={styles.muted} style={{ marginBottom: 16 }}>
        분석기 운영 계획 계약(0.3)이 확정되기 전, 달력 동작을 확인하는 화면이에요. 실제 학교 문서가 아니고 서버·학생 화면과 연결되어 있지 않아요.
      </p>
      <div className={styles.toolbar} style={{ marginBottom: 16 }}>
        <div role="group" aria-label="보기 대상" style={{ display: 'flex', gap: 6 }}>
          <button type="button" className={mode === 'admin' ? styles.buttonDark : styles.button} onClick={() => setMode('admin')} aria-pressed={mode === 'admin'}>
            관리자 검토 보기
          </button>
          <button type="button" className={mode === 'student' ? styles.buttonDark : styles.button} onClick={() => setMode('student')} aria-pressed={mode === 'student'} data-testid="planner-mode-student">
            학생 보기 (확정만)
          </button>
        </div>
        {lastSource && <span className={styles.tiny}>원문 {lastSource}쪽 열기 요청 (Preview에서는 Viewer 없음)</span>}
      </div>
      <MonthlyPlanner
        key={mode}
        academicYear={sampleAcademicYear}
        semester={sampleSemester}
        entries={entries}
        mode={mode}
        onOpenSource={setLastSource}
        emptyState={<strong>샘플이 비어 있어요</strong>}
      />
    </div>
  )
}
