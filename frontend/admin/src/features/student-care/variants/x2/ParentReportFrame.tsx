// 관리 화면 메뉴 '학부모 리포트': 원본 학부모 리포트 화면을 확장 쪽에 옮긴 것(화면만) + 신규 생활 레포트 탭 + 상담 첨부.
// ?student=demo_s309처럼 학생을 넘기면 그 학생으로 연다.
import { useMemo, useState } from 'react'
import { useCareData } from '../shared/useCareData.ts'
import { useSupervisorEvents } from '../supervisor/supervisorClient.ts'
import { ReportWithAttach } from './report/ReportWithAttach.tsx'
import '../../student-care.css'
import './x2.css'

export function ParentReportFrame() {
  const data = useCareData('pr')
  const rows = useMemo(() => data.rows ?? [], [data.rows])
  const [sid, setSid] = useState(() => new URLSearchParams(window.location.search).get('student') ?? 'demo_s309')
  const s = rows.find((r) => r.student.studentId === sid) ?? rows[0]
  const sup = useSupervisorEvents(useMemo(() => (s ? [s.student.studentId] : []), [s]))
  const ev = s && sup.status === 'ready' ? sup.byStudent.get(s.student.studentId) ?? [] : []
  return <div className="x2" style={{ gap: 12 }}>
    <header className="x2-top"><div><h1>학부모 리포트</h1><p>학습관리 - 레포트센터 · 원본 리포트 화면 + 생활 레포트·상담 첨부(신규)</p></div>
      <div className="x2-top-tools">{rows.length > 0 && <select aria-label="학생" value={s?.student.studentId ?? ''} onChange={(e) => { setSid(e.target.value); history.replaceState(null, '', `?student=${e.target.value}`) }}>{rows.map((r) => <option key={r.student.studentId} value={r.student.studentId}>{r.student.studentName} · {r.student.className}</option>)}</select>}</div></header>
    {data.failed ? <p className="x2-error" role="alert">학생 기록을 불러오지 못했습니다.</p> : !s ? <p className="x2-state">불러오는 중</p>
      : <ReportWithAttach key={s.student.studentId} s={s} ev={ev} asOf={s.days[s.days.length - 1].date} version={data.version} />}
  </div>
}

