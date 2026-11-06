import type { OpsDay } from './opsModel.ts'


/** 7일 출결(위)·계획 제출(아래) 띠. 결석·미제출은 색과 함께 모양으로도 구별한다(색만으로 전달하지 않음) */
export function OpsStrip({ days }: { days: OpsDay[] }) {
  const absent = days.filter((d) => d.attendance === 'absent').map((d) => `${d.date.slice(5).replace('-', '/')}`)
  const missing = days.filter((d) => d.submission === 'missing').map((d) => `${d.date.slice(5).replace('-', '/')}`)
  const label = `최근 7일 입실 ${days.filter((d) => d.attendance === 'present').length}일${absent.length ? `, 결석 ${absent.join(', ')}` : ''}${missing.length ? `, 계획 미제출 ${missing.join(', ')}` : ''}`
  return (
    <span className="ops-strip" role="img" aria-label={label}>
      <span className="ops-strip-row">{days.map((d) => <i key={d.date} className={`ops-att ops-att-${d.attendance}`} />)}</span>
      <span className="ops-strip-row">{days.map((d) => <i key={d.date} className={`ops-sub ops-sub-${d.submission}`} />)}</span>
    </span>
  )
}

export function OpsStripLegend() {
  return (
    <span className="ops-legend" aria-hidden="true">
      <span><i className="ops-att ops-att-present" />입실</span>
      <span><i className="ops-att ops-att-absent" />결석</span>
      <span><i className="ops-sub ops-sub-missing" />계획 미제출</span>
      <span><i className="ops-att ops-att-off" />예정 없음</span>
      <span><i className="ops-att ops-att-unknown" />기록 없음</span>
    </span>
  )
}
