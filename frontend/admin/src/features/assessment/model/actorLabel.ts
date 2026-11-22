import { devPanelEnabled } from '../../../../../student/src/features/assessment/dev/devContext.ts'

// A27-UX: 등록·검토·확정 기록의 관리자 식별자(reviewedBy·createdBy 등)는 내부 계정 ID다.
// 실제 LearnersHigh 인증 연동(API-OD-A01) 전에는 표시 이름을 얻을 수 없으므로 화면에는 '관리자'로만 보인다.
// 감사 추적용 원래 ID는 서버 기록에 그대로 있고, 개발자 진단 모드(?devPanel=1)에서만 함께 보인다.
export function actorLabel(actorId: string | null | undefined): string {
  if (!actorId) return '관리자'
  return devPanelEnabled() ? `관리자 (${actorId})` : '관리자'
}
