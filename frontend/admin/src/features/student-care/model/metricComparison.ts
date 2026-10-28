import { addDays, hoursMinutes } from './format.ts'
import type { MetricSeries } from './mockMetrics.ts'
export type ComparisonUnit = 'minutes' | 'count' | 'days' | 'clock' | 'percent'
export interface MetricComparison { type: MetricSeries['type']; before: number | null; current: number | null; unit: ComparisonUnit; beforeLabel: string; currentLabel: string }
const avg = (v: number[]) => v.length ? v.reduce((a,b) => a+b,0)/v.length : null
export function compareMetric(series: Pick<MetricSeries, 'type' | 'label' | 'view'>, asOf: string): MetricComparison {
  const {view,type} = series
  const base = {type,beforeLabel:'이전 3주 평균',currentLabel:'최근 7일'}
  const recent = addDays(asOf,-6)
  switch(view.kind) {
    case 'weekly': return {...base,before:view.unit === 'minutes' && view.usual <= 0 ? null : view.usual,current:view.weeks.at(-1)?.value ?? null,unit:type==='CONSECUTIVE_ABSENCE'?'days':view.unit}
    case 'line': return {...base,before:view.usual,current:avg(view.days.filter(d=>d.date>=recent && d.date<=asOf && d.value!==null).map(d=>d.value!)),unit:'clock'}
    case 'share': {const s=view.subjects.find(s=>s.name===view.worst);return {...base,beforeLabel:`${view.worst} 계획`,currentLabel:`${view.worst} 실제 · 7일`,before:s?.plan??null,current:s?.actual??null,unit:'percent'}}
    case 'planActual': {
      const split=addDays(asOf,-13),start=addDays(asOf,-27)
      const rate=(days:typeof view.days)=>{const planned=days.reduce((s,d)=>s+(d.off?0:d.planned),0);return planned?days.reduce((s,d)=>s+(d.off?0:Math.min(d.actual,d.planned)),0)/planned*100:null}
      return {...base,beforeLabel:'이전 14일',currentLabel:'최근 14일',before:rate(view.days.filter(d=>d.date>=start&&d.date<split)),current:rate(view.days.filter(d=>d.date>=split&&d.date<=asOf)),unit:'percent'}
    }
    case 'dateList': case 'strip': {
      const rate=(days:typeof view.days)=>{const valid=days.filter(d=>d.state!=='off'&&d.state!=='skip');return valid.length?valid.filter(d=>d.state==='ok').length/valid.length*100:null}
      return {...base,beforeLabel:'이전 3주 제출률',currentLabel:'최근 7일 제출률',before:rate(view.days.filter(d=>d.date>=addDays(asOf,-27)&&d.date<recent)),current:rate(view.days.filter(d=>d.date>=recent&&d.date<=asOf)),unit:'percent'}
    }
  }
}
const n=(v:number)=>Number(v.toFixed(1)).toString()
export function formatMetricValue(value:number|null,unit:ComparisonUnit):string {
  if(value===null)return '기록 없음'
  if(unit==='minutes')return hoursMinutes(Math.round(value))
  if(unit==='clock'){const m=Math.round(value);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
  return `${n(value)}${unit==='count'?'회':unit==='days'?'일':'%'}`
}
export function formatMetricDelta(c:MetricComparison):string {
  if(c.before===null||c.current===null)return '비교할 데이터 없음'
  const d=c.unit==='clock'?Math.round(c.current)-Math.round(c.before):c.current-c.before
  if(Math.abs(d)<0.05)return '변화 없음'
  if(c.type==='SUBJECT_SHARE')return `${n(Math.abs(d))}%p ${d<0?'부족':'초과'}`
  if(c.unit==='clock')return `${hoursMinutes(Math.round(Math.abs(d)))} ${d>0?'늦어짐':'빨라짐'}`
  if(c.type==='STUDY_DROP')return c.before>0?`${n(Math.abs(d/c.before*100))}% ${d<0?'감소':'증가'}`:'비교할 데이터 없음'
  return `${n(Math.abs(d))}${c.unit==='percent'?'%p':c.unit==='days'?'일':'회'} ${d<0?'감소':'증가'}`
}
