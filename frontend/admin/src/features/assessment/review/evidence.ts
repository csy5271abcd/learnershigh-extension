import type { ReviewDocumentLocator } from '../api/types.ts'
import type { StructureFocus } from '../components/PlanStructureViewer.tsx'

// A11 검토 Wizard 근거 이동 대상·위치 이름 (EvidenceLinks와 Workspace가 함께 쓴다)

/** 근거 이동 대상: PDF 쪽 번호 또는 HWP·HWPX 구조 위치 */
export type EvidenceTarget = number | StructureFocus

export type OnJump = (target: EvidenceTarget) => void

/** 화면 표시용 위치 이름. 구역·표·행·열은 0부터 오는 값을 1부터로 보여 준다(인쇄 쪽 번호가 아니다) */
export function locatorLabel(locator: ReviewDocumentLocator): string {
  const parts = [`구역 ${locator.section + 1}`]
  if (locator.table != null) parts.push(`표 ${locator.table + 1}`)
  if (locator.row != null && locator.col != null) parts.push(`${locator.row + 1}행 ${locator.col + 1}열`)
  else if (locator.kind === 'CONTROL_TEXT') parts.push(locator.control === 'caption' ? '표 제목' : '글상자')
  else if (locator.table == null) parts.push('문단')
  return parts.join(' · ')
}

/** 같은 section·path는 한 번만 */
export function uniqueLocators(locators: ReviewDocumentLocator[] | null | undefined): ReviewDocumentLocator[] {
  const seen = new Set<string>()
  return (locators ?? []).filter((locator) => {
    const key = `${locator.section}:${locator.path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

