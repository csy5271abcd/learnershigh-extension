// Interview Bridge (Contract §19). 고3 Student에게 Admin이 공개한 질문만 보인다.
// practiceStatus는 Contract 예시에 나온 NOT_STARTED / PRACTICING 두 값만 쓴다. (전체 Enum은 미확정 → 다른 값을 만들지 않는다)

import type { GrowthActivity } from './activity.ts'

export type InterviewPracticeStatus = 'NOT_STARTED' | 'PRACTICING'

export const practiceStatusLabel: Record<InterviewPracticeStatus, string> = {
  NOT_STARTED: '연습 전',
  PRACTICING: '연습 중',
}

/** Student가 받는 질문 (§19-1 + answer). answer는 GET 응답에 없는 Fixture 필드다. (Contract Gap) */
export interface InterviewQuestion {
  questionId: string
  question: string
  relatedActivityIds: string[]
  practiceStatus: InterviewPracticeStatus
  answer: string
}

/** 관련 활동: 같은 Canonical Activity를 참조한다. 찾지 못하면 null (화면 일부만 안내) */
export interface InterviewRelatedActivity {
  activityId: string
  activity: GrowthActivity | null
}

export interface InterviewQuestionDetail {
  question: InterviewQuestion
  related: InterviewRelatedActivity[]
}

/** Interview 대상 학년 (Spec: 고3) */
export const isInterviewEligible = (grade: string) => grade === '고3'

export const hasInterviewAnswer = (question: Pick<InterviewQuestion, 'answer'>) => question.answer.trim().length > 0
