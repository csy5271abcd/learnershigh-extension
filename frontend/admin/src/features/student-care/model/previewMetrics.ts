import { previewScenario, previewScenarioSignals } from '../api/previewData.ts'
import { addDays } from './format.ts'
import { buildMockMetrics, weekdayOf, type DayState, type MetricSeries, type MetricView } from './mockMetrics.ts'

/** FE 전용. 문구를 다시 파싱하지 않고 예시 원본의 수치를 비교/그래프에 함께 적용한다. */
export function buildPreviewMetrics(
  studentId: string,
  asOf: string,
  dailyStudy: { date: string; minutes: number }[],
  usualDailyMinutes: number,
  period = 28,
  excludeWeekend = false,
) {
  const raw = previewScenario(studentId)
  const original = buildMockMetrics(studentId, asOf, previewScenarioSignals(studentId), dailyStudy, usualDailyMinutes, 28, excludeWeekend)
  const recent = addDays(asOf, -6)
  const recent14 = addDays(asOf, -13)
  const shownFrom = addDays(asOf, -Math.min(Math.max(period, 1), 28) + 1)
  const attendance = original.metrics.find(metric => metric.type === 'CONSECUTIVE_ABSENCE')!.view
  const sourceCalendar = attendance.kind === 'weekly' ? attendance.calendar! : []
  const daily = new Map(dailyStudy.map(day => [day.date, day.minutes]))
  const skipped = (date: string) => excludeWeekend && [0, 6].includes(weekdayOf(date))
  const dates = Array.from({ length: 28 }, (_, index) => addDays(asOf, index - 27))
  const submissionState = (date: string): DayState => skipped(date) ? 'skip'
    : date >= recent && date < addDays(recent, raw.missing) ? 'miss' : 'ok'

  // 출결은 상세 예시 기록에 있는 날짜의 실제 학습 유무와 일치시킨다.
  const calendar = sourceCalendar.map(day => {
    const minutes = daily.get(day.date) ?? day.minutes
    const came = !skipped(day.date) && (daily.has(day.date) ? minutes > 0 : day.came)
    return { ...day, minutes, came, skip: skipped(day.date),
      longGap: !came && !skipped(day.date) && raw.absence > 0 && day.date > addDays(asOf, -raw.absence),
      start: came ? day.date >= recent ? raw.recentStart : raw.usualStart : null,
      submitted: submissionState(day.date) === 'ok' }
  })
  const usualAttendance = calendar.filter(day => day.date < recent && day.came).length / 3

  const metrics = original.metrics.map((metric): MetricSeries => {
    let view: MetricView = metric.view
    switch (metric.type) {
      case 'CONSECUTIVE_ABSENCE':
        if (view.kind === 'weekly') view = { ...view, usual: usualAttendance,
          weeks: view.weeks.map(week => ({ ...week, value: calendar.filter(day => day.date >= week.from && day.date <= week.to && day.came).length })), calendar }
        break
      case 'START_TIME_SHIFT':
        view = { kind: 'line', usual: raw.usualStart, days: calendar.filter(day => day.came).map(day => ({
          date: day.date, value: day.date >= recent ? raw.recentStart : raw.usualStart,
          late: day.date >= recent && raw.recentStart - raw.usualStart >= 40,
        })) }
        break
      case 'EXECUTION_GAP':
        view = { kind: 'planActual', days: calendar.map(day => {
          const available = day.came && submissionState(day.date) === 'ok'
          const rate = (day.date >= recent14 ? raw.execution : 88) / 100
          const actual = available ? day.minutes : 0
          return { date: day.date, planned: available ? actual / rate : 0, actual, off: !available }
        }) }
        break
      case 'SUBJECT_SHARE':
        if (view.kind === 'share') {
          const others = view.subjects.filter(subject => subject.name !== '수학')
          const plans = distribute(others.map(subject => subject.plan), 100 - raw.subjectPlan)
          const actuals = distribute(others.map(subject => subject.actual), 100 - raw.subjectActual)
          view = { kind: 'share', worst: '수학', subjects: [
            { name: '수학', plan: raw.subjectPlan, actual: raw.subjectActual },
            ...others.map((subject, index) => ({ name: subject.name,
              plan: plans[index], actual: actuals[index],
            })),
          ] }
        }
        break
      case 'PLAN_MISSING':
        view = { kind: 'dateList', days: dates.map(date => ({ date, state: submissionState(date) })) }
        break
    }
    return { ...metric, label: ({CONSECUTIVE_ABSENCE:'입실 일수',STUDY_DROP:'학습 시간',START_TIME_SHIFT:'입실 시각',EXECUTION_GAP:'계획 달성률',SUBJECT_SHARE:'과목별 학습 비율',PLAN_MISSING:'계획 제출률'} as const)[metric.type], view: crop(view, shownFrom) }
  })
  return { pattern: { attendPerWeek: usualAttendance, attendLabel: `이전 3주 주 평균 ${Number(usualAttendance.toFixed(1))}회` }, metrics }
}

/** 정수 비중으로 표시하고 마지막 과목에서 합계의 반올림 오차를 보정한다. */
function distribute(weights: number[], remaining: number): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const values = weights.map(weight => Math.round(remaining * (total ? weight / total : 1 / weights.length)))
  if (values.length) values[values.length - 1] += remaining - values.reduce((sum, value) => sum + value, 0)
  return values
}

/** 기간 선택은 그래프만 자른다. 비교 요약을 만들 때는 기본 28일로 호출한다. */
function crop(view: MetricView, from: string): MetricView {
  switch (view.kind) {
    case 'weekly': return { ...view, weeks: view.weeks.filter(week => week.to >= from),
      calendar: view.calendar?.filter(day => day.date >= from), daily: view.daily?.filter(day => day.date >= from) }
    case 'line': case 'planActual': case 'dateList': case 'strip': return { ...view, days: view.days.filter(day => day.date >= from) } as MetricView
    case 'share': return view
  }
}
