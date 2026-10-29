import type {CareCase, CareEvent} from './types.ts'

/**
 * 한 관리 건의 진행 순서(오래된 것 → 최신).
 * 같은 요청에서 만든 이벤트는 날짜·시각이 같을 수 있으므로 날짜로 다시 정렬하지 않는다.
 * 건 정보가 있으면 엔티티 sequence 순서(events)를 그대로 쓰고,
 * 없으면 API 최신순 목록(같은 시각이면 나중 기록이 먼저)을 뒤집는다.
 */
export function caseTimeline<T extends CareEvent>(newestFirst:readonly T[],caseId:string,context?:Pick<CareCase,'events'>):CareEvent[]{
 if(context?.events?.length)return context.events
 return newestFirst.filter(event=>event.caseId===caseId).slice().reverse()
}
