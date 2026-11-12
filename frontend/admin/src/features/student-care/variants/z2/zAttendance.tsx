// Z′ 전용 출결·계획 제출 칸(채택한 글자 칸: 결석·미제출만 빨강).
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { STATE } from '../notation/kit.tsx'

const SUB = { submitted: '제출', missing: '미제출', off: '예정 없음', unknown: '기록 없음' } as const

/** only를 주면 그 한 줄만(사유 카드의 일간 보기) */
export function ZAttendance({ s, only }: { s: CareRow; only?: 'att' | 'sub' }) {
  const cell = (bad: boolean, ok: boolean, word: string, tip: string) => <span className={`za-chip${bad ? ' za-bad' : ok ? '' : ' za-none'}`} data-tip={tip}>{word}</span>
  return (
    <div className="za" role="table" aria-label="최근 7일 출결과 계획 제출">
      <div className="za-row za-head" role="row"><span />{s.days.map((d) => <span key={d.date} role="columnheader" className={d.attendance === 'absent' ? 'za-h-bad' : undefined}><b>{md(d.date)}</b><i>{d.dow}</i></span>)}</div>
      {only !== 'sub' && <div className="za-row" role="row"><span role="rowheader">출결</span>{s.days.map((d) => <span key={d.date} role="cell">{cell(d.attendance === 'absent', d.attendance === 'present', STATE[d.attendance], `${md(d.date)} ${d.dow} ${STATE[d.attendance]}`)}</span>)}</div>}
      {only !== 'att' && <div className="za-row" role="row"><span role="rowheader">계획 제출</span>{s.days.map((d) => <span key={d.date} role="cell">{cell(d.submission === 'missing', d.submission === 'submitted', SUB[d.submission], `${md(d.date)} ${d.dow} 계획 ${SUB[d.submission]}`)}</span>)}</div>}
    </div>
  )
}
