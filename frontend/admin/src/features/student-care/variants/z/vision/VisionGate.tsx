// 사진 관찰 서비스 연결 상태 안내. 인증 실패·권한 없음·연결 실패를 빈 자료와 구분해 보인다(연동 실패를 빈 데이터로 숨기지 않음).
// 화면에 별도 로그인은 없다. 관리자 세션 하나로 두 서비스를 쓴다.
import type { VisionWeek } from './useVisionWeek.ts'

export function VisionGate({ week }: { week: VisionWeek }) {
  if (week.status === 'loading' || week.status === 'idle') return <p className="z-vg" role="status">사진 관찰 불러오는 중</p>
  if (week.status === 'forbidden') return <p className="z-vg" role="alert">이 학습관의 사진 관찰을 볼 권한이 없습니다</p>
  if (week.status === 'error' || week.status === 'unauthenticated') return <p className="z-vg" role="alert">사진 관찰 서비스에 연결하지 못했습니다 <button type="button" className="sc-button z-vg-btn" onClick={week.reload}>다시 시도</button></p>
  return null
}
