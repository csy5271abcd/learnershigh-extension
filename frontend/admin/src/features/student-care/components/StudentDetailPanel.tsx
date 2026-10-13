import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { outcomeOf, type Outcome } from '../model/outcome.ts'
import type { CareCase } from '../model/types.ts'
import { focusIsLost, mayReclaimFocus, useRetryFocus } from '../model/useFocus.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'
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
  /** 보던 상태가 서버와 달라졌을 때 (보드 · 상세 · 요약을 모두 다시 불러온다). */
  onStale: (error: ApiError) => void
  /** 보드 · 상세 · 요약을 모두 다시 불러온다. */
  onRefresh: () => void
  onShowHistory: () => void
}

const NOTE_SAVED = { message: '메모를 남겼습니다' }

/** 카드를 고르면 근거 · 학습량 · 확인할 질문 · 사유 확인 또는 진행 중인 건이 열린다. */
export function StudentDetailPanel({
  branchId,
  studentId,
  version,
  onChanged,
  onStale,
  onRefresh,
  onShowHistory,
}: Props) {
  const detail = useRemote(
    studentId ? `${branchId}/${studentId}` : null,
    () => studentCareApi.detail(branchId, studentId ?? ''),
    version,
  )
  const articleRef = useRef<HTMLElement>(null)
  const { anchorRef: headingRef, retry } = useRetryFocus<HTMLHeadingElement>(detail)
  const failure = loadFailure(detail)
  const retrying = detail.status === 'loading'
  // 상세 안에 Focus가 있었는지. 다시 불러온 내용에서 Focus 있던 요소(버튼 · 입력 칸)가 사라지면 상세 제목으로 옮긴다.
  const focusInside = useRef(false)
  const loadedStudentId = detail.data?.student.studentId ?? null

  // 좁은 화면에서는 상세가 목록 아래에 있으므로, 학생을 고르면 상세가 보이게 한다.
  useEffect(() => {
    if (loadedStudentId) articleRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [loadedStudentId])

  // 새 데이터를 그린 직후(화면에 그리기 전) 확인해 Focus가 잠깐이라도 body에 머물지 않게 한다.
  // 예: 결정 뒤 건이 종결돼 버튼이 사라짐, 상태 오류 뒤 사유 확인이 사라짐, "최신 상태 다시 불러오기" 뒤 안내가 사라짐.
  useLayoutEffect(() => {
    if (focusInside.current && focusIsLost()) headingRef.current?.focus()
  }, [detail.revision, headingRef])

  if (!studentId) {
    return (
      <div className="sc-detail">
        <Empty title="학생을 고르세요" description="왼쪽 카드에서 학생을 고르면 근거와 확인할 질문이 열립니다." />
      </div>
    )
  }
  if (failure && !detail.data) {
    return (
      <div className="sc-detail">
        <ErrorState error={failure} onRetry={retry} retrying={retrying} />
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
  // 저장 / 결정이 끝나면 누른 버튼이 곧 사라지므로(폼 초기화 · 건 종결) 바로 상세 제목으로 Focus를 옮긴다.
  const saved = (careCase: CareCase) => {
    if (mayReclaimFocus()) headingRef.current?.focus()
    onChanged(outcomeOf(careCase, data.student.studentName))
  }

  return (
    <article
      ref={articleRef}
      className="sc-detail"
      aria-labelledby="sc-detail-name"
      aria-busy={detail.status === 'loading'}
      onFocus={() => {
        focusInside.current = true
      }}
      onBlur={(event) => {
        // 요소가 사라져 빠진 경우(relatedTarget 없음)는 안에 있던 것으로 둔다.
        const next = event.relatedTarget
        if (next instanceof Node && !event.currentTarget.contains(next)) focusInside.current = false
      }}
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

      {failure && <StaleError what="학생 상세" error={failure} onRetry={retry} retrying={retrying} />}

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
          onNoteSaved={() => onChanged(NOTE_SAVED)}
          onStale={onStale}
          onRetryLatest={onRefresh}
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
            onStale={onStale}
            onRetryLatest={onRefresh}
          />
        )
      )}
    </article>
  )
}
