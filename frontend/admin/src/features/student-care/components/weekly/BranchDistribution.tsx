import { useId, useMemo, useState } from 'react'
import { branchDistribution, missingRecordLabel } from '../../model/branchDistribution.ts'
import type { DistributionField, DistributionStudent } from '../../model/branchDistribution.ts'
import './BranchDistribution.css'

interface Props {
  students: DistributionStudent[]
  field: DistributionField
  selectedId: string | null
  onSelect: (id: string | null) => void
}
const dateLabel = (date: string) => `${date.slice(5).replace('-', '/')} (${'일월화수목금토'[new Date(`${date}T12:00:00Z`).getUTCDay()]})`
const clock = (value: number) => `${String(Math.floor(Math.round(value) / 60)).padStart(2, '0')}:${String(Math.round(value) % 60).padStart(2, '0')}`

export function BranchDistribution({ students, field, selectedId, onSelect }: Props) {
  const headingId = useId()
  const days = useMemo(() => branchDistribution(students, field), [students, field])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const active = days.find(day => day.date === activeDate) ?? days.findLast(day=>day.count>=4) ?? days[days.length - 1]
  const selected = students.find(student => student.id === selectedId)
  const format = (value: number | null | undefined) => value === null || value === undefined ? '기록 없음' : field === 'start' ? clock(value) : `${Math.round(value).toLocaleString('ko')}분`
  const values = students.flatMap(student => student.days.map(day => day[field])).filter((value): value is number => value !== null && Number.isFinite(value))
  const min = field === 'minutes' ? 0 : values.length ? Math.max(0, Math.floor(Math.min(...values) / 60) * 60 - 30) : 0
  const max = field === 'minutes' ? Math.max(120, Math.ceil(Math.max(0, ...values) / 120) * 120) : values.length ? Math.max(min + 60, Math.min(1440, Math.ceil(Math.max(...values) / 60) * 60 + 30)) : 1440
  const x = (index: number) => 66 + index * (610 / Math.max(1, days.length - 1))
  const y = (value: number) => 224 - (value - min) / Math.max(1, max - min) * 188
  const chosen = days.map(day => selected?.days.find(record => record.date === day.date)?.[field] ?? null)
  function line(points: (number | null)[], className: string) {
    return <g className={className}>{points.map((value, index) => value === null ? null : <g key={days[index].date}>
      {index > 0 && points[index - 1] !== null && <line x1={x(index - 1)} y1={y(points[index - 1]!)} x2={x(index)} y2={y(value)} />}
      <circle cx={x(index)} cy={y(value)} r="4" />
    </g>)}</g>
  }
  if (!days.length) return <p className="bd-empty">표시할 일별 기록이 없습니다.</p>
  return <div className="bd-distribution">
    <div className="bd-legend" aria-label="그래프 범례">
      <span><i className="bd-key-band" />중간 50% 범위</span><span><i className="bd-key-mean" />학습관 평균</span><span><i className="bd-key-outlier" />이상치</span>
      {selected && <span className="bd-selected-name"><i className="bd-key-selected" />{selected.name} 선택</span>}
      <button type="button" className="bd-reset" disabled={!selectedId} onClick={() => onSelect(null)}>전체 분포로</button>
    </div>
    <div className="bd-layout">
      <div className="bd-chart">
        <div className="bd-chart-scroll"><svg viewBox="0 0 734 300" className="bd-svg" role="group" aria-label={`${field === 'minutes' ? '학습 시간' : '입실 시각'} 7일 분포. 날짜를 선택하면 옆의 학생별 기록이 바뀝니다.`}>
          {[min, (min + max) / 2, max].map(value => <g className="bd-grid" key={value}><line x1="66" x2="676" y1={y(value)} y2={y(value)} /><text x="56" y={y(value) + 4} textAnchor="end">{field === 'start' ? clock(value) : Math.round(value)}</text></g>)}
          <g className="bd-band">{days.map((day, index) => {
            if (day.q25 === null || day.q75 === null) return null
            const next = days[index + 1]
            return <g key={day.date}>
              <line x1={x(index)} x2={x(index)} y1={y(day.q25)} y2={y(day.q75)} />
              {next && next.q25 !== null && next.q75 !== null && <polygon points={`${x(index)},${y(day.q25)} ${x(index + 1)},${y(next.q25)} ${x(index + 1)},${y(next.q75)} ${x(index)},${y(day.q75)}`} />}
            </g>
          })}</g>
          {line(days.map(day => day.mean), 'bd-mean')}
          {selected && line(chosen, 'bd-selected')}
          {days.map((day, index) => <g key={day.date}>
            <line className={`bd-date-guide${day.date === active.date ? ' is-active' : ''}`} x1={x(index)} x2={x(index)} y1="29" y2="229" />
            <g role="button" tabIndex={0} className="bd-date-target" aria-label={`${dateLabel(day.date)} 학생별 기록 보기`} aria-pressed={day.date === active.date} onMouseEnter={() => setActiveDate(day.date)} onFocus={() => setActiveDate(day.date)} onClick={() => setActiveDate(day.date)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveDate(day.date) } }}>
              <rect x={x(index) - 305 / Math.max(1,days.length-1)} y="27" width={610 / Math.max(1,days.length-1)} height="239" rx="5" />
              <text x={x(index)} y="253" textAnchor="middle"><tspan x={x(index)}>{day.date.slice(5).replace('-','/')}</tspan><tspan x={x(index)} dy="24">{'일월화수목금토'[new Date(`${day.date}T12:00:00Z`).getUTCDay()]}</tspan></text>
            </g>
            {day.outliers.map(point => <g key={point.id} className="bd-outlier" role="button" tabIndex={0} aria-label={`${point.name} ${dateLabel(day.date)} ${format(point.value)} 이상치. 학생 선택`} onMouseEnter={() => setActiveDate(day.date)} onFocus={() => setActiveDate(day.date)} onClick={() => { setActiveDate(day.date); onSelect(point.id) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveDate(day.date); onSelect(point.id) } }}><circle className="bd-outlier-hit" cx={x(index)} cy={y(point.value)} r="22"/><circle className="bd-outlier-dot" cx={x(index)} cy={y(point.value)} r="5.5"/></g>)}
          </g>)}
        </svg></div>
      </div>
      <section className="bd-readout" aria-labelledby={headingId}>
        <header><h4 id={headingId}>{dateLabel(active.date)} 학생별 기록</h4><span>{field === 'minutes' ? '학습 시간' : '입실 시각'} · 기록 {active.count}/{students.length}명</span><p>평균 <b>{format(active.mean)}</b><br />중간 50% <b>{active.q25 === null ? '기록 없음' : `${format(active.q25)} ~ ${format(active.q75)}`}</b></p></header>
        <table><thead><tr><th scope="col">학생 · 눌러서 비교</th><th scope="col">기록</th></tr></thead><tbody>{students.map(student => {
          const record = student.days.find(day => day.date === active.date)
          const value = record?.[field] ?? null
          const outlier = active.outliers.some(point => point.id === student.id)
          return <tr className={`bd-student${student.id === selectedId ? ' is-selected' : ''}`} key={student.id}><th scope="row"><button type="button" aria-pressed={student.id === selectedId} onClick={() => onSelect(student.id === selectedId ? null : student.id)}>{student.name}{student.id === selectedId && <small>선택</small>}</button></th><td>{value===null?missingRecordLabel(record,field):format(value)}{outlier && <small className="bd-outlier-label">이상치</small>}</td></tr>
        })}</tbody></table>
      </section>
    </div>
    <details className="bd-method"><summary>분포 기준</summary><p>중간 50%는 Q25~Q75이며 사분위수는 선형 보간합니다. 이상치는 Q25−1.5×IQR 미만 또는 Q75+1.5×IQR 초과이며 케어 판정과 별개입니다. 기록 4명 미만인 날짜는 이상치를 판정하지 않습니다. 결측은 평균에서 제외하고 관측된 0은 포함합니다.</p></details>
  </div>
}
