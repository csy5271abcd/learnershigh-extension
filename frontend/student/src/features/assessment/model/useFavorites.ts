import { useCallback, useMemo, useRef, useState } from 'react'
import { toApiError } from '../api/apiError.ts'
import { listArchive, setArchiveFavorite } from '../api/growthArchiveApi.ts'
import type { ArchiveSourceType } from '../api/types.ts'
import { useAssessmentWorkspace } from './assessmentWorkspace.ts'
import { useApiQuery } from './useApiQuery.ts'

const favoritesPageSize = 200

export const favoriteKey = (sourceType: ArchiveSourceType, sourceId: string) => `${sourceType}:${sourceId}`

export interface FavoritesState {
  /** 즐겨찾기 목록을 아직 못 받았거나 실패했으면 undefined (별표를 누를 수 없게 한다) */
  isFavorite: (sourceType: ArchiveSourceType, sourceId: string) => boolean | undefined
  pendingKey: string | undefined
  /** 결과 문장을 돌려준다. 실패하면 Error를 던진다 (메시지·코드 포함). */
  toggle: (sourceType: ArchiveSourceType, sourceId: string) => Promise<string>
  ready: boolean
}

/**
 * 즐겨찾기 상태는 보관함 Projection(§30 GET tab=favorites)에서만 읽는다. 화면별로 따로 저장하지 않아
 * 목록·상세·내 탐구·라이브러리·보관함이 같은 값을 본다. 바꾸면 §30 PUT 후 dataVersion을 올려 모두 다시 조회한다.
 * SCHOOL_ASSESSMENT 외 유형은 Mock 전용 제안(P-22)이다.
 */
export function useFavorites(): FavoritesState {
  const { dataVersion, notifyDataChanged } = useAssessmentWorkspace()
  const favorites = useApiQuery(`favorites|${dataVersion}`, () => listArchive({ tab: 'favorites', page: 0, size: favoritesPageSize }))
  const [pendingKey, setPendingKey] = useState<string>()
  const pendingRef = useRef(false)
  const items = favorites.data?.items
  const keys = useMemo(() => (items ? new Set(items.map((item) => favoriteKey(item.sourceType, item.sourceId))) : undefined), [items])

  const isFavorite = useCallback(
    (sourceType: ArchiveSourceType, sourceId: string) => (keys ? keys.has(favoriteKey(sourceType, sourceId)) : undefined),
    [keys],
  )

  const toggle = useCallback(
    async (sourceType: ArchiveSourceType, sourceId: string) => {
      const current = keys?.has(favoriteKey(sourceType, sourceId))
      if (current === undefined || pendingRef.current) return ''
      pendingRef.current = true
      setPendingKey(favoriteKey(sourceType, sourceId))
      try {
        await setArchiveFavorite({ sourceType, sourceId, favorite: !current })
        notifyDataChanged()
        return current ? '즐겨찾기에서 뺐어요. 원본 기록은 그대로예요.' : '즐겨찾기에 추가했어요.'
      } catch (caught) {
        const apiError = toApiError(caught)
        throw new Error(`${apiError.message} (${apiError.code})`, { cause: caught })
      } finally {
        pendingRef.current = false
        setPendingKey(undefined)
      }
    },
    [keys, notifyDataChanged],
  )

  return { isFavorite, pendingKey, toggle, ready: Boolean(keys) }
}
