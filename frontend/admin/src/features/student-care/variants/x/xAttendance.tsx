// X 전용 출결·계획 제출 칸.
// 출결·계획 제출 글자 칸(2026-11-08 채택). 평소는 흐린 회색, 결석·미제출만 빨강. 이 두 줄만 칸 안 글자를 허용한다.
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { day, STATE } from '../notation/kit.tsx'

const SUB = { submitted: '제출', missing: '미제출', off: '예정 없음', unknown: '기록 없음' } as const

export function AttendanceChips({ s }: { s: CareRow }) {
  const chip = (bad: boolean, ok: boolean, word: string, tip: string) =>
    <span className={`xa-chip${bad ? ' xa-bad' : ok ? '' : ' xa-none'}`} tabIndex={0} data-tip={tip} aria-label={tip}>{word}</span>
  return (
    <div className="xa" role="table" aria-label="최근 7일 출결과 계획 제출">
      <div className="xa-row xa-head" role="row"><span />{s.days.map((d) => <span key={d.date} role="columnheader" className={d.attendance === 'absent' ? 'xa-h-bad' : undefined}><b>{md(d.date)}</b> {d.dow}</span>)}</div>
      <div className="xa-row" role="row"><span role="rowheader">출결</span>{s.days.map((d) => <span key={d.date} role="cell">{chip(d.attendance === 'absent', d.attendance === 'present', STATE[d.attendance], `${day(d)} ${STATE[d.attendance]}`)}</span>)}</div>
      <div className="xa-row" role="row"><span role="rowheader">계획 제출</span>{s.days.map((d) => <span key={d.date} role="cell">{chip(d.submission === 'missing', d.submission === 'submitted', SUB[d.submission], `${day(d)} 계획 ${SUB[d.submission]}`)}</span>)}</div>
    </div>
  )
}
