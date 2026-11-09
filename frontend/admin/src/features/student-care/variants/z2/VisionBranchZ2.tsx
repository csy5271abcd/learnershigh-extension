// Z′ 학습관 탭의 사진 관찰 카드. 최근 7일 종류별로 비몰입이 많았던 학생 8명(건수 많은 순)을 세우고, 막대 길이 = 그 학생의 7일 비몰입 건수(세 열 같은 눈금), 막대 바로 뒤에 건수.
// 서버 판정 기준이 없어 막대는 중립색이다. 학생 상세의 사진 관찰 건수와 같은 단위.
// 이름을 누르면 같은 겹창 상세가 열린다. 판정은 이미지 인식 서버 그대로.
import type { CareRow } from '../shared/useCareData.ts'
import { eventDate, SUP_BEHAVIORS, SUP_LABEL, supLoadingText, type SupState } from '../supervisor/supervisorClient.ts'

export function VisionBranchZ2({ rows, sup, onOpen }: { rows: CareRow[]; sup: SupState; onOpen: (r: CareRow, list: CareRow[]) => void }) {
  if (sup.status !== 'ready') return <section className="z-metric" aria-label="사진 관찰"><header><h3>사진 관찰</h3></header><p className={sup.status === 'error' ? 'z-vg' : 'z-empty'} role={sup.status === 'error' ? 'alert' : 'status'}>{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : supLoadingText(sup)}</p></section>
  const recent = new Set(rows[0]?.days.map((d) => d.date) ?? [])
  const per = SUP_BEHAVIORS.map((b) => ({ b, list: rows.map((r) => ({ r, m: (sup.byStudent.get(r.student.studentId) ?? []).filter((e) => e.reason === b && recent.has(eventDate(e))).length })).filter((x) => x.m > 0).sort((a, c) => c.m - a.m) }))
  const max = Math.max(1, ...per.flatMap((x) => x.list.map((y) => y.m)))
  return (
    <section className="z-metric z2-vb" aria-label="사진 관찰">
      <header><h3>사진 관찰 · 최근 7일</h3></header>
      <div className="z2-vb-cols">
        {per.map(({ b, list }) => (
          <div key={b} className="z2-vb-col">
            <h4>{SUP_LABEL[b]} <span>많은 순 {Math.min(8, list.length)}명 / {list.length}명</span></h4>
            <ol>{list.slice(0, 8).map(({ r, m }) => <li key={r.student.studentId}>
              <button type="button" onClick={() => onOpen(r, list.map((x) => x.r))} data-tip={`${r.student.studentName} · 최근 7일 ${SUP_LABEL[b]} ${m}건`}>{r.student.studentName}</button>
              <span className="z2-vb-bar"><i style={{ width: `${(m / max) * 100}%` }} /><em>{m}건</em></span>
            </li>)}</ol>
          </div>
        ))}
      </div>
    </section>
  )
}
