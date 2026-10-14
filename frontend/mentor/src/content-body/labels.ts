// Content 본문 표시 이름. URL / 저장 값에는 내부 Key를 쓰고 화면에는 이름을 쓴다.
// Story 주제 / Record 영역 이름은 Student Mentor Hub(storyTopics.ts, records.ts)와 같은 문구를 쓴다. (TEMPORARY FIXTURE DUPLICATION)

import type { PlanDay, RecordArea, RecordBody, RecordGrade, StoryTopic } from '../api/types.ts'

export const planDays: PlanDay[] = ['월', '화', '수', '목', '금', '토', '일']

export const storyTopics: { id: StoryTopic; label: string }[] = [
  { id: 'success', label: '성공' },
  { id: 'failure', label: '실패' },
  { id: 'recovery', label: '회복' },
  { id: 'grade-change', label: '성적 변화' },
  { id: 'admission-switch', label: '수시/정시 전환' },
  { id: 'career', label: '진로 고민' },
  { id: 'study-method', label: '공부법' },
  { id: 'mental', label: '멘탈 관리' },
]

export const storyTopicLabel = (topic: StoryTopic) => storyTopics.find((item) => item.id === topic)?.label ?? topic

export const recordGrades: { id: RecordGrade; label: string }[] = [
  { id: 1, label: '고1' },
  { id: 2, label: '고2' },
  { id: 3, label: '고3' },
]

/** Feature Spec 공개 가능 유형 (mentor-hub.md Record) */
export const recordAreas: { id: RecordArea; label: string }[] = [
  { id: 'subject-detail', label: '교과학습발달상황' },
  { id: 'autonomous', label: '자율활동' },
  { id: 'club', label: '동아리활동' },
  { id: 'career', label: '진로활동' },
  { id: 'project', label: '공식 프로젝트/탐구 연계' },
]

export const recordAreaLabel = (area: RecordArea) => recordAreas.find((item) => item.id === area)?.label ?? area

export function recordPeriodText(body: Pick<RecordBody, 'grade' | 'semester'>) {
  return `고${body.grade}${body.semester ? ` · ${body.semester}학기` : ''}`
}

/** Record / Case에서 지워야 하는 정보 (domain.md §33) */
export const recordPrivacyItems = ['학교명', '담당 교사', '학번', '반 / 번호', '주민번호', '수험번호', '제3자 실명']
