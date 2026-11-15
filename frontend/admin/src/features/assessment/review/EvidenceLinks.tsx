import type { ReviewDocumentLocator } from '../api/types.ts'
import { locatorLabel, uniqueLocators, type OnJump } from './evidence.ts'
import styles from './review.module.css'

// A11 검토 Wizard 공통 근거 버튼. PDF는 쪽 번호, HWP·HWPX는 분석 결과 documentLocator(section·path) 그대로.
// 버튼을 누르면 왼쪽 원문 영역이 그 쪽(PDF Viewer) 또는 그 문단·칸(구조 뷰어, 파란 강조)으로 이동한다.
// 근거가 없으면 없는 이유를 쓴다 — 위치를 만들지 않는다.

export function EvidenceLinks({
  pages,
  locators,
  name,
  onJump,
  max = 3,
  emptyText = '근거 없음',
  emptyReason = '분석 결과에 이 값의 원문 위치가 없어요. 원문에서 직접 확인해 주세요.',
  pageLabel = (page, index) => (index === 0 ? `원문 ${page}쪽` : `${page}쪽`),
  buttonClassName = styles.page,
}: {
  pages: number[]
  locators?: ReviewDocumentLocator[] | null
  name: string
  onJump: OnJump
  max?: number
  emptyText?: string
  emptyReason?: string
  pageLabel?: (page: number, index: number) => string
  buttonClassName?: string
}) {
  const structured = uniqueLocators(locators)
  if (pages.length === 0 && structured.length === 0) {
    return (
      <span className={styles.tiny} title={emptyReason} data-testid="evidence-none">
        {emptyText}
      </span>
    )
  }
  return (
    <>
      {pages.slice(0, max).map((page, index) => (
        <button key={`p${page}`} type="button" className={buttonClassName} onClick={() => onJump(page)} aria-label={`${name} 원문 ${page}쪽으로 이동`}>
          {pageLabel(page, index)}
        </button>
      ))}
      {structured.slice(0, max).map((locator, index) => (
        <button
          key={`l${locator.section}:${locator.path}`}
          type="button"
          className={buttonClassName}
          onClick={() => onJump({ section: locator.section, path: locator.path })}
          aria-label={`${name} 원문 위치(${locatorLabel(locator)})로 이동`}
          title={locatorLabel(locator)}
          data-testid="evidence-locator"
        >
          {/* 좁은 검토 열에서 값이 밀리지 않게 짧게 쓴다. 정확한 위치(구역·표·행·열)는 툴팁·읽기 이름에 있다 */}
          {index === 0 ? '원문 위치' : `위치 ${index + 1}`}
        </button>
      ))}
      {structured.length > max && <span className={styles.tiny}>외 {structured.length - max}곳</span>}
    </>
  )
}
