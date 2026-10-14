import { studentCareApi } from '../api/studentCareApi.ts'
import { monthDay, shortDate } from '../model/format.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'
import { CounselForm } from './CounselForm.tsx'
import { RecheckPanel } from './RecheckPanel.tsx'
import { StudyChart } from './StudyChart.tsx'

interface Props {
  branchId: string
  studentId: string
  version: number
  onSaved: (message: string) => void
  onStale: () => void
}

/** 선택한 학생: 달라진 점 → 14일 그래프 → 상담 기록 / 점검 → 이력 (student-care.md §4). */
export function StudentPanel({ branchId, studentId, version, onSaved, onStale }: Props) {
  const key = `${branchId}/${studentId}`
  const detail = useRemote(key, () => studentCareApi.detail(branchId, studentId), version)
  const history = useRemote(key, () => studentCareApi.history(branchId, studentId), version)
  const failure = loadFailure(detail)
  const data = detail.data

  if (failure) {
    return (
      <div className="sc-state" role="alert">
        <p>불러오지 못했습니다</p>
        <button type="button" className="sc-button" onClick={detail.reload}>
          다시 시도
        </button>
      </div>
    )
  }
  if (!data) {
    return <p className="sc-state">불러오는 중</p>
  }

  const active = data.activeCase
  const name = data.student.studentName

  // 관리 중인 학생은 지금 수치가 나아져도 관리를 시작한 특이사항을 보여 준다 (목록과 같게).
  const shownSignals = data.signals.length > 0 ? data.signals : (data.activeCase?.baseline ?? [])

  return (
    <article className="sc-detail" aria-labelledby="sc-detail-name">
      <header className="sc-detail__head">
        <h2 id="sc-detail-name" className="sc-detail__name" tabIndex={-1}>
          {name}
        </h2>
        {data.student.className && <span className="sc-detail__class">{data.student.className}</span>}
        {active && !active.recheckDue && active.recheckDate && (
          <span className="sc-badge">다음 점검 {monthDay(active.recheckDate)}</span>
        )}
        {active?.recheckDue && <span className="sc-badge sc-badge--due">점검일</span>}
      </header>

      <ul className="sc-changes">
        {shownSignals.map((signal) => (
          <li key={signal.type}>
            <span className="sc-tag">{signal.label}</span> {signal.summary}
          </li>
        ))}
        {shownSignals.length === 0 && (
          <li className="sc-changes__none">
            {data.deferred ? `기록 부족 · 최근 7일 공부한 날 ${data.deferred.validDays}일` : '특이사항 없음'}
          </li>
        )}
      </ul>

      <StudyChart days={data.dailyStudy} usualDailyMinutes={data.usualDailyMinutes} />

      {active?.recheckDue ? (
        <RecheckPanel
          key={active.caseId + active.recheckDate}
          branchId={branchId}
          asOf={data.asOf}
          careCase={active}
          onSaved={(message) => onSaved(`${name} · ${message}`)}
          onStale={onStale}
        />
      ) : active || data.signals.length > 0 ? (
        <CounselForm
          key={active ? `${active.caseId}-${active.recheckDate}` : 'open'}
          branchId={branchId}
          studentId={studentId}
          asOf={data.asOf}
          caseId={active?.caseId ?? null}
          onSaved={(message) => onSaved(`${name} · ${message}`)}
          onStale={onStale}
        />
      ) : null}

      <section className="sc-history" aria-labelledby="sc-history-title">
        <h3 id="sc-history-title" className="sc-section-title">
          이력
        </h3>
        {loadFailure(history) ? (
          <div className="sc-state" role="alert">
            <p>불러오지 못했습니다</p>
            <button type="button" className="sc-button" onClick={history.reload}>
              다시 시도
            </button>
          </div>
        ) : !history.data ? (
          <p className="sc-state">불러오는 중</p>
        ) : history.data.items.length === 0 ? (
          <p className="sc-state">기록 없음</p>
        ) : (
          <ol className="sc-history__items">
            {history.data.items.map((item) => (
              <li key={item.eventId}>
                <time dateTime={item.occurredOn}>{shortDate(item.occurredOn)}</time>
                <span>{item.content}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  )
}
