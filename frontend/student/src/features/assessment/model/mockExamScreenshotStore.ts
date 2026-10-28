import { useSyncExternalStore } from 'react'

// 내 지문 스크린샷·영역 표시 (2026-10-27 사용자 요청 B). **이 브라우저 화면에서만** 보관한다.
// - 파일 저장소가 정해지지 않아(API-OD-A03) 스크린샷은 서버에 올리지 않는다. §17 sourceFileRef도 채우지 않는다.
// - 영역(정규화 좌표)·메모·개념·질문은 계약에 저장 필드가 없어(P-22 제안) 새로고침하면 사라진다.
// - 글자 인식(OCR)은 하지 않는다. 내용은 학생이 직접 적는다.
// 브라우저 저장소(localStorage 등)에도 넣지 않는다 (assessment-frontend-mock.md §5).

export interface ScreenshotRegion {
  regionId: string
  /** 이미지 크기에 대한 비율 (0~1). 화면 크기가 바뀌어도 같은 자리를 가리킨다 */
  x: number
  y: number
  width: number
  height: number
  memo: string
  concept: string
  question: string
}

export interface MaterialScreenshot {
  file: { name: string; size: number; mimeType: string }
  /** blob: 미리보기 주소 (이 탭에서만 유효) */
  previewUrl: string
  kind: 'image' | 'pdf'
  regions: ScreenshotRegion[]
}

export const screenshotAccept = 'image/png,image/jpeg,image/webp,application/pdf'
/** 미리보기를 만드는 크기 (Mock 기준, 실제 업로드 한도 아님) */
export const screenshotMaxBytes = 20 * 1024 * 1024
/** 너무 작은 드래그(실수 클릭)는 영역으로 만들지 않는다 */
export const minRegionSize = 0.02

const screenshots = new Map<string, MaterialScreenshot>()
const listeners = new Set<() => void>()
let version = 0

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 고른 파일이 스크린샷으로 쓸 수 있는지. 문제가 있으면 안내 문장 */
export function screenshotFileProblem(file: File): string | null {
  if (!screenshotAccept.split(',').includes(file.type)) return 'PNG·JPG·WEBP 이미지 또는 PDF만 올릴 수 있어요.'
  if (file.size > screenshotMaxBytes) return '20MB보다 큰 파일은 미리볼 수 없어요. 필요한 부분만 캡처해 주세요.'
  return null
}

export function attachScreenshot(materialId: string, file: File): MaterialScreenshot {
  const previous = screenshots.get(materialId)
  if (previous) URL.revokeObjectURL(previous.previewUrl)
  const next: MaterialScreenshot = {
    file: { name: file.name, size: file.size, mimeType: file.type },
    previewUrl: URL.createObjectURL(file),
    kind: file.type === 'application/pdf' ? 'pdf' : 'image',
    // 파일을 바꾸면 이전 영역은 다른 그림을 가리키므로 지운다.
    regions: [],
  }
  screenshots.set(materialId, next)
  emit()
  return next
}

export function setRegions(materialId: string, regions: ScreenshotRegion[]) {
  const current = screenshots.get(materialId)
  if (!current) return
  screenshots.set(materialId, { ...current, regions })
  emit()
}

let regionSequence = 0
export function newRegion(box: Pick<ScreenshotRegion, 'x' | 'y' | 'width' | 'height'>): ScreenshotRegion {
  regionSequence += 1
  return { regionId: `region_${regionSequence}`, ...roundBox(box), memo: '', concept: '', question: '' }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const round4 = (value: number) => Math.round(value * 10000) / 10000

/** 좌표를 0~1 안으로 맞추고 소수 넷째 자리로 줄인다 (이미지 밖으로 나가지 않게) */
export function roundBox(box: Pick<ScreenshotRegion, 'x' | 'y' | 'width' | 'height'>) {
  const x = clamp01(box.x)
  const y = clamp01(box.y)
  return { x: round4(x), y: round4(y), width: round4(Math.min(box.width, 1 - x)), height: round4(Math.min(box.height, 1 - y)) }
}

/** 두 점(드래그 시작·끝)으로 만든 상자 */
export function boxFromPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
  const x = clamp01(Math.min(a.x, b.x))
  const y = clamp01(Math.min(a.y, b.y))
  return { x, y, width: clamp01(Math.max(a.x, b.x)) - x, height: clamp01(Math.max(a.y, b.y)) - y }
}

export function useMaterialScreenshot(materialId: string | undefined): MaterialScreenshot | undefined {
  useSyncExternalStore(subscribe, () => version)
  return materialId ? screenshots.get(materialId) : undefined
}
