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
  { type: 'FILE', label: '파일' },
]

/** A27-UX 파일을 올릴 수 있는 자료 유형과 허용 형식 (서버가 확장자+서명을 다시 검사한다) */
export const fileResourceTypes = new Set(['PDF', 'IMAGE', 'FILE'])
export const documentAccept = '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx'
export const imageAccept = '.jpg,.jpeg,.png,.gif,.webp'
export const acceptFor = (type: string) => (type === 'PDF' ? '.pdf' : type === 'IMAGE' ? imageAccept : `${documentAccept},${imageAccept}`)
const allowedExtensions = new Set([...documentAccept.split(','), ...imageAccept.split(',')].map((value) => value.slice(1)))
/** 서버 한도와 같은 크기(100MB). 실제 한도는 서버 오류(FILE_TOO_LARGE)를 따른다 */
export const maxResourceFileBytes = 100 * 1024 * 1024
export function localFileProblem(file: File, type: string): string | null {
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  const allowed = acceptFor(type).split(',').map((value) => value.slice(1))
  if (!allowedExtensions.has(extension) || !allowed.includes(extension)) return `${acceptFor(type).replaceAll('.', '').toUpperCase().replaceAll(',', '·')} 파일만 올릴 수 있어요.`
  if (file.size === 0) return '빈 파일은 올릴 수 없어요.'
  if (file.size > maxResourceFileBytes) return '100MB 이하 파일만 올릴 수 있어요.'
  return null
}
export const fileSizeText = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`)

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
