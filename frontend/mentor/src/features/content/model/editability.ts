import type { MentorContentListItem } from '../../../api/types.ts'
import { isInReview, isReviewRequired } from '../../../model/contentMeta.ts'

/**
 * 수정 가능 여부와 막힌 이유.
 * 검수 중 / 공개된 Record · Case의 수정 정책은 OD-05 미확정이라 막아 둔다. (검수 없이 공개 내용이 바뀌지 않게)
 * Fixture Adapter도 같은 경우를 409로 거절한다.
 */
export function editBlockedReason(item: Pick<MentorContentListItem, 'type' | 'status' | 'review'>): string | null {
  if (!isReviewRequired(item.type)) return null
  if (isInReview(item)) return '검수 중인 Record / Case는 검수가 끝날 때까지 수정할 수 없어요.'
  if (item.status === 'PUBLISHED') {
    return '공개된 Record / Case를 고친 뒤 다시 검수할지 아직 정해지지 않아 지금은 수정할 수 없어요.'
  }
  return null
}
