import { useEffect, useRef, useState } from 'react'
import { studentCareApi } from '../../api/studentCareApi.ts'
import { attendanceLabel, buildCareSnapshot, submissionLabel, recentRecordAvailability, type CareSnapshot, type CareSnapshotMetric, type DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricDelta, formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate, followUpLabel } from '../../model/format.ts'
import { loadFailure, useRemote } from '../../model/useRemote.ts'
import type { StudentCareDetail } from '../../model/types.ts'
import { MetricDailyDialog } from '../designs/MetricDailyDialog.tsx'
import { SettingsDialog } from '../SettingsDialog.tsx'
import { MetricVisual, StateTimeline } from './MetricVisual.tsx'
import { mark } from './stateMark.ts'
import { MetricInspector } from './MetricInspector.tsx'
import { selectedPeriodSnapshot, type CarePeriod } from '../../model/selectedPeriod.ts'
import '../designs/TrendsDesign.css'
import './proposals.css'

type Row={detail:StudentCareDetail;snapshot:CareSnapshot;rank:number;status:string}
const names=['기간 비교','지표별 현황','학습관 전체']
const metricOrder=['CONSECUTIVE_ABSENCE','STUDY_DROP','START_TIME_SHIFT','EXECUTION_GAP','SUBJECT_SHARE','PLAN_MISSING']

function DayDialog({day,onClose}:{day:DailyCareRecord;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{ref.current?.showModal()},[])
 return <dialog className="sc-metric-dialog cp-day-dialog" ref={ref} onClose={onClose} aria-labelledby="cp-day-title"><header className="sc-metric-dialog__head"><h2 id="cp-day-title">{shortDate(day.date)} 학습 기록</h2><button className="sc-button" onClick={()=>ref.current?.close()} autoFocus>닫기</button></header><dl className="cp-day-facts">
  <div><dt>입실</dt><dd>{attendanceLabel(day.attendance)}</dd></div><div><dt>입실 시각</dt><dd>{formatMetricValue(day.attendance==='present'?day.start:null,'clock')}</dd></div><div><dt>계획 제출</dt><dd>{submissionLabel(day.submission)}</dd></div><div><dt>학습 시간</dt><dd>{formatMetricValue(day.minutes,'minutes')}</dd></div><div><dt>계획 시간</dt><dd>{formatMetricValue(day.planned,'minutes')}</dd></div>
 </dl></dialog>
}

function MetricSection({metric,snapshot,onOpen,className=''}:{metric:CareSnapshotMetric;snapshot:CareSnapshot;onOpen:()=>void;className?:string}) {
 const held=snapshot.deferred&&!['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(metric.type)
 return <section className={`cp-metric-section ${className}`}>
  <header><div><h3>{metric.label}</h3><span>요약 · {metric.currentLabel}</span></div><button onClick={onOpen} aria-label={`${metric.label} 상세 보기`} aria-description={held?'학습 기록 부족':`${metric.currentLabel} ${formatMetricValue(metric.current,metric.unit)}. ${metric.beforeLabel} ${formatMetricValue(metric.before,metric.unit)}. ${formatMetricDelta(metric)}`}>확대 ↗</button></header>
  <div className="cp-reading"><strong>{held?'—':<>{metric.view.kind==='share'&&`${metric.view.worst} `}{formatMetricValue(metric.current,metric.unit)}</>}</strong><span className={metric.attention&&!held?'cp-alert':''}>{held?'학습 기록 부족':formatMetricDelta(metric)}</span></div>
  <p className="cp-comparator">{metric.beforeLabel} {held?'—':formatMetricValue(metric.before,metric.unit)}<span>{metric.view.kind==='share'?'과목별 · 최근 7일':`일별 · ${shortDate(snapshot.days[0].date)}–${shortDate(snapshot.asOf)}`}</span></p>
  <MetricVisual metric={metric} snapshot={snapshot}/>
  {metric.type==='START_TIME_SHIFT'&&<p className="cp-legend">┄ 이전 3주 평균 · 점은 입실한 날</p>}
  {metric.type==='EXECUTION_GAP'&&<p className="cp-legend"><i className="cp-plan-key"/>계획 <i className="cp-actual-key"/>실제 · 학습 시간 기준</p>}
 </section>
}

function PeriodOverview({row,onMetric,onDay}:{row:Row;onMetric:(metric:CareSnapshotMetric)=>void;onDay:(day:DailyCareRecord)=>void}) {
 const {snapshot}=row
 const attendance=snapshot.metrics.find(m=>m.type==='CONSECUTIVE_ABSENCE')!,submission=snapshot.metrics.find(m=>m.type==='PLAN_MISSING')!
 return <div className="cp-overview">
  <section className="cp-presence"><header><h3>입실·계획 제출</h3><span>✓ 입실·제출　× 미입실·미제출　· 제외　? 기록 없음</span></header>
   <div className="cp-status-row"><button onClick={()=>onMetric(attendance)}>입실 ↗</button><StateTimeline snapshot={snapshot}/></div>
   <div className="cp-status-row"><button onClick={()=>onMetric(submission)}>계획 ↗</button><StateTimeline snapshot={snapshot} submission/></div>
   <div className="cp-date-hitlist">{snapshot.days.map(day=><button key={day.date} onClick={()=>onDay(day)} aria-label={`${shortDate(day.date)} 기록 보기`}>{shortDate(day.date)}</button>)}</div>
  </section>
  <div className="cp-analytics">{['STUDY_DROP','START_TIME_SHIFT','EXECUTION_GAP','SUBJECT_SHARE'].map(type=>{const metric=snapshot.metrics.find(m=>m.type===type)!;return <MetricSection key={type} metric={metric} snapshot={snapshot} onOpen={()=>onMetric(metric)}/>})}</div>
 </div>
}

function CalendarOverview({row,onDay,onMetric}:{row:Row;onDay:(day:DailyCareRecord)=>void;onMetric:(metric:CareSnapshotMetric)=>void}) {
 const {snapshot}=row,maximum=Math.max(60,...snapshot.days.map(day=>day.minutes??0))
 return <div className="cp-calendar-layout"><section className="cp-calendar-panel"><header><h3>날짜별 학습 기록 <small className="cp-calendar-scale">학습 시간 · 0–{formatMetricValue(maximum,'minutes')}</small></h3><span>✓ 입실·제출　× 미입실·미제출　· 제외　? 기록 없음</span></header>
  <div className="cp-calendar-grid">{snapshot.days.map(day=><button className={`cp-calendar-day${day.attendance==='absent'||day.submission==='missing'?' has-missing':''}`} key={day.date} onClick={()=>onDay(day)} aria-label={`${shortDate(day.date)} ${attendanceLabel(day.attendance)} ${submissionLabel(day.submission)} 기록 보기`}>
   <time dateTime={day.date}>{shortDate(day.date)} <small>{['일','월','화','수','목','금','토'][new Date(day.date+'T00:00:00Z').getUTCDay()]} ↗</small></time>
   <div className="cp-day-volume" aria-hidden="true"><i style={{height:`${(day.minutes??0)/maximum*100}%`}}/></div>
   <strong>{day.minutes===null?'기록 없음':day.minutes===0?'학습 없음':formatMetricValue(day.minutes,'minutes')}</strong><span className="cp-calendar-status"><span className={`is-${day.attendance}`}>입실 {mark(day.attendance)}</span><span className={`is-${day.submission}`}>계획 {mark(day.submission)}</span></span>
  </button>)}</div>
 </section><aside className="cp-calendar-summary"><h3>최근 기록 요약</h3>{snapshot.metrics.map(metric=><button key={metric.type} className="cp-metric-peek" onClick={()=>onMetric(metric)} aria-label={`${metric.label} 상세 보기`} aria-description={`${metric.currentLabel} ${formatMetricValue(metric.current,metric.unit)}. ${metric.beforeLabel} ${formatMetricValue(metric.before,metric.unit)}. ${formatMetricDelta(metric)}`}><span>{metric.label}<small>{metric.currentLabel}</small></span><strong>{snapshot.deferred&&!['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(metric.type)?'—':formatMetricValue(metric.current,metric.unit)}</strong><span aria-hidden="true">↗</span></button>)}<p className="cp-muted">날짜를 누르면 그날의 기록을 볼 수 있습니다.</p></aside></div>
}

function BranchOverview({rows,onMetric,onStudent}:{rows:Row[];onMetric:(row:Row,metric:CareSnapshotMetric)=>void;onStudent:(row:Row)=>void}) {
 const timeValues=rows.flatMap(row=>row.snapshot.days.flatMap(day=>[day.minutes??0,day.planned??0]))
 const clocks=rows.flatMap(row=>row.snapshot.days.flatMap(day=>day.attendance==='present'&&day.start!==null?[day.start]:[]))
 const timeScale={min:0,max:Math.max(60,Math.ceil(Math.max(0,...timeValues)/60)*60)}
 const clockScale={min:Math.max(0,Math.floor(Math.min(1440,...clocks)/60)*60-30),max:Math.min(1440,Math.ceil(Math.max(0,...clocks)/60)*60+30)}

 return <div className="cp-branch-wrap"><table className="cp-branch-table"><caption className="sc-visually-hidden">전체 학생의 학습 현황. 확인일이 지난 학생과 확인할 항목이 있는 학생부터 표시합니다.</caption><thead><tr><th scope="col">학생</th>{metricOrder.map(type=>{const metric=rows[0]?.snapshot.metrics.find(m=>m.type===type);return <th scope="col" key={type}>{metric?.label}<small>{['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(type)?`${shortDate(rows[0].snapshot.days.at(-7)!.date)}–${shortDate(rows[0].snapshot.asOf)}`:metric?.currentLabel}</small></th>})}</tr></thead><tbody>{rows.map(row=><tr key={row.detail.student.studentId}><th scope="row"><button className="cp-student-link" onClick={()=>onStudent(row)} aria-label={`${row.detail.student.studentName} 학생별 보기`}>{row.detail.student.studentName} ↗</button><small className={row.rank<2?'cp-alert':''}>{row.status}{row.detail.activeCase?.recheckDue&&row.detail.activeCase.recheckDate&&<> · {shortDate(row.detail.activeCase.recheckDate)}</>}</small></th>{metricOrder.map(type=>{
  const metric=row.snapshot.metrics.find(m=>m.type===type)!,held=row.snapshot.deferred&&!['CONSECUTIVE_ABSENCE','PLAN_MISSING'].includes(type)
  return <td key={type}><button className={`cp-branch-cell${metric.attention&&!held?' is-flagged':''}`} onClick={()=>onMetric(row,metric)} aria-label={`${row.detail.student.studentName} ${metric.label} 상세 보기`} aria-description={held?'학습 기록 부족':`${metric.currentLabel} ${formatMetricValue(metric.current,metric.unit)}. ${metric.beforeLabel} ${formatMetricValue(metric.before,metric.unit)}. ${formatMetricDelta(metric)}`}><strong>{metric.attention&&!held&&<em className="cp-criterion-mark" title="관리 기준 해당">!</em>}{held?'—':formatMetricValue(metric.current,metric.unit)}<span aria-hidden="true"> ↗</span></strong><MetricVisual metric={metric} snapshot={row.snapshot} mini scale={metric.view.kind==='line'?clockScale:timeScale}/><small>{held?'학습 기록 부족':formatMetricDelta(metric)}</small></button></td>
 })}</tr>)}</tbody></table></div>
}

export function PrototypeWorkspace({proposal}:{proposal:1|2|3}) {
 const branches=useRemote('care-proposal-branches',studentCareApi.branches)
 const [branch,setBranch]=useState<string|null>(null),[selected,setSelected]=useState('stu_002'),[period,setPeriod]=useState(proposal===2?7:14),[weekend,setWeekend]=useState(false),[query,setQuery]=useState(''),[only,setOnly]=useState(false),[version,setVersion]=useState(0),[settings,setSettings]=useState(false)
 const [view,setView]=useState<'students'|'branch'>(proposal===3?'branch':'students')
 const [dateView,setDateView]=useState(false)
 const [detail,setDetail]=useState<{row:Row;metric:CareSnapshotMetric}|null>(null),[day,setDay]=useState<DailyCareRecord|null>(null)
 const branchId=branch??branches.data?.[0]?.branchId??null
 const remote=useRemote(branchId,async()=>{const board=await studentCareApi.board(branchId!);const details=await Promise.all(board.students.map(student=>studentCareApi.detail(branchId!,student.studentId)));return {board,details}},version)
 const data=remote.data
 const rows:Row[]=data?data.details.map(item=>{const originalSnapshot=proposal===2?selectedPeriodSnapshot(item,period as CarePeriod,weekend):buildCareSnapshot(item,period,weekend),snapshot={...originalSnapshot,metrics:originalSnapshot.metrics.map(metric=>metric.type==='START_TIME_SHIFT'?{...metric,label:'평균 입실 시각'}:metric.type==='STUDY_DROP'&&proposal!==2?{...metric,beforeLabel:'이전 3주 주간합계 평균'}:metric)},active=item.activeCase,rank=active?.recheckDue?0:data.board.needsCheck.some(s=>s.studentId===item.student.studentId)?1:active?2:snapshot.deferred?3:4;return {detail:item,snapshot,rank,status:active?.recheckDue?followUpLabel(active.recheckDate!,item.asOf):rank===1?'확인 필요':active?'관리 중':snapshot.deferred?'학습 기록 부족':'확인할 항목 없음'}}).sort((a,b)=>a.rank-b.rank||a.detail.student.studentName.localeCompare(b.detail.student.studentName,'ko')):[]
 const row=rows.find(item=>item.detail.student.studentId===selected)??rows[0]
 const filtered=rows.filter(item=>(!only||item.rank<2)&&`${item.detail.student.studentName} ${item.detail.student.className}`.includes(query.trim()))
 return <div className={`cp-workspace cp-proposal-${proposal}`}>
  <header className="cp-page-head"><div><h1>학생 케어 {proposal+1}<small>{names[proposal-1]}</small></h1><span className="cp-preview">예시 데이터</span></div><div><label>학습관 <select aria-label="학습관" value={branchId??''} onChange={e=>{setBranch(e.target.value);setQuery('');setOnly(false)}}>{branches.data?.map(b=><option key={b.branchId} value={b.branchId}>{b.name}</option>)}</select></label><button className="sc-button" onClick={()=>setSettings(true)} disabled={!branchId}>관리 기준</button></div></header>
  <div className="cp-toolbar"><div role="group" aria-label="보기"><button aria-pressed={view==='students'} onClick={()=>setView('students')}>학생별</button><button aria-pressed={view==='branch'} onClick={()=>setView('branch')}>학습관 전체</button></div><span className="cp-period-caption">{row?`날짜 보기 ${row.snapshot.days[0].date.replaceAll('-','.')}–${row.snapshot.asOf.slice(5).replace('-','.')} (${period}일)`:''}</span><div role="group" aria-label="표시 기간">{(proposal===2?[7,14,28]:[14,28]).map(n=><button key={n} aria-pressed={period===n} onClick={()=>setPeriod(n)}>{n}일</button>)}</div><label><input type="checkbox" checked={weekend} onChange={e=>setWeekend(e.target.checked)}/>주말 제외</label></div>
  {loadFailure(remote)||loadFailure(branches)?<div className="sc-state" role="alert">학생 기록을 불러오지 못했습니다. <button onClick={()=>{remote.reload();branches.reload()}}>다시 시도</button></div>:!data?<p role="status">학생 기록을 불러오는 중</p>:rows.length===0?<p>등록된 학생이 없습니다.</p>:<>
   {view==='students'&&row?<><div className={proposal===2?"cp-master-detail":""}>{proposal===2&&<aside className="cp-directory" aria-label="전체 학생 목록"><h2>전체 학생 <span>{rows.length}</span></h2><input type="search" aria-label="학생 목록 검색" placeholder="이름 또는 반 검색" value={query} onChange={e=>setQuery(e.target.value)}/><label><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/>확인할 학생만</label><ul className="cp-directory-list">{filtered.map(item=><li key={item.detail.student.studentId}><button aria-current={row.detail.student.studentId===item.detail.student.studentId?"true":undefined} onClick={()=>setSelected(item.detail.student.studentId)}><strong>{item.detail.student.studentName}</strong><span>{item.detail.student.className}</span><small className={item.rank<2?"cp-alert":""}>{item.status}</small></button></li>)}</ul>{!filtered.length&&<p>조건에 맞는 학생이 없습니다.</p>}</aside>}<div className="cp-master-main"><header className="cp-student-head">{proposal!==2&&<label>전체 학생 {rows.length}명<select aria-label="학생 선택" value={row.detail.student.studentId} onChange={e=>setSelected(e.target.value)}>{rows.map(item=><option value={item.detail.student.studentId} key={item.detail.student.studentId}>{item.detail.student.studentName} · {item.status}</option>)}</select></label>}<div><h2>{row.detail.student.studentName}</h2><span>{row.detail.student.className}</span>{row.rank<2&&<b className="cp-status-badge" title={row.detail.signals.map(signal=>signal.summary).join(' · ')}>{row.rank===1?row.detail.signals[0]?.label??row.status:row.status}</b>}</div>{proposal===2&&<div className="cp-board-view" role="group" aria-label="학생 기록 보기"><button aria-pressed={!dateView} onClick={()=>setDateView(false)}>주요 지표</button><button aria-pressed={dateView} onClick={()=>setDateView(true)}>날짜별 기록</button></div>}<div className="cp-quick-stats"><span>입실 <b>{recentRecordAvailability(row.snapshot).attendanceDays ? `${row.snapshot.recent.attended}일` : '기록 없음'}</b></span><span>계획 미제출 <b className={row.snapshot.recent.missingPlans?'cp-alert':''}>{recentRecordAvailability(row.snapshot).submissionDays ? `${row.snapshot.recent.missingPlans}일` : '기록 없음'}</b></span><small>최근 7일</small></div></header>
    {proposal===2?<>{dateView?<CalendarOverview row={row} onDay={setDay} onMetric={metric=>setDetail({row,metric})}/>:<MetricInspector key={row.detail.student.studentId} snapshot={row.snapshot} onDay={setDay} onMetric={metric=>setDetail({row,metric})}/>}</>:<PeriodOverview row={row} onDay={setDay} onMetric={metric=>setDetail({row,metric})}/>}
   </div></div></>:<><div className="cp-branch-toolbar"><h2>전체 학생 <span>{filtered.length} / {rows.length}명</span></h2><input type="search" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={e=>setQuery(e.target.value)}/><label><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/>확인할 학생만</label></div><p className="cp-branch-basis">변화 비교: 이전 3주 평균 · 달성률은 이전 14일 · 과목 비율은 계획 대비</p><p className="cp-branch-key">시간 그래프: {shortDate(row.snapshot.days[0].date)}–{shortDate(row.snapshot.asOf)} · ! 관리 기준 해당 · 입실·제출 기호: 최근 7일 · ✓ 입실·제출　× 미입실·미제출　· 제외　? 기록 없음</p>{filtered.length?<BranchOverview rows={filtered} onMetric={(r,metric)=>setDetail({row:r,metric})} onStudent={r=>{setSelected(r.detail.student.studentId);setView('students')}}/>:<p>조건에 맞는 학생이 없습니다.</p>}</>}
  </>}
  {detail&&<div className="cp-detail-context"><MetricDailyDialog key={`${detail.row.detail.student.studentId}-${detail.metric.type}`} metric={{...detail.metric,label:`${detail.row.detail.student.studentName} · ${detail.metric.label}`}} snapshot={detail.row.snapshot} onClose={()=>setDetail(null)}/></div>}
  {day&&<DayDialog day={day} onClose={()=>setDay(null)}/>}
  {branchId&&<SettingsDialog branchId={branchId} open={settings} onClose={()=>setSettings(false)} onSaved={()=>{setVersion(v=>v+1);setSettings(false)}}/>}
 </div>
}
