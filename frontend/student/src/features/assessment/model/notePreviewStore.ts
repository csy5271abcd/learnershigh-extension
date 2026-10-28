// 노트 이미지·파일 블록의 "이 화면에서만" 미리보기 주소 (blob:).
// 파일 저장소가 정해지지 않아(API-OD-A03) 파일 본문은 저장하지 않는다. 이 주소는 탭을 닫거나 새로고침하면 사라지며
// 노트 저장 내용(블록 attrs)에 들어가지 않는다.
const sessionPreviews = new Map<string, string>()

export function setSessionPreview(blockId: string, file: File): string {
  const previous = sessionPreviews.get(blockId)
  if (previous) URL.revokeObjectURL(previous)
  const url = URL.createObjectURL(file)
  sessionPreviews.set(blockId, url)
  return url
}

export function sessionPreview(blockId: string): string | undefined {
  return sessionPreviews.get(blockId)
}
