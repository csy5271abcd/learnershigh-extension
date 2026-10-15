// Create / Edit 화면이 함께 쓰는 Form 값과 검증.
// 검증은 입력 누락을 막는 Form 수준 확인이다. 길이 제한 / 공개 정책 같은 Business Rule은 만들지 않는다.

import type {
  CaseBody,
  MentorContentBody,
  MentorContentBodyByType,
  MentorContentCreateRequest,
  MentorContentDetail,
  MentorContentType,
  MentorContentUpdateRequest,
  MentorContentVisibility,
  PlanBody,
  RecordBody,
  RoutineBody,
  StoryBody,
} from '../../../api/types.ts'

export interface ContentFormValue {
  /** Create 첫 단계 전에는 null */
  type: MentorContentType | null
  title: string
  tags: string[]
  visibility: MentorContentVisibility
  /** 유형을 바꿔도 앞서 쓴 본문이 사라지지 않게 유형별로 둔다. */
  bodies: Partial<MentorContentBodyByType>
}

let sequence = 0
/** 새 항목 Local Id. 저장 시 Server가 다시 정할 수 있는 Frontend 식별자다. */
export function newLocalId(prefix: string) {
  sequence += 1
  return `${prefix}-${Date.now().toString(36)}-${sequence}`
}

export function emptyBody<T extends MentorContentType>(type: T): MentorContentBodyByType[T] {
  const bodies: { [K in MentorContentType]: () => MentorContentBodyByType[K] } = {
    PLAN: () => ({
      description: '',
      weeks: [{ week: 1, items: [{ itemId: newLocalId('item'), day: '월', subject: '', task: '', memo: '' }] }],
    }),
    ROUTINE: () => ({
      description: '',
      habits: [{ habitId: newLocalId('habit'), title: '', frequency: '', start: '', end: '', description: '' }],
    }),
    STORY: () => ({ summary: '', topics: [], text: '' }),
    RECORD: () => ({
      grade: 2,
      semester: null,
      area: 'subject-detail',
      subjectOrActivity: '',
      recordText: '',
      linkedActivity: '',
      mentorNote: '',
    }),
    CASE: () => ({
      grade: 2,
      subject: '',
      activityType: '',
      summary: '',
      stages: [{ stageId: newLocalId('stage'), title: '', description: '' }],
      evidenceSummary: '',
      result: '',
      reflection: '',
      followUp: '',
    }),
  }
  return bodies[type]()
}

export const createEmptyForm = (): ContentFormValue => ({
  type: null,
  title: '',
  tags: [],
  visibility: 'PUBLIC',
  bodies: {},
})

export function formFromContent(content: MentorContentDetail): ContentFormValue {
  return {
    type: content.type,
    title: content.title,
    tags: [...content.tags],
    visibility: content.visibility,
    bodies: { [content.type]: structuredClone(content.body) },
  }
}

export function bodyOf<T extends MentorContentType>(form: ContentFormValue, type: T): MentorContentBodyByType[T] {
  return (form.bodies[type] as MentorContentBodyByType[T] | undefined) ?? emptyBody(type)
}

/** 화면에 보여 줄 입력 문제 목록. 비어 있으면 저장할 수 있다. */
export interface FormErrors {
  title?: string
  body: string[]
}

const blank = (value: string) => value.trim().length === 0

function planErrors(body: PlanBody): string[] {
  const errors: string[] = []
  if (body.weeks.every((week) => week.items.length === 0)) errors.push('할 일을 하나 이상 넣어 주세요.')
  body.weeks.forEach((week) => {
    week.items.forEach((item, index) => {
      if (blank(item.task)) errors.push(`${week.week}주차 ${index + 1}번째 할 일을 입력해 주세요.`)
      if (blank(item.subject)) errors.push(`${week.week}주차 ${index + 1}번째 과목을 입력해 주세요.`)
    })
  })
  return errors
}

function routineErrors(body: RoutineBody): string[] {
  const errors: string[] = []
  if (body.habits.length === 0) errors.push('습관을 하나 이상 넣어 주세요.')
  body.habits.forEach((habit, index) => {
    const name = `${index + 1}번째 습관`
    if (blank(habit.title)) errors.push(`${name} 이름을 입력해 주세요.`)
    if (blank(habit.frequency)) errors.push(`${name} 주기를 입력해 주세요.`)
    if (!habit.start || !habit.end) errors.push(`${name} 시작 / 끝 시간을 입력해 주세요.`)
    else if (habit.start >= habit.end) errors.push(`${name} 끝 시간이 시작 시간보다 늦어야 해요.`)
  })
  return errors
}

function storyErrors(body: StoryBody): string[] {
  const errors: string[] = []
  if (blank(body.summary)) errors.push('한 줄 요약을 입력해 주세요.')
  if (body.topics.length === 0) errors.push('주제를 하나 이상 골라 주세요.')
  if (blank(body.text)) errors.push('본문을 입력해 주세요.')
  return errors
}

function recordErrors(body: RecordBody): string[] {
  const errors: string[] = []
  if (blank(body.subjectOrActivity)) errors.push('과목 또는 활동 이름을 입력해 주세요.')
  if (blank(body.recordText)) errors.push('기록 문장을 입력해 주세요.')
  return errors
}

function caseErrors(body: CaseBody): string[] {
  const errors: string[] = []
  if (blank(body.subject)) errors.push('과목 / 영역을 입력해 주세요.')
  if (blank(body.summary)) errors.push('활동 요약을 입력해 주세요.')
  if (body.stages.length === 0) errors.push('활동 단계를 하나 이상 넣어 주세요.')
  body.stages.forEach((stage, index) => {
    if (blank(stage.title)) errors.push(`${index + 1}단계 이름을 입력해 주세요.`)
  })
  return errors
}

export function bodyErrors(type: MentorContentType, body: MentorContentBody): string[] {
  switch (type) {
    case 'PLAN':
      return planErrors(body as PlanBody)
    case 'ROUTINE':
      return routineErrors(body as RoutineBody)
    case 'STORY':
      return storyErrors(body as StoryBody)
    case 'RECORD':
      return recordErrors(body as RecordBody)
    case 'CASE':
      return caseErrors(body as CaseBody)
  }
}

export function validateForm(form: ContentFormValue): FormErrors {
  if (!form.type) return { body: ['유형을 골라 주세요.'] }
  return {
    title: blank(form.title) ? '제목을 입력해 주세요.' : undefined,
    body: bodyErrors(form.type, bodyOf(form, form.type)),
  }
}

export const hasErrors = (errors: FormErrors) => Boolean(errors.title) || errors.body.length > 0

export function toCreateRequest(form: ContentFormValue): MentorContentCreateRequest {
  if (!form.type) throw new Error('유형이 없는 Form은 저장할 수 없다.')
  return {
    type: form.type,
    title: form.title.trim(),
    tags: form.tags,
    body: bodyOf(form, form.type),
    visibility: form.visibility,
  } as MentorContentCreateRequest
}

export function toUpdateRequest(form: ContentFormValue): MentorContentUpdateRequest {
  if (!form.type) throw new Error('유형이 없는 Form은 저장할 수 없다.')
  return { title: form.title.trim(), tags: form.tags, body: bodyOf(form, form.type), visibility: form.visibility }
}

/** Preview / 상세 화면에 넘길 값 */
export function previewOf(form: ContentFormValue) {
  if (!form.type) return null
  return { type: form.type, title: form.title, tags: form.tags, body: bodyOf(form, form.type) }
}
