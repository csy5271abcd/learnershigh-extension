// 표시법 20종 비교 화면(/student-care/notation). 학생 한 명을 골라 항목마다 다섯 표시법을 같은 데이터로 그린다.
// 보고서(docs/design/ops-redesign/reviews/notation-report.html)의 캡처를 여기서 찍는다. 메뉴에는 두지 않는다.
import { useMemo, useState } from 'react'
import { useCareData } from '../shared/useCareData.ts'
import { TipHost } from '../z/Tip.tsx'
import { useSupervisorEvents, type SupEvent } from '../supervisor/supervisorClient.ts'
import type { NotationProps } from './kit.tsx'
import { NOTATIONS } from '../notation2/list.ts'
import '../../student-care.css'
import '../notation2/notation2.css'

export function NotationLab() {
  const data = useCareData('notation')
  const params = new URLSearchParams(window.location.search)
  const [name, setName] = useState(params.get('student') ?? '장수빈')
  const only = params.get('only')
  const rows = useMemo(() => data.rows ?? [], [data.rows])
  const s = rows.find((r) => r.student.studentName === name) ?? rows[0]
  const ids = useMemo(() => rows.map((r) => r.student.studentId), [rows])
  const sup = useSupervisorEvents(ids)
  if (data.failed) return <p role="alert">학생 케어 자료를 불러오지 못했습니다</p>
  if (!s) return <p role="status">불러오는 중</p>
  const evAll = sup.status === 'ready' ? sup.byStudent : new Map<string, SupEvent[]>()
  const props: NotationProps = { s, rows, ev: evAll.get(s.student.studentId) ?? [], evAll, th: { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate } }
  return (
    <TipHost>
      <main className="nt-page n2-page">
        <header className="nt-head">
          <h1>표시법 20종</h1>
          <label>학생 <select value={s.student.studentName} onChange={(e) => setName(e.target.value)}>{rows.map((r) => <option key={r.student.studentId}>{r.student.studentName}</option>)}</select></label>
          {sup.status !== 'ready' && <span role="status">{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : '사진 관찰 불러오는 중'}</span>}
        </header>
        {NOTATIONS.map((g) => (
          <section key={g.key} className="nt-group" aria-label={g.title}>
            <h2>{g.title}</h2>
            {g.items.filter((n) => !only || only === n.id).map((n) => (
              <article key={n.id} id={`nt-${n.id}`} className="nt-card">
                <h3><span>{n.id}</span>{n.name}</h3>
                <n.C {...props} />
              </article>
            ))}
          </section>
        ))}
      </main>
    </TipHost>
  )
}
