import type { StudentResource } from '../api/types.ts'

// 자료함 표시 규칙 (Business State가 아닌 표시용 파생 값).

/** 등록 화면의 유형 (Mockup RL-ADD-01 순서). 계약 Enum 미확정이라 후보 값이다 (MM-31). */
export const resourceTypes: { type: string; label: string }[] = [
  { type: 'LINK', label: '링크' },
  { type: 'ARTICLE', label: '기사' },
  { type: 'PAPER', label: '논문' },
  { type: 'BOOK', label: '도서' },
  { type: 'VIDEO', label: '영상' },
  { type: 'PDF', label: 'PDF' },
  { type: 'IMAGE', label: '이미지' },
]

/** 목록 필터 Chip (Mockup RL-LIST-01: 전체·링크·PDF·이미지·영상·도서). 기사·논문은 전체에서만 보인다 (MM-31). */
export const resourceFilterTypes = ['LINK', 'PDF', 'IMAGE', 'VIDEO', 'BOOK']

export function resourceTypeLabel(type: string): string {
  return resourceTypes.find((entry) => entry.type === type)?.label ?? '자료'
}

export function parseResourceType(value: string | null): string | undefined {
  return value && resourceFilterTypes.includes(value) ? value : undefined
}

/**
 * Mockup RL-ADD-01 안내("작성자와 발행일을 모두 채우면 출처 확인됨")에 따른 표시.
 * 학생이 출처 정보를 적었다는 뜻이며, 시스템이 원문을 확인했다는 뜻이 아니다 (MM-32).
 */
export function hasSourceInfo(resource: Pick<StudentResource, 'author' | 'publishedDate'>): boolean {
  return Boolean(resource.author && resource.publishedDate)
}

/** `2025-03` → `2025. 3.`, `2026-10-14` → `2026. 10. 14.` */
export function formatPublishedDate(value: string): string {
  return `${value.split('-').map(Number).join('. ')}.`
}

/** 목록 메타 줄: 유형 · 발행기관 · 저자 · 발행일 (없는 값은 만들지 않는다) */
export function resourceMetaLine(resource: StudentResource): string {
  return [
    resourceTypeLabel(resource.type),
    resource.sourceName,
    resource.author,
    resource.publishedDate ? formatPublishedDate(resource.publishedDate) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** "환경, 실험 , ,중화" → ['환경', '실험', '중화'] (중복 제거) */
export function parseTags(input: string): string[] {
  return [...new Set(input.split(',').map((tag) => tag.trim()).filter(Boolean))]
}

/** URL 형식 검사만 한다. 실제 페이지 존재·접근 가능 여부는 확인하지 않는다. */
export function isValidUrlFormat(value: string): boolean {
  return /^https?:\/\/[^\s]+\.[^\s]+/.test(value.trim())
}

export const publishedDatePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/
