import {useEffect,useId,useState} from 'react'
import {studentCareApi} from '../../api/studentCareApi.ts'
import type {CareApi} from '../../api/httpStudentCareApi.ts'
import {loadCareRoster,type CareRosterRow} from '../../api/loadCareRoster.ts'
import {buildBranchOverview,metricContributors,type BranchMetricKind,type BranchOverviewMetric,type BranchMetricContributor} from '../../model/branchOverview.ts'
import {useRemote,loadFailure} from '../../model/useRemote.ts'
import {compactMinutes,dateText,displayClock,weekdayText,studentColor} from '../../model/careDisplay.ts'
import {BranchDistributionChart} from './BranchDistributionChart.tsx'
import {BranchStudentMetricDetail} from './BranchStudentMetricDetail.tsx'
import {personalDistribution} from '../../model/personalDistribution.ts'
import {BranchStudentPatterns} from './BranchStudentPatterns.tsx'
import {tooltipPlacement} from '../../model/tooltipPlacement.ts'
import {usePlotWidth} from './usePlotWidth.ts'
import {useTooltipSize} from './useTooltipSize.ts'
import './BranchOverviewDashboard.css'

const kinds:BranchMetricKind[]=['study','arrival','absence','submission']
const titles:Record<BranchMetricKind,string>={study:'학습 시간',arrival:'입실 변화',absence:'결석',submission:'계획 제출률'}
const signed=(v:number,unit:string)=>`${v>0?'+':v<0?'−':''}${Number(Math.abs(v).toFixed(1))}${unit}`
const percent=(part:number,total:number)=>total?part/total*100:null
const rate=(metric:{value:number|null;samples:number})=>metric.value===null?null:percent(metric.samples-metric.value,metric.samples)
function headline(metric:BranchOverviewMetric):string{
 if(metric.value===null)return '—'
 if(metric.kind==='study')return compactMinutes(metric.value/metric.samples)
 if(metric.kind==='arrival')return signed(metric.value,'분')
 if(metric.kind==='submission')return `${Number(rate(metric)!.toFixed(1))}%`
 return `${metric.value}건`
}
function impactText(c:BranchMetricContributor,kind:BranchMetricKind){return signed(c.impact,kind==='study'?'%':kind==='arrival'?'분':'건')}

function MetricChart({metric,rows,excluded,threshold,onInspect,selected=[],onDeselect}:{metric:BranchOverviewMetric;rows:CareRosterRow[];excluded:string[];threshold:number;onInspect:(date:string)=>void;selected?:string[];onDeselect?:(id:string)=>void}){
 const [ref,width]=usePlotWidth(),[hover,setHover]=useState<number|null>(null)
 const tipId=useId(),[tipRef,tipHeight]=useTooltipSize(hover)
 const kind=metric.kind,days=metric.daily
 const values=days.map(d=>kind==='submission'?rate(d):kind==='study'&&d.value!==null?d.value/d.samples:d.value)
 const bases=days.map(d=>kind==='study'&&d.baseline!==null?d.baseline/d.samples:d.baseline)
 const series=kind==='study'?rows.filter(r=>selected.includes(r.student.studentId)&&!excluded.includes(r.student.studentId)).map(row=>({id:row.student.studentId,name:row.student.studentName,values:days.map(d=>{const day=row.review.days.find(v=>v.date===d.date);return day&&day.scheduled!==false&&day.attendance!=='excluded'?day.minutes:null})})):[]
 const observed=[...values,...(kind==='study'?bases:[]),...series.flatMap(s=>s.values)].filter((v):v is number=>v!==null)
 const hours=Math.max(1,Math.max(...observed,0)/60),hourStep=hours<10?1:10**Math.floor(Math.log10(hours))/2
 const bound=kind==='arrival'?Math.max(30,Math.ceil(Math.max(...observed.map(Math.abs),0)/30)*30):kind==='submission'?100:Math.ceil(hours/hourStep)*hourStep*60
 const left=kind==='arrival'?38:30,step=(width-left-10)/7,x=(i:number)=>left+(i+.5)*step
 const y=(v:number)=>kind==='arrival'?76-v/bound*48:124-v/bound*100
 const d=hover===null?undefined:days[hover]
 const contributors=d?metricContributors(rows,kind,excluded,threshold,d.date).filter(c=>Math.abs(c.impact)>.001).slice(0,2):[]
 const target=(i:number)=>({onMouseEnter:()=>setHover(i),onFocus:()=>setHover(i),onBlur:()=>setHover(null),onClick:()=>onInspect(days[i].date),onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onInspect(days[i].date)}},role:'button',tabIndex:0,'aria-label':`${dateText(days[i].date)} ${titles[kind]} 상세`,'aria-describedby':hover===i?tipId:undefined})
 if(kind==='absence')return <div className="bov-absence" aria-label="날짜별 결석">{days.map(day=><button type="button" key={day.date} data-count={day.value??'unknown'} onClick={()=>onInspect(day.date)} title={`등원 예정·출결 확인 ${day.samples}건, 미확인 ${day.missing}건`}><span>{dateText(day.date)}</span><small>{weekdayText(day.date)}</small><b>{day.value===null?'—':day.value}</b><small>결석</small>{day.missing>0&&<em>미확인 {day.missing}</em>}</button>)}</div>
 return <figure className="bov-chart" onMouseLeave={()=>setHover(null)} onKeyDown={e=>{if(e.key==='Escape')setHover(null)}}>
  <div className="bov-key">{kind==='study'?<><span><i/>학습관 평균</span><span><i className="bov-reference"/>평소</span>{series.map(s=><button type="button" key={s.id} onClick={()=>onDeselect?.(s.id)} aria-label={`${s.name} 그래프 비교 해제`}><i style={{background:studentColor(s.id)}}/>{s.name} ×</button>)}</>:kind==='arrival'?<span>+ 늦음 · − 빠름</span>:<span>날짜별 제출률</span>}</div>
  <div className="bov-plot" ref={ref}><svg viewBox={`0 0 ${width} 170`} role="group" aria-label={`${titles[kind]} 날짜별 그래프`}>
   {(kind==='arrival'?[-bound,0,bound]:[0,bound]).map(v=><g className="bov-grid" key={v}><line x1={left} x2={width-10} y1={y(v)} y2={y(v)}/><text x={left-5} y={y(v)+4} textAnchor="end">{kind==='study'?`${Number((v/60).toFixed(1))}h`:kind==='submission'?`${v}%`:`${v>0?'+':''}${v}`}</text></g>)}
   {kind==='study'&&[{id:'usual',values:bases},{id:'mean',values},...series].map(s=><g key={s.id} className={s.id==='usual'?'bov-usual-line':s.id==='mean'?'bov-mean-line':'bov-selected-line'} style={{color:s.id==='mean'?'var(--color-accent)':s.id==='usual'?'var(--color-text-secondary)':studentColor(s.id)}}>{s.values.map((v,i)=>v===null?null:<g key={i}>{i>0&&s.values[i-1]!==null&&<line x1={x(i-1)} x2={x(i)} y1={y(s.values[i-1]!)} y2={y(v)}/>}<circle cx={x(i)} cy={y(v)} r={s.id==='usual'?3:4}/></g>)}</g>)}
   {kind==='arrival'&&values.map((v,i)=>v===null?null:<rect className={v>0?'bov-later-bar':'bov-earlier-bar'} key={days[i].date} x={x(i)-step*.22} y={Math.min(y(v),76)} width={step*.44} height={Math.max(1,Math.abs(y(v)-76))}/>)}
   {kind==='submission'&&values.map((v,i)=>v===null?null:<g key={days[i].date}>{i>0&&values[i-1]!==null&&<line className="bov-rate-line" x1={x(i-1)} x2={x(i)} y1={y(values[i-1]!)} y2={y(v)}/>}<circle className="bov-rate-dot" cx={x(i)} cy={y(v)} r="4.5"/></g>)}
   {days.map((day,i)=><g className="bov-date" key={day.date} {...target(i)}><rect x={x(i)-step/2} y="10" width={step} height="155" fill="transparent"/><text x={x(i)} y="145" textAnchor="middle">{dateText(day.date)}</text><text className="bov-weekday" x={x(i)} y="161" textAnchor="middle">{weekdayText(day.date)}</text>{values[i]===null&&<text x={x(i)} y="105" textAnchor="middle">—</text>}</g>)}
  </svg>{d&&hover!==null&&<div ref={tipRef} role="tooltip" id={tipId} className={`bov-tooltip ${kind==='study'?'bov-study-tooltip':''}`} style={{width:Math.min(230,width-40),...tooltipPlacement({width,boxWidth:Math.min(230,width-40),boxHeight:tipHeight,left,bottom:124,anchor:{x:x(hover),y:values[hover]===null?80:y(values[hover]!)},series:[values,...(kind==='study'?[bases,...series.map(s=>s.values)]:[])].map(vs=>vs.map((v,i)=>v===null?null:{x:x(i),y:y(v)}))})}}>
   <b>{dateText(d.date)} ({weekdayText(d.date)})</b><div><span>{kind==='study'?'학습관 평균':kind==='arrival'?'평소 대비':'제출률'}</span><strong>{d.value===null?'—':kind==='study'?compactMinutes(d.value/d.samples):kind==='arrival'?signed(d.value,'분'):`${rate(d)!.toFixed(1)}%`}</strong></div>
   {kind==='study'&&<><div><span>평소</span><strong>{compactMinutes(d.baseline===null?null:d.baseline/d.samples)}</strong></div><div className="bov-tooltip-students">{series.map(s=><div key={s.id}><span style={{color:studentColor(s.id)}}>{s.name}</span><strong>{s.values[hover]===null?'—':`${Math.floor(s.values[hover]!/60)}h ${Math.round(s.values[hover]!)%60}m`}</strong></div>)}</div></>}
   {kind!=='study'&&<div><span>비교 기록</span><strong>{d.samples}건{d.missing?` · 미확인 ${d.missing}`:''}</strong></div>}
   {kind!=='study'&&contributors.map(c=><div key={c.studentId}><span>{c.studentName}</span><strong>{impactText(c,kind)}</strong></div>)}
  </div>}</div>
 </figure>
}

function StudentImpact({rows,kind,date,excluded,threshold,changeThreshold,onlyChanges,toggle,onOpenStudent}:{rows:CareRosterRow[];kind:BranchMetricKind;date:string|null;excluded:string[];threshold:number;changeThreshold:number;onlyChanges:boolean;toggle:(id:string)=>void;onOpenStudent:(id:string)=>void}){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0)
 const all:(BranchMetricContributor&{changeDays?:number})[]=kind==='study'||kind==='arrival'?(()=>{
  const grouped=new Map<string,{studentId:string;studentName:string;actual:number;usual:number;delta:number;samples:number;changeDays:number}>()
  for(const d of personalDistribution(rows,kind,excluded,kind==='study'?undefined:threshold).filter(d=>date===null||d.date===date))for(const p of d.points){
   const value=grouped.get(p.id)??{studentId:p.id,studentName:p.name,actual:0,usual:0,delta:0,samples:0,changeDays:0}
   value.actual+=p.actual;value.usual+=p.usual;value.delta+=p.value;value.samples++;if(kind==='study'?p.value<=-changeThreshold:p.value>=changeThreshold)value.changeDays++;grouped.set(p.id,value)
  }
  return [...grouped.values()].map(v=>({...v,current:v.actual/v.samples,baseline:v.usual/v.samples,delta:v.delta/v.samples,impact:v.delta/v.samples})).sort((a,b)=>b.changeDays-a.changeDays||Number(kind==='study'?b.delta<0:b.delta>0)-Number(kind==='study'?a.delta<0:a.delta>0)||Math.abs(b.delta)-Math.abs(a.delta))
 })():metricContributors(rows,kind,excluded,threshold,date??undefined)
 const filtered=all.filter(c=>c.studentName.includes(query)&&(!onlyChanges||(c.changeDays??0)>0)&&(kind==='study'||kind==='arrival'||c.delta>0))
 const shown=filtered.slice(page*8,page*8+8),max=Math.max(...all.map(c=>Math.abs(c.impact)),1)
 return <><div className="bov-impact-tools"><span>{date?`${dateText(date)} (${weekdayText(date)})`:'최근 7일'} · {filtered.length}명</span><input aria-label="학생별 기록 검색" placeholder="학생 검색" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/></div>
  <div className="bov-impact-scroll"><table className="bov-impact-table"><thead><tr><th>학생</th><th>{kind==='study'||kind==='arrival'?'평소 / 최근':'해당 기록'}</th><th>{kind==='study'?'평소 대비 변화':kind==='arrival'?'평소 대비 변화':'건수'}</th><th>비교</th></tr></thead><tbody>{shown.map(c=><tr key={c.studentId}>
   <th><button type="button" className="bov-student-link" onClick={()=>onOpenStudent(c.studentId)} aria-label={`${c.studentName} 학생 상세`}>{c.studentName}</button>{!!c.changeDays&&<small className="bov-repeat">{c.changeDays}일 {kind==='study'?'감소':'지연'}</small>}</th>
   <td>{kind==='study'?`${compactMinutes(c.baseline)} / ${compactMinutes(c.current)}`:kind==='arrival'?`${displayClock(c.baseline)} / ${displayClock(c.current)}`:`${c.current}건`}</td>
   <td><span className="bov-impact-value">{impactText(c,kind)}</span>{(kind==='study'||kind==='arrival')&&<span className="bov-impact-track"><i data-negative={c.impact<0} style={{width:`${Math.abs(c.impact)/max*50}%`}}/></span>}</td>
   <td><button type="button" onClick={()=>toggle(c.studentId)} aria-label={`${c.studentName} 집계에서 제외`}>제외</button></td>
  </tr>)}</tbody></table></div>{!shown.length&&<p className="bov-empty">해당 기록이 없습니다.</p>}
  {filtered.length>8&&<div className="bov-pages"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} / {Math.ceil(filtered.length/8)}</span><button type="button" disabled={(page+1)*8>=filtered.length} onClick={()=>setPage(p=>p+1)}>다음</button></div>}
 </>
}

export function BranchOverviewDashboard({api=studentCareApi,branchId,version,onMissingBranch}:{api?:CareApi;branchId:string;version:number;onOpenStudent:(id:string)=>void;onMissingBranch?:()=>void}){
 const [excluded,setExcluded]=useState<string[]>([]),[filterOpen,setFilterOpen]=useState(false),[query,setQuery]=useState('')
 const [onlyChanges,setOnlyChanges]=useState(false)
 const [active,setActive]=useState<BranchMetricKind|null>(null),[date,setDate]=useState<string|null>(null)
 const [focus,setFocus]=useState<Partial<Record<BranchMetricKind,{id:string;origin:'chart'|'list'|'absence'|'contributors'}>>>({})
 const [absenceDate,setAbsenceDate]=useState<string|null>(null),[selected,setSelected]=useState<string[]>([])
 const remote=useRemote(`branch-overview/${branchId}`,async()=>{const [roster,settings]=await Promise.all([loadCareRoster(api,branchId),api.settings(branchId)]);return {...roster,settings}},version)
 const missingBranch=remote.status==='error'&&remote.error.code==='BRANCH_NOT_FOUND'
 useEffect(()=>{if(missingBranch)onMissingBranch?.()},[missingBranch,onMissingBranch])
 if(loadFailure(remote))return <p role="alert">학습관 지표를 불러오지 못했습니다. <button onClick={remote.reload}>다시 시도</button></p>
 if(!remote.data)return <p role="status">학습관 지표 불러오는 중</p>
 const {rows,board,settings}=remote.data
 if(!rows.length)return <p>등록된 학생이 없습니다.</p>
 const overview=buildBranchOverview(rows,excluded,settings.startShiftMinutes),whole=buildBranchOverview(rows,[],settings.startShiftMinutes)
 const toggle=(id:string)=>{setExcluded(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id]);setSelected(ids=>ids.filter(v=>v!==id))}
 const openStudent=(kind:BranchMetricKind,id:string,origin:'chart'|'list'|'absence'|'contributors')=>{setFocus(v=>({...v,[kind]:{id,origin}}));if(kind==='study'||kind==='arrival')setSelected(ids=>ids.includes(id)||ids.length>=6?ids:[...ids,id])}
 const closeStudent=(kind:BranchMetricKind)=>setFocus(v=>({...v,[kind]:undefined}))
 const detail=(kind:BranchMetricKind,origin:string)=>{const item=focus[kind],row=rows.find(r=>r.student.studentId===item?.id);return item?.origin===origin&&row?<BranchStudentMetricDetail row={row} kind={kind} onClose={()=>closeStudent(kind)}/>:null}
 const studyAverage=(omitted:string[])=>{const values=rows.filter(r=>!omitted.includes(r.student.studentId)).flatMap(r=>r.review.days.filter(d=>d.attendance==='present'&&d.minutes!==null).map(d=>d.minutes!));return values.length?values.reduce((n,v)=>n+v,0)/values.length:null}
 const averageStudy=studyAverage(excluded)
 const arrivalSummary=(omitted:string[])=>{const days=personalDistribution(rows,'arrival',omitted,settings.startShiftMinutes);return days.some(d=>d.points.length)?new Set(days.flatMap(d=>d.changed.map(p=>p.id))).size:null}
 const arrivalChanges=arrivalSummary(excluded)
 const inspect=(kind:BranchMetricKind,selectedDate:string|null)=>{setOnlyChanges(false);setActive(kind);setDate(selectedDate)}
 return <section className="bov-dashboard" aria-label="학습관 전체 지표">
  <header className="bov-heading"><div><h2>{board.branch.name}</h2><p>{dateText(overview.dates[0])}–{dateText(overview.dates.at(-1)!)} · 최근 7일 <span>평소 {dateText(rows[0].review.baselineFrom)}–{dateText(rows[0].review.baselineTo)}</span></p></div><div className="bov-population"><b>{overview.excludedCount?`${overview.includedCount}명 선택 / `:''}전체 {overview.totalCount}명</b><button type="button" aria-expanded={filterOpen} onClick={()=>setFilterOpen(v=>!v)}>학생 포함·제외</button></div></header>
  {excluded.length>0&&<div className="bov-exclusions" role="status"><b>제외한 학생</b>{rows.filter(r=>excluded.includes(r.student.studentId)).map(r=><button type="button" key={r.student.studentId} aria-label={`${r.student.studentName} 집계에 복원`} onClick={()=>toggle(r.student.studentId)}>{r.student.studentName} ×</button>)}<button type="button" onClick={()=>setExcluded([])}>전체 복원</button></div>}
  {filterOpen&&<section className="bov-filter" aria-label="집계 학생 선택"><input aria-label="집계 학생 검색" placeholder="학생 검색" value={query} onChange={e=>setQuery(e.target.value)}/><div>{rows.filter(r=>r.student.studentName.includes(query)).map(r=><label key={r.student.studentId}><input type="checkbox" checked={!excluded.includes(r.student.studentId)} onChange={()=>toggle(r.student.studentId)}/>{r.student.studentName}</label>)}</div></section>}
  <div className="bov-cards">{kinds.map(kind=>{const metric=overview.metrics[kind],original=whole.metrics[kind];return <section className="bov-card" key={kind} data-metric={kind} data-active={active===kind}>
   <button type="button" className="bov-card-title" aria-label={`${titles[kind]} 학생별 기록 펼치기`} aria-expanded={active===kind} onClick={()=>active===kind&&date===null?setActive(null):inspect(kind,null)}><h3>{titles[kind]}</h3><span aria-hidden="true">{active===kind?'⌄':'›'}</span></button>
   <div className="bov-summary"><strong data-average={kind==='study'?averageStudy??'unknown':undefined} data-value={metric.value??'unknown'} data-baseline={metric.baseline??'unknown'}>{kind==='study'?compactMinutes(averageStudy):kind==='arrival'?arrivalChanges===null?'—':`${arrivalChanges}명`:headline(metric)}</strong><span>{kind==='study'?`입실일 평균`:kind==='arrival'?arrivalChanges===null?'비교 기록 없음':`입실 지연 학생`:kind==='absence'?`${metric.contributors.filter(c=>c.current!>0).length}명 결석`:`미제출 ${metric.value??'—'}건 · ${metric.contributors.filter(c=>c.current!>0).length}명`}</span></div>
   {excluded.length>0&&<div className="bov-whole">전체 {kind==='study'?compactMinutes(studyAverage([])):kind==='arrival'?arrivalSummary([])===null?'—':`${arrivalSummary([])}명`:headline(original)} · 선택 {kind==='study'?compactMinutes(averageStudy):kind==='arrival'?arrivalChanges===null?'—':`${arrivalChanges}명`:headline(metric)}</div>}
   {kind==='study'||kind==='arrival'?<BranchDistributionChart rows={rows} kind={kind} excluded={excluded} selected={selected} threshold={kind==='study'?settings.studyDropPercent:settings.startShiftMinutes} onDeselect={id=>setSelected(ids=>ids.filter(v=>v!==id))} onStudent={id=>openStudent(kind,id,'chart')} onDate={day=>inspect(kind,day)} onAll={()=>{setOnlyChanges(true);setActive(kind);setDate(null)}}/>:<MetricChart metric={metric} rows={rows} excluded={excluded} threshold={settings.startShiftMinutes} onInspect={day=>kind==='absence'?setAbsenceDate(v=>v===day?null:day):inspect(kind,day)}/>}
   {detail(kind,'chart')}
   {kind==='absence'&&absenceDate&&<section className="bov-absence-students" aria-label="날짜별 결석 학생"><b>{dateText(absenceDate)} ({weekdayText(absenceDate)}) 결석</b><div>{rows.filter(r=>!excluded.includes(r.student.studentId)&&r.review.days.some(d=>d.date===absenceDate&&d.scheduled===true&&d.attendance==='absent')).map(r=><button type="button" className="bov-student-link" key={r.student.studentId} onClick={()=>openStudent(kind,r.student.studentId,'absence')}>{r.student.studentName}</button>)}</div>{!rows.some(r=>!excluded.includes(r.student.studentId)&&r.review.days.some(d=>d.date===absenceDate&&d.scheduled===true&&d.attendance==='absent'))&&<p>결석한 학생이 없습니다.</p>}</section>}
   {detail(kind,'absence')}
  {active===kind&&<section className="bov-detail" aria-label={`${titles[kind]} 학생별 기록`}><header><h3>{titles[kind]} · 학생별 기록</h3><div>{excluded.length>0&&<button type="button" onClick={()=>setExcluded([])}>제외 {excluded.length}명 복원</button>}{onlyChanges&&<button type="button" onClick={()=>setOnlyChanges(false)}>전체 학생</button>}{date&&<button type="button" onClick={()=>setDate(null)}>7일 전체</button>}<button type="button" onClick={()=>setActive(null)}>접기</button></div></header>
   <StudentImpact key={`${branchId}/${kind}/${date??'week'}/${excluded.join(',')}`} rows={rows} kind={kind} date={date} excluded={excluded} threshold={settings.startShiftMinutes} changeThreshold={kind==='study'?settings.studyDropPercent:settings.startShiftMinutes} onlyChanges={onlyChanges} toggle={toggle} onOpenStudent={id=>openStudent(kind,id,'contributors')}/>
   {detail(kind,'contributors')}
  </section>}
   <BranchStudentPatterns key={`${branchId}/${kind}`} rows={rows} kind={kind} excluded={excluded} settings={settings} selected={selected} onSelect={id=>setSelected(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id])} onOpenStudent={id=>openStudent(kind,id,'list')} focusedId={focus[kind]?.origin==='list'?focus[kind]?.id:undefined} onCloseFocus={()=>closeStudent(kind)}/>
   {metric.missing>0&&<footer>미확인 기록 {metric.missing}건</footer>}
  </section>})}</div>

 </section>
}
