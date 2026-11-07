// 학생 한 명의 상세(시안 A–D 공통). representation-v5.md 3장: 머리 숫자 3개 + 그림. 날짜별 정확값은 안내(마우스·초점)로.
import { useState, type ReactNode } from 'react'
import { CounselForm } from '../../components/CounselForm.tsx'
import { RecheckPanel } from '../../components/RecheckPanel.tsx'
import { useRemote, loadFailure } from '../../model/useRemote.ts'
import { careApi, md, type CareRow } from './useCareData.ts'
import { StudyDumbbell, StartDumbbell, Progress7, SubjectDumbbell, Month35, VisionMini } from './charts.tsx'
import { StudentRows } from './StudentRows.tsx'
import type { Thresholds } from './bands.ts'
import type { LeaveGuard } from './useLeaveGuard.tsx'

interface Props {
  s: CareRow
  version: number
  startShiftMinutes: number
  studyDropPercent: number
  thresholds: Thresholds
  executionRate: number
  onSaved: (message: string) => void
  guard: LeaveGuard
  actions?: ReactNode
}

export function StudentFull({ s, version, startShiftMinutes, studyDropPercent, thresholds, executionRate, onSaved, guard, actions }: Props) {
  const [byDay, setByDay] = useState(false)
  const detail = useRemote(s.student.studentId, () => careApi.detail(s.student.branchId, s.student.studentId), version)
  const history = useRemote(`${s.student.studentId}/history`, () => careApi.history(s.student.branchId, s.student.studentId), version)
  const active = detail.data?.activeCase
  const done = (m: string) => { guard.setDirty(false); onSaved(m) }
  const headingId = `v5-st-${s.student.studentId}`
  return (
    <article className="v5-student" aria-labelledby={headingId} data-care-detail-student={s.student.studentName}>
      <header className="v5-student-head">
        <div>
          <h2 id={headingId}>{s.student.studentName} <span className="v5-muted">{s.student.className}</span>{s.statusLabel && <span className={`v5-status v5-status-${s.status}`}>{s.statusLabel}{s.recheckDate ? ` · 다음 확인 ${md(s.recheckDate)}` : ''}</span>}</h2>
          {s.chips.length > 0 && <p className="v5-chips">{s.chips.map((c) => <span key={c.text} className={`v5-chip${c.derived ? ' v5-chip-ref' : ''}`}>{c.text}</span>)}</p>}
        </div>
        {actions && <div className="v5-actions v5-no-dirty">{actions}</div>}
      </header>
      <StudentRows s={s} t={thresholds} executionRate={executionRate} />
      <div className="v5-student-grid">
        <section><h3>35일 출결</h3><Month35 s={s} /></section>
        <section><h3>과목 비중 <span className="v5-muted">계획 → 실제</span></h3><SubjectDumbbell s={s} /></section>
      </div>
      <section>
        <button type="button" className="sc-button v5-no-dirty" aria-expanded={byDay} onClick={() => setByDay(!byDay)}>{byDay ? '날짜별 닫기' : '날짜별 보기'}</button>
        {byDay && <div className="v5-student-grid v5-byday">
          <section><h3>학습 시간</h3><StudyDumbbell s={s} dropPercent={studyDropPercent} /></section>
          <section><h3>입실 시각</h3><StartDumbbell s={s} shift={startShiftMinutes} /></section>
          <section><h3>진행률 <span className="v5-muted">계획 대비 실제</span></h3><Progress7 days={s.days} /></section>
          <section><h3>비전 관찰 <span className="v5-tag">예시</span></h3><VisionMini s={s} /></section>
        </div>}
      </section>
      <section className="v5-counsel" {...guard.watch}>
        <h3>상담 기록</h3>
        {loadFailure(detail) ? <p role="alert">학생 상세를 불러오지 못했습니다. <button type="button" className="sc-button" onClick={detail.reload}>다시 시도</button></p>
          : !detail.data ? <p role="status">불러오는 중</p>
          : active?.recheckDue ? <RecheckPanel api={careApi} branchId={s.student.branchId} asOf={detail.data.today ?? detail.data.asOf} careCase={active} onSaved={done} onStale={() => detail.reload()} />
          : active || detail.data.signals.length ? <CounselForm api={careApi} branchId={s.student.branchId} studentId={s.student.studentId} caseId={active?.caseId ?? null} asOf={detail.data.today ?? detail.data.asOf} onSaved={done} onStale={() => detail.reload()} />
          : <p className="v5-muted">관리 사유 없음</p>}
      </section>
      <section className="v5-history">
        <h3>지난 관리</h3>
        {loadFailure(history) ? <p role="alert">이력을 불러오지 못했습니다. <button type="button" className="sc-button" onClick={history.reload}>다시 시도</button></p>
          : !history.data ? <p role="status">불러오는 중</p>
          : history.data.items.length ? <ul>{history.data.items.map((item) => <li key={item.eventId}><b>{md(item.occurredOn)}</b> {item.content}</li>)}</ul>
          : <p className="v5-muted">관리 이력 없음</p>}
      </section>
    </article>
  )
}
