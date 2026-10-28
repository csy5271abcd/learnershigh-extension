export interface DistributionStudent {
  id: string
  name: string
  days: { date: string; minutes: number | null; start: number | null; attendance?:string }[]
}
export type DistributionField = 'minutes' | 'start'
export function missingRecordLabel(day:DistributionStudent['days'][number]|undefined,field:DistributionField):string{
  if(!day||day.minutes===null||field==='minutes')return '기록 없음'
  return day.attendance==='present'?'입실 시각 기록 없음':'입실 기록 없음'
}

/** Linear interpolation at rank (n - 1)p, including the observed endpoints. */
export function quantile(values: number[], p: number): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (sorted.length - 1) * p
  const lower = Math.floor(rank)
  return sorted[lower] + (sorted[Math.ceil(rank)] - sorted[lower]) * (rank - lower)
}

export function branchDistribution(students: DistributionStudent[], field: DistributionField) {
  const dates = [...new Set(students.flatMap(student => student.days.map(day => day.date)))].sort()
  return dates.map(date => {
    const observations = students.flatMap(student => {
      const value = student.days.find(day => day.date === date)?.[field]
      return value === null || value === undefined || !Number.isFinite(value) ? [] : [{ id: student.id, name: student.name, value }]
    })
    const values = observations.map(observation => observation.value)
    const q25 = quantile(values, .25)
    const q75 = quantile(values, .75)
    const iqr = q25 === null || q75 === null ? null : q75 - q25
    // NIST: https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm
    const outliers = values.length < 4 || iqr === null ? [] : observations.filter(observation => observation.value < q25! - 1.5 * iqr || observation.value > q75! + 1.5 * iqr)
    return { date, count: values.length, mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, q25, q75, outliers }
  })
}
