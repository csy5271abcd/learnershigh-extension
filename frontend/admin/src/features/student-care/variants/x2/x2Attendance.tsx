// 시안 X′ 출결·계획 제출 표(최근 7일). X의 칸은 글자가 흐려 다크에서 안 읽혔다는 지적(x-handoff.md 5장)에 따라
// 원래 관리 화면의 표처럼 칸 바탕 없이 글자로만 쓰고, 결석·미제출만 빨강 굵게, 예정 없음·기록 없음은 흐리게 한다.
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import { STATE } from '../notation/kit.tsx'
import { newbieOf } from './x2Model.ts'

const SUB = { submitted: '제출', missing: '미제출', off: '예정 없음', unknown: '기록 없음' } as const

export function AttendanceGrid({ s }: { s: CareRow }) {
  const fi = (newbieOf(s)?.firstIdx ?? 0) - 28 // 최근 7일 안 첫 기록 위치
  const cls = (bad: boolean, ok: boolean) => (bad ? 'x2a-bad' : ok ? 'x2a-ok' : 'x2a-none')
  return (
    <table id="x2-fig-att" tabIndex={-1} className="x2a" aria-label="최근 7일 출결과 계획 제출">
      <thead><tr><th scope="col"><span className="sc-visually-hidden">항목</span></th>{s.days.map((d) => <th key={d.date} scope="col" className={d.attendance === 'absent' ? 'x2a-bad' : undefined}>{md(d.date)} <span>{d.dow}</span></th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">출결</th>{s.days.map((d, i) => <td key={d.date} className={cls(d.attendance === 'absent', d.attendance === 'present')}>{i < fi ? '첫 기록 전' : STATE[d.attendance]}</td>)}</tr>
        <tr><th scope="row">계획 제출</th>{s.days.map((d, i) => <td key={d.date} className={cls(d.submission === 'missing', d.submission === 'submitted')}>{i < fi ? '첫 기록 전' : SUB[d.submission]}</td>)}</tr>
      </tbody>
    </table>
  )
}


