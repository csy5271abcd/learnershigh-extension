// Z안 학생 상세. 명부 자리를 넓게 차지하고(팝업 아님, F04) 위에서 목록·이전·다음으로 오간다.
// 순서: 달라진 점 문장 → 지표 그림 → 상담 기록(기존 CounselForm·RecheckPanel) → 지난 관리.
import type { ReactNode } from 'react'
import { CounselForm } from '../../components/CounselForm.tsx'
import { RecheckPanel } from '../../components/RecheckPanel.tsx'
import { useRemote, loadFailure } from '../../model/useRemote.ts'
import { careApi, md, type CareData, type CareRow } from '../shared/useCareData.ts'
import { AttendanceWeeks, SubjectBullets, VisionWeekView, WeekBoard } from './StudentCharts.tsx'
import type { VisionWeek } from './vision/useVisionWeek.ts'
import { VisionGate } from './vision/VisionGate.tsx'
import { GROUP_LABEL, notesFor, recheckText, type VisionSummary } from './zModel.ts'

interface Props {
  s: CareRow
  vision: VisionSummary
  week: VisionWeek
  data: CareData
  nav: ReactNode
  onSaved: (message: string) => void
  /** 상담 영역에 입력이 생기면 true */
  onDirty: (dirty: boolean) => void
}

function Section({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return <section className="z-sec"><header><h3>{title}</h3>{aside && <span className="z-aside">{aside}</span>}</header>{children}</section>
}

export function StudentDetail({ s, vision, week, data, nav, onSaved, onDirty }: Props) {
  const detail = useRemote(`z/${s.student.studentId}`, () => careApi.detail(s.student.branchId, s.student.studentId), data.version)
  const history = useRemote(`z/${s.student.studentId}/history`, () => careApi.history(s.student.branchId, s.student.studentId), data.version)
  const active = detail.data?.activeCase
  const notes = notesFor(s, vision)
  const flagged = (t: string) => s.signals.some((x) => x.type === t)
  const done = (m: string) => { onDirty(false); onSaved(m) }
  return (
    <article className="z-detail" aria-labelledby="z-detail-name" data-care-detail-student={s.student.studentName}>
      {nav}
      <header className="z-detail-head">
        <h2 id="z-detail-name">{s.student.studentName} <span className="z-class">{s.student.className}</span></h2>
        <span className={`z-group z-group-${s.status}`}>{GROUP_LABEL[s.status]}{recheckText(s) && ` · ${recheckText(s)}`}</span>
      </header>
      {notes.length > 0 && <ul className="z-headline">{notes.map((n) => <li key={n.key} className={`z-note-${n.tone}`}>{n.text}{n.tone === 'example' && <span className="z-example">예시</span>}</li>)}</ul>}

      <section className="z-card" aria-label="최근 7일"><WeekBoard s={s} dropPercent={data.studyDropPercent} shift={data.startShiftMinutes} rateThreshold={data.executionRate} showRate={!flagged('EXECUTION_GAP')} range={7} /></section>
      <div className="z-grid2">
        <Section title="최근 5주 출결·계획 제출"><AttendanceWeeks s={s} /></Section>
        <Section title="과목별 실제 비중"><SubjectBullets s={s} /></Section>
      </div>
      <Section title="사진 관찰 최근 7일" aside={vision ? `사진 ${vision.totals.person_visible.denominator}장` : undefined}>{week.status !== 'ready' ? <VisionGate week={week} /> : vision && vision.days.some((d) => d.doc) ? <VisionWeekView s={s} v={vision} /> : <p className="z-empty">최근 7일 사진 관찰 보고 없음</p>}</Section>

      <section className="z-counsel" aria-label={active?.recheckDue ? '점검' : '상담 기록'} onInputCapture={() => onDirty(true)} onChangeCapture={() => onDirty(true)}>
        {loadFailure(detail) ? <p role="alert">학생 상세를 불러오지 못했습니다. <button type="button" className="sc-button" onClick={detail.reload}>다시 시도</button></p>
          : !detail.data ? <p role="status">불러오는 중</p>
          : active?.recheckDue ? <RecheckPanel api={careApi} branchId={s.student.branchId} asOf={detail.data.today ?? detail.data.asOf} careCase={active} onSaved={done} onStale={() => detail.reload()} />
          : active || detail.data.signals.length ? <CounselForm api={careApi} branchId={s.student.branchId} studentId={s.student.studentId} caseId={active?.caseId ?? null} asOf={detail.data.today ?? detail.data.asOf} onSaved={done} onStale={() => detail.reload()} />
          : <p className="z-muted">관리 사유 없음</p>}
      </section>
      <section className="z-history" aria-labelledby="z-history-title">
        <h3 id="z-history-title">지난 관리</h3>
        {loadFailure(history) ? <p role="alert">이력을 불러오지 못했습니다. <button type="button" className="sc-button" onClick={history.reload}>다시 시도</button></p>
          : !history.data ? <p role="status">불러오는 중</p>
          : history.data.items.length ? <ul>{history.data.items.map((item) => <li key={item.eventId}><b>{md(item.occurredOn)}</b> {item.content}</li>)}</ul>
          : <p className="z-muted">관리 이력 없음</p>}
      </section>
    </article>
  )
}
