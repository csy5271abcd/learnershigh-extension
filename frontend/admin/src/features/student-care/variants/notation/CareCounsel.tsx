// 시안 Y·X·Z′가 함께 쓰는 상담 기록·점검·지난 관리. 기존 CounselForm·RecheckPanel과 학생 케어 API를 그대로 쓴다(상담 기능을 새로 만들지 않는다).
import { CounselForm } from '../../components/CounselForm.tsx'
import { RecheckPanel } from '../../components/RecheckPanel.tsx'
import { useRemote, loadFailure } from '../../model/useRemote.ts'
import { careApi, md, type CareRow } from '../shared/useCareData.ts'

interface Props { s: CareRow; version: number; prefix: string; onSaved: (m: string) => void; onDirty: (dirty: boolean) => void; className?: string }

export function CareCounsel({ s, version, prefix, onSaved, onDirty, className = 'cc' }: Props) {
  const detail = useRemote(`${prefix}/${s.student.studentId}`, () => careApi.detail(s.student.branchId, s.student.studentId), version)
  const history = useRemote(`${prefix}/${s.student.studentId}/history`, () => careApi.history(s.student.branchId, s.student.studentId), version)
  const active = detail.data?.activeCase
  const done = (m: string) => { onDirty(false); onSaved(m) }
  return (
    <div className={className}>
      <section className="cc-form" aria-label={active?.recheckDue ? '점검' : '상담 기록'} onInputCapture={() => onDirty(true)} onChangeCapture={() => onDirty(true)}>
        {loadFailure(detail) ? <p role="alert">학생 상세를 불러오지 못했습니다. <button type="button" className="sc-button" onClick={detail.reload}>다시 시도</button></p>
          : !detail.data ? <p role="status">불러오는 중</p>
          : active?.recheckDue ? <RecheckPanel api={careApi} branchId={s.student.branchId} asOf={detail.data.today ?? detail.data.asOf} careCase={active} onSaved={done} onStale={() => detail.reload()} />
          : active || detail.data.signals.length ? <CounselForm api={careApi} branchId={s.student.branchId} studentId={s.student.studentId} caseId={active?.caseId ?? null} asOf={detail.data.today ?? detail.data.asOf} onSaved={done} onStale={() => detail.reload()} />
          : <p className="cc-muted">관리 사유 없음</p>}
      </section>
      <section className="cc-history" aria-label="지난 관리">
        <h3>지난 관리</h3>
        {loadFailure(history) ? <p role="alert">이력을 불러오지 못했습니다. <button type="button" className="sc-button" onClick={history.reload}>다시 시도</button></p>
          : !history.data ? <p role="status">불러오는 중</p>
          : history.data.items.length ? <ul>{history.data.items.map((item) => <li key={item.eventId}><b>{md(item.occurredOn)}</b> {item.content}</li>)}</ul>
          : <p className="cc-muted">관리 이력 없음</p>}
      </section>
    </div>
  )
}
