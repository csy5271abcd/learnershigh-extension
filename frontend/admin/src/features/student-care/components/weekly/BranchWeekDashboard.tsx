import { useState } from 'react'
import { studentCareApi } from '../../api/studentCareApi.ts'
import type { CareApi } from '../../api/httpStudentCareApi.ts'
import { loadCareRoster, type CareRosterRow } from '../../api/loadCareRoster.ts'
import { missingRecordLabel } from '../../model/branchDistribution.ts'
import { BranchDistribution } from './BranchDistribution.tsx'
import { useRemote, loadFailure } from '../../model/useRemote.ts'

import type { WeekDay } from '../../model/weeklyReviewTypes.ts'

import { useCareDesign } from '../../model/CareDesignContext.ts'
import { BranchOverviewDashboard } from './BranchOverviewDashboard.tsx'
import './BranchWeekDashboard.css'

interface Props { branchId: string; version: number; onOpenStudent: (id: string) => void; onMissingBranch?:()=>void; api?:CareApi }
interface Row extends CareRosterRow { attention: boolean }
const mean = (values: (number | null)[]) => {
  const known = values.filter((value): value is number => value !== null)
  return known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null
}
const number = (value: number | null) => value === null ? '—' : Math.round(value).toLocaleString('ko')
const clock = (value: number | null) => value === null ? '—' : `${String(Math.floor(Math.round(value) / 60)).padStart(2, '0')}:${String(Math.round(value) % 60).padStart(2, '0')}`
const dateLabel = (date: string) => `${date.slice(5).replace('-', '/')} ${'일월화수목금토'[new Date(`${date}T12:00:00Z`).getUTCDay()]}`
const getDay = (row: Row, date: string) => row.review.days.find(day => day.date === date)
const dayValue = (row: Row, date: string, field: 'minutes' | 'start') => {
  const day = getDay(row, date)
  return !day || (field === 'start' && day.attendance !== 'present') ? null : day[field]
}
const subjects = (row: Row) => {
  const view = row.review.metrics.find(metric => metric.type === 'SUBJECT_SHARE')?.view
  return view?.kind === 'share' ? view.subjects : []
}
const paired = (days: WeekDay[]) => days.filter(day => day.attendance === 'present' && day.planned !== null && day.planned > 0 && day.actual !== null)
function totals(days: WeekDay[]) {
  const known = paired(days)
  return { plan: known.reduce((sum, day) => sum + day.planned!, 0), actual: known.reduce((sum, day) => sum + day.actual!, 0), count: known.length }
}

function SeriesPlot({rows,field,focus,onSelect}:{rows:Row[];dates:string[];field:'minutes'|'start';focus:string|null;onSelect:(id:string|null)=>void}){
 return <BranchDistribution students={rows.map(row=>({id:row.student.studentId,name:row.student.studentName,days:row.review.days.map(day=>({date:day.date,minutes:day.minutes,attendance:day.attendance,start:day.attendance==='present'?day.start:null}))}))} field={field} selectedId={focus} onSelect={onSelect}/>
}

export function BranchWeekDashboard({ branchId, version, onOpenStudent, onMissingBranch, api=studentCareApi }: Props) {

  const design = useCareDesign()
  const [focus, setFocus] = useState<string | null>(null)
  const remote = useRemote(design>=5?null:`branch-week/${branchId}`, () => loadCareRoster(api,branchId), version)
  if(design>=5)return <BranchOverviewDashboard api={api} branchId={branchId} version={version} onOpenStudent={onOpenStudent} onMissingBranch={onMissingBranch}/>
  if (loadFailure(remote)) return <div className="bwk-state" role="alert">학습관 기록을 불러오지 못했습니다. <button type="button" onClick={remote.reload}>다시 시도</button></div>
  if (!remote.data) return <p className="bwk-state" role="status">전체 학생의 7일 기록을 불러오는 중</p>
  const { board } = remote.data
  const rows: Row[] = remote.data.rows.map(row => ({ ...row, attention: row.priority < 2 }))
    .sort((a, b) => Number(b.attention) - Number(a.attention) || a.student.studentName.localeCompare(b.student.studentName, 'ko'))
  if (!rows.length) return <p className="bwk-state">등록된 학생이 없습니다.</p>
  const dates = rows[0].review.days.map(day => day.date)
  const rowClass = (row: Row) => `${row.attention ? 'bwk-attention ' : ''}${focus === row.student.studentId ? 'bwk-selected' : ''}`
  const name = (row: Row) => <button type="button" className="bwk-name" onClick={() => onOpenStudent(row.student.studentId)}>{row.student.studentName}{row.attention && <small>{row.priority===0 ? '경과 확인' : '상담 필요'}</small>}</button>
  const dateHeaders = dates.map(date => <th key={date} scope="col">{dateLabel(date)}</th>)
  const branchDaily = dates.map(date => mean(rows.map(row => dayValue(row, date, 'minutes'))))
  const branchExecution = totals(rows.flatMap(row => row.review.days))
  const subjectNames = [...new Set(rows.flatMap(row => subjects(row).map(subject => subject.name)))]
  function statusPanel(field: 'attendance' | 'submission', title: string) {
    const labels = field === 'attendance' ? { present: '입실', absent: '입실 기록 없음', unknown: '기록 없음', excluded: '입실 기록 없음' } : { submitted: '제출', missing: '미제출', unknown: '기록 없음', excluded: '입실 기록 없음' }
    return <section className="bwk-panel"><h3>{title}</h3><div className="bwk-table-scroll"><table className="bwk-table bwk-status-table"><thead><tr><th scope="col">학생</th>{dateHeaders}<th scope="col">7일 기록</th></tr></thead><tbody>
      {rows.map(row => <tr className={rowClass(row)} key={row.student.studentId}><th scope="row">{name(row)}</th>{dates.map(date => {
        const state = getDay(row, date)?.[field] ?? 'unknown'
        const label = field==='attendance'&&state==='unknown'?missingRecordLabel(getDay(row,date),'start'):labels[state as keyof typeof labels] ?? '기록 없음'
        return <td key={date}><span className={`bwk-status bwk-status-${state}`}>{label}</span></td>
      })}<td>{row.review.days.filter(day => field === 'attendance' ? day.attendance === 'present' : day.submission === 'submitted').length} / {row.review.days.filter(day => !['unknown', 'excluded'].includes(day[field])).length}일</td></tr>)}
      <tr className="bwk-average"><th scope="row">학습관 기록률</th>{dates.map(date => {
        const states = rows.map(row => getDay(row, date)?.[field]).filter(state => state && !['unknown', 'excluded'].includes(state))
        const count = states.filter(state => state === (field === 'attendance' ? 'present' : 'submitted')).length
        return <td key={date}>{states.length ? `${Math.round(count / states.length * 100)}%` : '—'}<small>{count}/{states.length}명</small></td>
      })}<td>분모: 확인 가능한 상태</td></tr>
    </tbody></table></div><p className="bwk-note">입실 비율은 입실 또는 일정상 미입실이 확인된 날 기준. 제출 비율은 제출 여부가 확인된 날 기준. 원본 누락은 제외.</p></section>
  }
  return <section className={`bwk-dashboard bwk-design-${design}`} aria-label="학습관 최근 7일 전체 학생 지표" aria-busy={remote.status === 'loading'}>
    <header className="bwk-header"><div><h2>{board.branch.name} · 전체 학생 {rows.length}명</h2><p>{dateLabel(dates[0])} – {dateLabel(dates[6])} · 최근 7일 고정</p></div></header>
    <section className="bwk-panel bwk-wide"><h3>학습 시간 <small>단위: 분</small></h3><SeriesPlot rows={rows} dates={dates} field="minutes" focus={focus} onSelect={setFocus} />
      <details className="bwk-record-details"><summary>학생별 날짜 기록</summary><div className="bwk-table-scroll"><table className="bwk-table"><thead><tr><th scope="col">학생 / 상세</th>{dateHeaders}<th scope="col">기록일 평균</th><th scope="col">입실일 평균</th><th scope="col">최근 합계 / 평소 주평균</th></tr></thead><tbody>
        {rows.map(row => <tr className={rowClass(row)} key={row.student.studentId}><th scope="row">{name(row)}</th>{dates.map(date => <td key={date}>{number(dayValue(row, date, 'minutes'))}</td>)}<td>{number(mean(row.review.days.map(day => day.minutes)))}<small>{row.review.days.filter(day => day.minutes !== null).length}/7일</small></td><td>{number(mean(row.review.days.filter(day => day.attendance === 'present').map(day => day.minutes)))}</td><td>{row.review.days.some(day => day.minutes !== null) ? number(row.review.days.reduce((sum, day) => sum + (day.minutes ?? 0), 0)) : '—'} / {number(row.review.metrics.find(metric => metric.type === 'STUDY_DROP')?.before ?? null)}<small>비교 {row.review.baselineFrom.slice(5)}–{row.review.baselineTo.slice(5)}</small></td></tr>)}
        <tr className="bwk-average"><th scope="row">학습관 일평균</th>{branchDaily.map((value, index) => <td key={dates[index]}>{number(value)}<small>{rows.filter(row => dayValue(row, dates[index], 'minutes') !== null).length}명 기록</small></td>)}<td>{number(mean(branchDaily))}<small>일평균의 평균</small></td><td colSpan={2}>기록된 0분 포함 · 누락 제외</td></tr>
      </tbody></table></div></details><p className="bwk-note">평균: 기록일 기준, 0분 포함·미기록 제외. 평소: 직전 28일 합계 ÷ 4, 기록 불완전 시 —.</p>
    </section>
    {statusPanel('attendance', '입실 기록')}{statusPanel('submission', '계획 제출 기록')}
    <section className="bwk-panel bwk-wide"><h3>입실 시각 <small>HH:mm · 입실한 날짜만</small></h3><SeriesPlot rows={rows} dates={dates} field="start" focus={focus} onSelect={setFocus} /><details className="bwk-record-details"><summary>학생별 날짜 기록</summary><div className="bwk-table-scroll"><table className="bwk-table"><thead><tr><th scope="col">학생</th>{dateHeaders}<th scope="col">입실일 평균</th><th scope="col">평소 입실 평균</th></tr></thead><tbody>{rows.map(row => <tr className={rowClass(row)} key={row.student.studentId}><th scope="row">{name(row)}</th>{dates.map(date => <td key={date}>{clock(dayValue(row, date, 'start'))}</td>)}<td>{clock(mean(row.review.days.filter(day => day.attendance === 'present').map(day => day.start)))}</td><td>{clock(row.review.metrics.find(metric => metric.type === 'START_TIME_SHIFT')?.before ?? null)}</td></tr>)}<tr className="bwk-average"><th scope="row">학습관 일평균</th>{dates.map(date => <td key={date}>{clock(mean(rows.map(row => dayValue(row, date, 'start'))))}</td>)}<td colSpan={2}>입실 시각이 기록된 학생만</td></tr></tbody></table></div></details></section>
    <section className="bwk-panel"><h3>계획과 실제 학습 <small>최근 7일 · 분</small></h3><p className="bwk-note">계획·실제 모두 기록된 날만 합산. 달성률 = 실제 ÷ 계획 (100% 초과 가능).</p><div className="bwk-pair-key"><span>계획</span><span>실제</span></div><div className="bwk-table-scroll"><table className="bwk-table"><thead><tr><th scope="col">학생</th><th scope="col">계획 / 실제 (분)</th><th scope="col">달성률</th><th scope="col">비교 가능일</th></tr></thead><tbody>{[...rows, null].map(row => {
      const total = row ? totals(row.review.days) : branchExecution
      const maximum = Math.max(1, ...rows.flatMap(item => { const value = totals(item.review.days); return [value.plan, value.actual] }))
      return <tr key={row?.student.studentId ?? 'branch'} className={row ? rowClass(row) : 'bwk-average'}><th scope="row">{row ? name(row) : '학습관 학생 평균'}</th><td><div className="bwk-pair-bars"><i style={{ width: `${total.plan / (row ? 1 : rows.length) / maximum * 100}%` }} /><i style={{ width: `${total.actual / (row ? 1 : rows.length) / maximum * 100}%` }} /></div>{total.count ? `${number(total.plan / (row ? 1 : rows.length))} / ${number(total.actual / (row ? 1 : rows.length))}` : '—'}</td><td>{total.plan > 0 ? `${number(total.actual / total.plan * 100)}%` : '—'}</td><td>{total.count}/{7 * (row ? 1 : rows.length)}일</td></tr>
    })}</tbody></table></div><p className="bwk-note">학습관 평균: 합계 ÷ 전체 학생 수. 달성률: 전체 실제 ÷ 전체 계획.</p></section>
    <section className="bwk-panel"><h3>과목별 계획·실제 비중 <small>최근 7일 · %</small></h3><p className="bwk-note">학습관 비중: 기록 있는 학생 비중의 평균. 차이는 %p.</p><div className="bwk-pair-key"><span>계획 비중</span><span>실제 비중</span></div>
      <div className="bwk-subject-branch">{subjectNames.map(subjectName => {
        const values = rows.flatMap(row => subjects(row).filter(subject => subject.name === subjectName))
        const plan = mean(values.map(value => value.plan)), actual = mean(values.map(value => value.actual))
        return <div key={subjectName}><strong>{subjectName}</strong><div className="bwk-pair-bars"><i style={{ width: `${plan ?? 0}%` }} /><i style={{ width: `${actual ?? 0}%` }} /></div><span>{number(plan)} / {number(actual)}% <small>기록 {values.length}명</small></span></div>
      })}</div><details className="bwk-record-details"><summary>학생별 과목 기록</summary><div className="bwk-table-scroll"><table className="bwk-table"><thead><tr><th scope="col">학생</th>{subjectNames.map(subject => <th key={subject} scope="col">{subject}<small>계획 / 실제 · 차이</small></th>)}</tr></thead><tbody>{rows.map(row => <tr className={rowClass(row)} key={row.student.studentId}><th scope="row">{name(row)}</th>{subjectNames.map(subjectName => {
        const value = subjects(row).find(subject => subject.name === subjectName)
        return <td key={subjectName}>{value ? <>{number(value.plan)} / {number(value.actual)}%<small>{value.actual - value.plan > 0 ? '+' : ''}{number(value.actual - value.plan)}%p</small></> : '—'}</td>
      })}</tr>)}</tbody></table></div></details>
    </section>
  </section>
}
