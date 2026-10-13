import { useEffect, useRef } from 'react'
import { studentCareApi } from '../api/studentCareApi.ts'
import { outcomeOf, type Outcome } from '../model/outcome.ts'
import type { CareCase } from '../model/types.ts'
import { useRemote } from '../model/useRemote.ts'
import { ActiveCasePanel } from './ActiveCasePanel.tsx'
import { ReasonSection } from './ReasonSection.tsx'
import { SignalBadges } from './SignalBadges.tsx'
import { Empty, ErrorState, Loading, StaleError } from './StateMessage.tsx'
import { StudyChart } from './StudyChart.tsx'

interface Props {
  branchId: string
  studentId: string | null
  /** 페이지에서 무언가 바뀌면 올라가는 값. 바뀌면 같은 학생 상세를 다시 불러온다. */
  version: number
  onChanged: (outcome: Outcome | null) => void
  onShowHistory: () => void
}

/** 카드를 고르면 근거 · 학습량 · 확인할 질문 · 사유 확인 또는 진행 중인 건이 열린다. */
export function StudentDetailPanel({ branchId, studentId, version, onChanged, onShowHistory }: Props) {
  const detail = useRemote(
    studentId ? `${branchId}/${studentId}` : null,
    () => studentCareApi.detail(branchId, studentId ?? ''),
    version,
  )
  const articleRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  // 저장 / 결정 뒤 새 데이터로 바뀌면 상세 제목으로 Focus를 옮긴다 (누른 버튼이 사라질 수 있으므로).
  const focusAfterReload = useRef(false)
  const loadedStudentId = detail.data?.student.studentId ?? null

  // 좁은 화면에서는 상세가 목록 아래에 있으므로, 학생을 고르면 상세가 보이게 한다.
  useEffect(() => {
    if (loadedStudentId) articleRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [loadedStudentId])

  useEffect(() => {
    if (focusAfterReload.current && detail.status === 'success') {
      focusAfterReload.current = false
      headingRef.current?.focus()
    }
  }, [detail.revision, detail.status])

  if (!studentId) {
    return (
      <div className="sc-detail">
        <Empty title="학생을 고르세요" description="왼쪽 카드에서 학생을 고르면 근거와 확인할 질문이 열립니다." />
      </div>
    )
  }
  if (detail.status === 'error' && !detail.data) {
    return (
      <div className="sc-detail">
        <ErrorState error={detail.error} onRetry={detail.reload} />
      </div>
    )
  }
  if (!detail.data) {
    return (
      <div className="sc-detail">
        <Loading />
      </div>
    )
  }

  const data = detail.data
  const { activeCase } = data
  const stale = detail.status === 'error'
  const saved = (careCase: CareCase) => {
    focusAfterReload.current = true
    onChanged(outcomeOf(careCase, data.student.studentName))
  }
  return (
    <article
      ref={articleRef}
      className="sc-detail"
      aria-labelledby="sc-detail-name"
      aria-busy={detail.status === 'loading'}
    >
      <header className="sc-detail__header">
        <h2 id="sc-detail-name" ref={headingRef} tabIndex={-1} className="sc-detail__name">
          {data.student.studentName}
          <span className="sc-detail__class">{data.student.className}</span>
        </h2>
        <SignalBadges signals={activeCase ? activeCase.baseline : data.signals} />
        {activeCase && <span className="sc-status">조정 진행 중</span>}
        <button type="button" className="sc-button sc-button--ghost sc-detail__history" onClick={onShowHistory}>
          학생 기록 보기
        </button>
      </header>

      {detail.status === 'error' && <StaleError what="학생 상세" error={detail.error} onRetry={detail.reload} />}

      <section className="sc-section" aria-label="근거">
        <h3 className="sc-section__title">근거</h3>
        {activeCase ? (
          <ul className="sc-evidence">
            {activeCase.baseline.map((signal) => (
              <li key={signal.type}>
                {signal.summary} <span className="sc-hint">(조정 시작 시점)</span>
              </li>
            ))}
          </ul>
        ) : data.signals.length > 0 ? (
          <ul className="sc-evidence">
            {data.signals.flatMap((signal) => signal.evidence.map((line) => <li key={`${signal.type}-${line}`}>{line}</li>))}
          </ul>
        ) : data.deferred ? (
          <p className="sc-notice">
            최근 7일 유효 학습일이 {data.deferred.validDays}일이라 학습량을 비교하지 않습니다 (판단 보류).
          </p>
        ) : (
          <p className="sc-notice">지금 올라온 신호가 없습니다. 최근 종결한 건은 학생 기록에서 볼 수 있습니다.</p>
        )}
      </section>

      <StudyChart days={data.dailyStudy} usualDailyMinutes={data.usualDailyMinutes} />

      {!activeCase && data.signals.length > 0 && (
        <section className="sc-section" aria-label="확인할 질문">
          <h3 className="sc-section__title">확인할 질문</h3>
          <ul className="sc-questions">
            {data.signals.map((signal) => (
              <li key={signal.type}>{signal.question}</li>
            ))}
          </ul>
        </section>
      )}

      {activeCase ? (
        <ActiveCasePanel
          key={activeCase.caseId}
          branchId={branchId}
          careCase={activeCase}
          asOf={data.asOf}
          revision={detail.revision}
          stale={stale}
          onDecided={saved}
          onNoteSaved={() => onChanged(null)}
          onReloadNeeded={detail.reload}
        />
      ) : (
        data.signals.length > 0 && (
          <ReasonSection
            key={data.student.studentId}
            branchId={branchId}
            studentId={data.student.studentId}
            asOf={data.asOf}
            suggestion={data.planSuggestion}
            revision={detail.revision}
            stale={stale}
            onSaved={saved}
            onReloadNeeded={detail.reload}
          />
        )
      )}
    </article>
  )
}
