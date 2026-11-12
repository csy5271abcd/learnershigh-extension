// 신규 '생활 레포트' 탭(주간). 2026-11-12 사용자: 지표 나열 말고 "저번 주보다 입실이 ~분 늦어졌어요, 결석 언제, 공부 시간 +20분(+n%), 계획 달성률 ~" 같은 변화 위주.
// 이번 주(고른 날짜가 든 월–일, 고른 날까지) vs 지난주 같은 요일까지. 시안 셋, 계산·그리기 모두 시안 파일마다 따로.
import { useState } from 'react'
import type { CareRow } from '../../shared/useCareData.ts'
import type { SupEvent } from '../../supervisor/supervisorClient.ts'
import { LifeV1 } from './LifeV1.tsx'
import { LifeV2 } from './LifeV2.tsx'
import { LifeV3 } from './LifeV3.tsx'

const NAMES = ['변화 카드', '지난주·이번주 겹쳐 보기', '한 주 시간표']

export function LifeTab({ s, ev, date }: { s: CareRow; ev: SupEvent[]; date: string }) {
  const [v, setV] = useState(1)
  return <div className="lv">
    <div className="lv-bar"><span>주간 · 지난주 같은 요일까지와 비교</span>
      <div className="lv-seg" role="group" aria-label="시안">{NAMES.map((n, i) => <button key={n} type="button" aria-pressed={v === i + 1} onClick={() => setV(i + 1)}>시안 {i + 1} · {n}</button>)}</div></div>
    {v === 1 && <LifeV1 s={s} ev={ev} date={date} />}
    {v === 2 && <LifeV2 s={s} date={date} />}
    {v === 3 && <LifeV3 s={s} date={date} />}
  </div>
}

