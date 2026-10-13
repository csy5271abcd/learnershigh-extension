import type { MentorRecord, RecordArea, RecordGrade } from './types.ts'

// Record 화면 이름 / URL 값. URL(?grade= &area=)에는 내부 값을 쓰고 화면에는 이름을 쓴다.

export const recordGrades: { id: RecordGrade; label: string }[] = [
  { id: 1, label: '고1' },
  { id: 2, label: '고2' },
  { id: 3, label: '고3' },
]

/** Feature Spec 공개 가능 유형 순서 */
export const recordAreas: { id: RecordArea; label: string }[] = [
  { id: 'subject-detail', label: '교과학습발달상황' },
  { id: 'autonomous', label: '자율활동' },
  { id: 'club', label: '동아리활동' },
  { id: 'career', label: '진로활동' },
  { id: 'project', label: '공식 프로젝트/탐구 연계' },
]

export const recordAreaLabel = (area: RecordArea) => recordAreas.find((item) => item.id === area)?.label ?? area

export function parseRecordGrade(value: string | null): RecordGrade | undefined {
  return recordGrades.find((item) => String(item.id) === value)?.id
}

export function parseRecordArea(value: string | null): RecordArea | undefined {
  return recordAreas.find((item) => item.id === value)?.id
}

/** "고2 · 1학기" / 학기 구분이 없으면 "고2" */
export function recordPeriodText(record: MentorRecord): string {
  return `고${record.grade}${record.semester ? ` · ${record.semester}학기` : ''}`
}

/** 검수 상태 Enum 없이 쓰는 표시 문구 (OD-05 미확정) */
export const recordReviewedLabel = '개인정보 제거 · 검수 완료'
