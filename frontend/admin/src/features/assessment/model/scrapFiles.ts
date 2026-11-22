// A27-UX §43-1 관리자 참고자료 업로드 — 화면 사전 검사·표시 규칙(최종 판정은 서버: 확장자 + 파일 서명 + 크기).
// 학생 자료함(§22-1)과 같은 문서·이미지 + 관리자 전용 영상(MP4·M4V·MOV·WEBM).

export const SCRAP_FILE_ACCEPT = '.pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.m4v,.mov,.webm'
/** 서버 기본 한도(assessment.storage.max-file-bytes 50MB)와 같다. 서버 설정이 다르면 서버 응답(413)을 그대로 보인다 */
export const SCRAP_FILE_MAX_BYTES = 50 * 1024 * 1024

const extensions = new Set(SCRAP_FILE_ACCEPT.split(',').map((value) => value.slice(1)))
const videoExtensions = new Set(['mp4', 'm4v', 'mov', 'webm'])

export const extensionOf = (fileName: string) => {
  const dot = fileName.lastIndexOf('.')
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/** 올리기 전 화면 검사. 문제가 없으면 null */
export function scrapFileProblem(file: { name: string; size: number }): string | null {
  if (!extensions.has(extensionOf(file.name))) return 'PDF·HWP·HWPX·DOC·DOCX·XLS·XLSX·PPT·PPTX·JPG·PNG·GIF·WEBP·MP4·MOV·WEBM 파일만 올릴 수 있어요.'
  if (file.size === 0) return '빈 파일이에요.'
  if (file.size > SCRAP_FILE_MAX_BYTES) return `파일이 너무 커요. ${SCRAP_FILE_MAX_BYTES / 1024 / 1024}MB 이하 파일만 올릴 수 있어요.`
  return null
}

export const isVideoFileName = (fileName: string) => videoExtensions.has(extensionOf(fileName))

export type ScrapFileKind = 'video' | 'image' | 'pdf' | 'hwp' | 'office' | 'file'

export function scrapFileKind(contentType: string): ScrapFileKind {
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('image/')) return 'image'
  if (contentType === 'application/pdf') return 'pdf'
  if (contentType.includes('hwp')) return 'hwp'
  if (contentType.includes('officedocument') || contentType.includes('ms-') || contentType === 'application/msword') return 'office'
  return 'file'
}

export const scrapFileKindLabel: Record<ScrapFileKind, string> = { video: '영상', image: '사진', pdf: 'PDF', hwp: '한글', office: '오피스 문서', file: '파일' }

export function fileSizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** 파일 이름에서 제목 기본값 (확장자 제외) */
export const titleFromFileName = (fileName: string) => fileName.replace(/\.[^.]+$/, '').trim()
