import { getReferenceCatalogContent } from '../content/enrichmentContent.ts'
import type { ReferenceCatalog } from './types.ts'

/**
 * 과목별 참고자료 자료원 카탈로그. **api-contract.md에 Endpoint가 없다** (P-24 PROPOSED).
 * 2026-11-11: 공식 자료원 사이트·채널 목록인 정적 참고자료로 바꿨다(content/enrichmentContent.ts). dataSource와 무관하다.
 * 서버로 옮기려면 Endpoint·Shape을 계약으로 먼저 정한다.
 */
export function getReferenceCatalog(): Promise<ReferenceCatalog> {
  return Promise.resolve(getReferenceCatalogContent())
}
