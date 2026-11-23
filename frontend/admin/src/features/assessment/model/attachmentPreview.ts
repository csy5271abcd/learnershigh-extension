// A28-44: 관리자 첨부 미리보기 방식. 서버 미리보기 허용 목록(§26 · §26-1: PDF·PNG·JPEG·GIF·WEBP)과 같다.
// 그 밖 형식은 학생 첨부용 변환 경로가 없어 미리보기 미지원(내려받기만)이다. 화면에서 임의로 렌더링하지 않는다.
export type PreviewKind = 'image' | 'pdf' | 'none'

const images = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

export function previewKindOf(contentType: string | null | undefined): PreviewKind {
  if (!contentType) return 'none'
  if (contentType === 'application/pdf') return 'pdf'
  return images.has(contentType) ? 'image' : 'none'
}
