import type { CareSnapshotMetric, DailyCareRecord } from '../../model/careSnapshot.ts'
import { formatMetricValue } from '../../model/metricComparison.ts'
import { shortDate } from '../../model/format.ts'

/** 날짜 간 간격은 같게 유지한다. 기록 없음은 0으로 그리지 않는다. */
export function DailyMetricChart({metric, days,readable=false,bounds,onDay}: {metric:CareSnapshotMetric; days:DailyCareRecord[];readable?:boolean;bounds?:{min:number;max:number};onDay?:(day:DailyCareRecord)=>void}) {
 const clock=metric.view.kind==='line'
 const paired=metric.view.kind==='planActual'
 const values=days.flatMap(day=>clock?(day.attendance==='present'&&day.start!==null?[day.start]:[]):[day.minutes??0,...(paired&&day.planned!==null?[day.planned]:[])])
 const usual=clock?(metric.before??values[0]??0):0
 const minimum=bounds?.min??(clock?Math.max(0,Math.floor(Math.min(usual,...values)/60)*60-30):0)
 const maximum=bounds?.max??(clock?Math.min(1440,Math.ceil(Math.max(usual,...values)/60)*60+30):Math.max(60,Math.ceil(Math.max(0,...values)/60)*60))
 const y=(value:number)=>160-(value-minimum)/(maximum-minimum)*132
 const width=readable&&days.length<=7?640:1000, step=(width-80)/days.length
 return <figure className="sc-daily-metric-chart" aria-label={clock?'날짜별 입실 시각':paired?'날짜별 계획과 실제 학습 시간':'날짜별 학습 시간'}>
  <figcaption>{clock?<><span className="sc-chart-dot-key"/>입실 시각 {metric.before!==null&&<span>┄ {metric.beforeLabel} 평균 {formatMetricValue(usual,'clock')}</span>}</>:<><span className="sc-chart-bar-key"/>{paired?'실제':'학습 시간'}{paired&&<><span className="sc-chart-target-key"/>계획</>}</>}</figcaption>
  <svg viewBox={`0 0 ${width} 205`} role="img" aria-label={`${shortDate(days[0].date)}부터 ${shortDate(days.at(-1)!.date)}까지 ${metric.label}`}>
   {[minimum,(maximum+minimum)/2,maximum].map(value=><g key={value}><line x1="68" x2={width-12} y1={y(value)} y2={y(value)} className="sc-chart-grid"/><text x="58" y={y(value)+4} textAnchor="end">{clock?formatMetricValue(value,'clock'):`${Math.round(value/60*10)/10}시간`}</text></g>)}
   {clock&&metric.before!==null&&<line x1="68" x2={width-12} y1={y(usual)} y2={y(usual)} className="sc-chart-baseline"/>}
   {days.map((day,index)=>{
    const x=68+step*(index+.5), value=clock?(day.attendance==='present'?day.start:null):day.minutes
    const detail=`${shortDate(day.date)} · ${clock?'입실': '실제'} ${formatMetricValue(value,clock?'clock':'minutes')}${paired?` · 계획 ${formatMetricValue(day.planned,'minutes')}`:''}`
    return <g key={day.date} className="sc-daily-chart-point" role={onDay?'button':undefined} tabIndex={onDay?0:undefined} aria-label={onDay?`${detail} 기록 보기`:undefined} onClick={onDay?()=>onDay(day):undefined} onKeyDown={onDay?event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onDay(day)}}:undefined}><title>{detail}</title>
     {value===null?<text x={x} y="155" textAnchor="middle">—</text>:clock?<circle cx={x} cy={y(value)} r="4.5" className="sc-chart-actual"/>:<rect x={x-step*.27} y={y(value)} width={step*.54} height={160-y(value)} rx="2" className="sc-chart-actual"/>}
     {paired&&day.planned!==null&&<line x1={x-step*.36} x2={x+step*.36} y1={y(day.planned)} y2={y(day.planned)} className="sc-chart-target"/>}
     {!clock&&value===0&&<text x={x} y="155" textAnchor="middle">0</text>}
     {(readable||days.length<=14||index%2===0||index===days.length-1)&&<text x={x} y="183" textAnchor="middle">{shortDate(day.date)}</text>}
    </g>
   })}
  </svg>
  <p className="sc-chart-footnote">{clock?'미입실·제외일은 점을 표시하지 않습니다.':'— 기록 없음·제외'} · 날짜별 수치는 아래 기록표에서 확인</p>
 </figure>
}
