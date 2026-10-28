import { ApiError } from './apiError.ts'
import { isMockDataSource } from './dataSource.ts'
import { getReferenceCatalogMock } from './mock/referenceLinksMock.ts'
import type { ReferenceCatalog } from './types.ts'

function httpNotConnected(): Promise<never> {
  return Promise.reject(
    new ApiError(503, { code: 'INTERNAL_ERROR', message: 'Assessment 서버 연결 전이에요. (Stage 2)', details: {} }),
  )
}

/**
 * 과목별 참고자료 자료원 카탈로그. **api-contract.md에 Endpoint가 없다** (P-24 PROPOSED).
 * Stage 1 Mock 전용이며, 서버 연결 시 Endpoint·Shape을 계약으로 정한 뒤 바꾼다.
 */
export function getReferenceCatalog(): Promise<ReferenceCatalog> {
  return isMockDataSource ? getReferenceCatalogMock() : httpNotConnected()
}
