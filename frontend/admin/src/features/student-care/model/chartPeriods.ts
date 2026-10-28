import { addDays, shortDate } from './format.ts'
export type ChartPeriod = 'day' | 'week' | 'month'
export function groupChartDays<T extends {date:string}>(days:T[], asOf:string, period:ChartPeriod) {
  const groups = new Map<string,T[]>()
  for (const day of [...days].sort((a,b)=>a.date.localeCompare(b.date))) {
    const age = Math.floor((Date.parse(asOf)-Date.parse(day.date))/86400000)
    const key = period === 'day' ? day.date : period === 'month' ? day.date.slice(0,7) : addDays(asOf,-Math.floor(age/7)*7)
    groups.set(key,[...(groups.get(key) ?? []),day])
  }
  return [...groups].map(([key,items])=>({key,days:items,
    label:period === 'month' ? `${Number(key.slice(5))}월` : period === 'week' ? `${shortDate(items[0].date)}–${shortDate(items.at(-1)!.date)}` : shortDate(key),
    range:`${shortDate(items[0].date)}–${shortDate(items.at(-1)!.date)}`,
  }))
}
export function planRate(days:{planned:number;actual:number;off:boolean}[]) {
  const known=days.filter(day=>!day.off && day.planned>0)
  const planned=known.reduce((sum,day)=>sum+day.planned,0)
  return planned ? known.reduce((sum,day)=>sum+Math.min(day.actual,day.planned),0)/planned*100 : null
}
