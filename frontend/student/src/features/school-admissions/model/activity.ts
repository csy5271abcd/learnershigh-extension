// ---------- Growth Activity (성장 활동) ----------
// 수행평가 Task가 아니다. 수행평가 밖에서 학생이 경험한 활동을 기록하는 공간이다. (Task와 다른 Entity, Archive Projection에서만 합쳐진다)
// GET / POST / PATCH /api/student/activities, …/submit, …/evidence 의미를 따른다. 실제 API는 아직 연결하지 않는다.

/**
 * 활동 유형 (Frontend 안정 key + 화면 이름). Contract 예시 SCHOOL_PROJECT 등은 API Enum으로 확정하지 않는다.
 */
export type ActivityType =
  | 'school-competition'
  | 'external-competition'
  | 'volunteer'
  | 'club'
  | 'school-project'
  | 'self-study'
  | 'career'
  | 'etc'

export const activityTypes: { id: ActivityType; label: string }[] = [
  { id: 'school-competition', label: '교내대회' },
  { id: 'external-competition', label: '교외대회' },
  { id: 'volunteer', label: '봉사활동' },
  { id: 'club', label: '동아리' },
  { id: 'school-project', label: '학교 프로젝트' },
  { id: 'self-study', label: '자율 탐구' },
  { id: 'career', label: '진로체험' },
  { id: 'etc', label: '기타' },
]

export const activityTypeLabel = (type: ActivityType) => activityTypes.find((item) => item.id === type)?.label ?? '기타'

/**
 * 활동 상태 (Feature 내부 값). 기본: draft → submitted → reflected → archived.
 * 피드백 요청 시: submitted → feedback-waiting → feedback-delivered → reflected → archived. (피드백은 선택)
 * 이번 Branch에서 학생이 바꾸는 것은 draft → submitted뿐이다. API Enum은 확정하지 않는다.
 */
export type ActivityStatus = 'draft' | 'submitted' | 'feedback-waiting' | 'feedback-delivered' | 'reflected' | 'archived'

/** 상태 표시 (Activities-00 카드 Badge 문구) */
export const activityStatusLabel: Record<ActivityStatus, string> = {
  draft: '작성 중',
  submitted: '제출 완료',
  'feedback-waiting': '피드백 대기',
  'feedback-delivered': '피드백 도착',
  reflected: '보완 완료',
  archived: 'Archive 저장',
}

/** 학생이 직접 쓰는 활동 기록 (AI / Admin이 대신 쓰지 않는다) */
export interface ActivityRecordFields {
  title: string
  type: ActivityType
  organizer: string
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD, 하루짜리 활동은 비워 둔다 */
  endDate: string
  role: string
  participationReason: string
  process: string
  contribution: string
  result: string
  followUp: string
  tags: string[]
}

/** Reflection 질문 하나 (ActivitiesDetail-02). 답은 학생이 직접 쓴다. */
export interface ActivityReflectionAnswer {
  question: string
  answer: string | null
}

/** 활동 피드백 (ActivitiesDetail-02 선생님 피드백). 학생이 요청했을 때만 생긴다. */
export interface ActivityTeacherFeedback {
  author: string
  /** ISO 8601 */
  deliveredAt: string
  sections: { label: string; text: string }[]
}

export interface GrowthActivity extends ActivityRecordFields {
  activityId: string
  status: ActivityStatus
  /** 공개 범위. Contract 예시 PRIVATE만 확인된다. (다른 값은 확정하지 않는다) */
  visibility: 'PRIVATE'
  /** Reflection 답 (이번 Branch에서는 작성하지 않는다. Seed만 Mockup 내용) */
  reflection: ActivityReflectionAnswer[]
  feedback: ActivityTeacherFeedback | null
}

/** Activity 과정 자료. Task Evidence와 다른 저장소다. (Task 단계 Tag 없음) */
export interface ActivityEvidence {
  evidenceId: string
  activityId: string
  fileName: string
  fileRef: string
  /** ISO 8601 */
  createdAt: string
  mimeType?: string
  sizeBytes?: number
  file?: File
}

export interface GrowthActivityDetail {
  activity: GrowthActivity
  evidence: ActivityEvidence[]
}

/** Activities 목록 한 줄 (activity + Evidence 수) */
export interface GrowthActivityListItem {
  activity: GrowthActivity
  evidenceCount: number
}

/** Reflection 질문 (ActivitiesDetail-02의 7개 질문). 답 채우기는 다음 Branch. */
export const activityReflectionQuestions = [
  '왜 참여했나요?',
  '내가 맡은 역할은 무엇이었나요?',
  '실제로 무엇을 했나요?',
  '가장 어려웠던 점은 무엇이었나요?',
  '무엇을 배우거나 새롭게 알게 되었나요?',
  '다음번에는 무엇을 바꾸고 싶나요?',
  '후속 활동이 있다면 무엇인가요?',
]

export const reflectionAnsweredCount = (activity: GrowthActivity) => activity.reflection.filter((item) => item.answer).length

/** 카드 / Detail의 Reflection 상태 문장 */
export function reflectionStatusText(activity: GrowthActivity): string {
  const answered = reflectionAnsweredCount(activity)
  if (answered === 0) return 'Reflection 아직 안 씀'
  return `Reflection ${answered}/${activityReflectionQuestions.length}`
}

/** 2026-09-12 → 2026.09.12, 기간이 하루면 한 날짜만 */
export function activityPeriodText(activity: Pick<ActivityRecordFields, 'startDate' | 'endDate'>): string {
  const format = (date: string) => date.replaceAll('-', '.')
  return activity.endDate && activity.endDate !== activity.startDate
    ? `${format(activity.startDate)} ~ ${format(activity.endDate)}`
    : format(activity.startDate)
}

/**
 * 기준일과 같은 학기(3~7월 1학기 / 8~이듬해 2월 2학기)에 시작한 활동인지. "이번 학기 기록" 요약에 쓴다.
 * (학기 Contract가 없어 화면 계산 규칙이다)
 */
export function isThisSemester(startDate: string, snapshotDate: string): boolean {
  const semester = (date: string) => {
    const [year, month] = date.split('-').map(Number)
    if (month >= 8) return `${year}-2`
    if (month <= 2) return `${year - 1}-2`
    return `${year}-1`
  }
  return semester(startDate) === semester(snapshotDate)
}

/** 학생이 기록을 고칠 수 있는 상태인지. 제출 후 수정 가능 범위는 정해지지 않아 지금은 작성 중일 때만 (Frontend 임시 정책) */
export const isActivityEditable = (activity: GrowthActivity) => activity.status === 'draft'

// ---------- 입력 검사 ----------

export type ActivityFieldErrors = Partial<Record<'title' | 'type' | 'startDate' | 'endDate', string>>

/** 필수: 활동명 · 유형 · 시작일. 종료일은 있으면 시작일보다 앞서지 않아야 한다. (지난 활동 기록도 가능 → 과거 날짜를 막지 않는다) */
export function validateActivityBasics(fields: Pick<ActivityRecordFields, 'title' | 'startDate' | 'endDate'> & { type: ActivityType | '' }): ActivityFieldErrors {
  const errors: ActivityFieldErrors = {}
  if (!fields.title.trim()) errors.title = '활동명을 입력해주세요.'
  if (!fields.type) errors.type = '활동 유형을 골라주세요.'
  if (!fields.startDate) errors.startDate = '시작일을 입력해주세요.'
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) errors.endDate = '종료일은 시작일과 같거나 뒤여야 해요.'
  return errors
}

/** 태그 입력 "관찰, 미생물" → ['관찰', '미생물'] */
export const parseTags = (value: string) =>
  value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
