// 노트 자동 저장 시점 (Mock 전용). 자동 저장 주기·Revision 단위는 계약 미정(API-OD-A04)이라 여기 한 곳에만 둔다.
// 서버 정책이 정해지면 이 값을 바꾸거나 저장 트리거 자체를 교체한다.

/** 마지막 입력 뒤 이 시간 동안 더 입력이 없으면 저장한다 */
export const mockAutosaveDelayMs = 1500
