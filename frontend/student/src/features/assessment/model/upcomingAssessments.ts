import type { AcademicContext, EvaluationPlan, SchoolAssessment } from '../api/types.ts'
import { groupConfirmedFields } from './confirmedPlanView.ts'
import { daysUntil } from './schoolAssessmentView.ts'
import { monthsInTiming } from './homeCalendar.ts'

// A27-UX(계정 B) 학생 Home '다가오는 수행평가' = 두 출처를 함께 보여 준다. 소유·출처는 그대로 둔다.
//   1) 학생이 직접 관리하는 수행평가(§12, 학생 소유) — 학생이 넣은 정확한 날짜(평가일·제출 마감)로만 D-day를 계산한다.
//   2) 관리자가 확정·공개한 학교 수행평가(§10-1 confirmedFields, 읽기 전용) — 확정값에는 정확한 날짜가 없고
//      '시기'(문장)만 있어 D-day를 만들지 않는다. A26 월별 운영계획의 주차 잠정 배치 날짜도 마감일로 쓰지 않는다.
// 중복 제거: 학생 수행평가가 같은 평가계획서 개정본·같은 과목에 연결(evaluationItemRef)되어 있고 이름이 확정 이름과 같으면
// 같은 수행평가로 보고 학생 항목 하나만 보여 준다(확정값에는 itemKey가 없어 이름까지 맞아야 같다고 본다 — 추정 연결 금지).
// 학생 연결 1건은 공식 항목 1건만 대신한다. 같은 과목에 같은 이름의 공식 수행평가가 여럿이면(예: 1·2차 '보고서')
// 연결 수만큼만 숨기고 나머지는 보인다 — 다른 수행평가가 함께 사라지는 오병합 방지(A27-UX).

export interface DatedEntry {
  kind: 'personal'
  assessment: SchoolAssessment
  /** 기준일부터 가장 가까운 미래 날짜까지 남은 일수 */
  days: number
  /** 그 날짜가 평가일인지 제출 마감인지 */
  dateKind: 'evaluation' | 'deadline'
  date: string
  /** 관리자 확정 평가계획서 항목과 연결된 학생 수행평가 */
  linkedOfficial: boolean
}

export interface OfficialEntry {
  kind: 'official'
  key: string
  planId: string
  subjectId: string
  subjectName: string | null
  label: string
  /** 확정된 학교 안내 시기 문장 (없으면 null) */
  timing: string | null
  /** A28-20: 이 공식 항목이 학생 학교 수행평가로 등록돼 있으면 그 학생 항목(상세로 이동) */
  assessmentId?: string
  /** A28-20: 공식 시기의 달이 모두 오늘보다 앞이면 true(다가오는 일정으로 오인하지 않게) */
  past?: boolean
}

export interface UpcomingView {
  dated: DatedEntry[]
  /** 날짜가 정해지지 않은 학교 공개 수행평가 (D-day 계산 제외) */
  officialUndated: OfficialEntry[]
}

const normalize = (text: string) => text.replace(/\s+/g, '').toLowerCase()

function nearestDate(item: SchoolAssessment, today: string): { days: number; dateKind: 'evaluation' | 'deadline'; date: string } | null {
  const candidates: { days: number; dateKind: 'evaluation' | 'deadline'; date: string }[] = []
  if (item.evaluationDate) candidates.push({ days: daysUntil(item.evaluationDate, today), dateKind: 'evaluation', date: item.evaluationDate })
  if (item.deadlineDate) candidates.push({ days: daysUntil(item.deadlineDate, today), dateKind: 'deadline', date: item.deadlineDate })
  const future = candidates.filter((entry) => entry.days >= 0).sort((a, b) => a.days - b.days)
  return future[0] ?? null
}

/** 공식 시기 문장의 달(예: '9월', '9-10월', '11월 2주')이 모두 오늘 달보다 앞이면 true. 달을 못 읽으면 false(모름) */
export function timingIsPast(timing: string | null, today: string): boolean {
  if (!timing) return false
  const months = monthsInTiming(timing)
  if (months.length === 0) return false
  const month = Number(today.slice(5, 7))
  // 2학기는 다음 해 1·2월까지 — 1·2월은 13·14월로 본다
  const order = (m: number) => (m <= 2 ? m + 12 : m)
  return Math.max(...months.map(order)) < order(month)
}

export function upcomingAssessments(
  items: SchoolAssessment[],
  plans: EvaluationPlan[],
  context: AcademicContext | undefined,
  today: string,
  limit = 5,
): UpcomingView {
  const officialKeys = new Set<string>()
  const officialEntries: OfficialEntry[] = []
  for (const plan of plans) {
    for (const subject of groupConfirmedFields(plan.confirmedFields ?? [], context)) {
      // 이 학기 수강 과목만 (수강하지 않는 과목의 수행평가를 학생 일정으로 보이지 않는다)
      if (!subject.enrolled) continue
      for (const item of subject.items) {
        if (item.label.state !== 'value') continue
        const label = String(item.label.value)
        const key = `${plan.documentRevisionId}|${subject.subjectId}|${normalize(label)}`
        officialKeys.add(key)
        officialEntries.push({
          kind: 'official',
          key: `${plan.planId}|${subject.subjectId}|${item.index}`,
          planId: plan.planId,
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          label,
          timing: item.timing.state === 'value' ? String(item.timing.value) : null,
        })
      }
    }
  }

  const linkedCounts = new Map<string, number>()
  // A28-20: 연결된 학생 항목 중 날짜가 없고 끝나지 않은 항목(학교 확정 자동 등록 등)은 공식 항목 자리에 그대로 남겨 상세로 잇는다
  const undatedLinked = new Map<string, string[]>()
  const dated: DatedEntry[] = []
  for (const item of items) {
    const ref = item.evaluationItemRef
    const linkKey = ref ? `${ref.documentRevisionId}|${item.subjectId}|${normalize(item.title)}` : null
    const linkedOfficial = linkKey !== null && officialKeys.has(linkKey)
    if (linkedOfficial && linkKey) linkedCounts.set(linkKey, (linkedCounts.get(linkKey) ?? 0) + 1)
    if (linkedOfficial && linkKey && item.status !== 'COMPLETED' && !nearestDate(item, today) && !item.evaluationDate && !item.deadlineDate) {
      undatedLinked.set(linkKey, [...(undatedLinked.get(linkKey) ?? []), item.assessmentId])
    }
    if (item.status === 'COMPLETED') continue
    const nearest = nearestDate(item, today)
    if (!nearest) continue
    dated.push({ kind: 'personal', assessment: item, ...nearest, linkedOfficial })
  }
  dated.sort((a, b) => a.days - b.days)

  const plansById = new Map(plans.map((plan) => [plan.planId, plan]))
  const officialUndated: OfficialEntry[] = []
  for (const entry of officialEntries) {
    const plan = plansById.get(entry.planId)
    const past = timingIsPast(entry.timing, today)
    if (!plan) {
      officialUndated.push({ ...entry, past })
      continue
    }
    const linkKey = `${plan.documentRevisionId}|${entry.subjectId}|${normalize(entry.label)}`
    const remaining = linkedCounts.get(linkKey) ?? 0
    if (remaining === 0) {
      officialUndated.push({ ...entry, past })
      continue
    }
    linkedCounts.set(linkKey, remaining - 1)
    // 날짜 없는 학생 항목으로 등록돼 있으면 같은 자리에서 그 항목으로 잇는다(이중 표시 없음). 날짜가 있거나 끝났으면 숨긴다
    const waiting = undatedLinked.get(linkKey) ?? []
    if (waiting.length > 0) {
      officialUndated.push({ ...entry, past, assessmentId: waiting[0] })
      undatedLinked.set(linkKey, waiting.slice(1))
    }
  }
  // 지난 시기는 뒤로(다가오는 일정처럼 보이지 않게)
  officialUndated.sort((a, b) => Number(Boolean(a.past)) - Number(Boolean(b.past)))
  return { dated: dated.slice(0, limit), officialUndated }
}
