import ui from '../components/AdminUi.module.css'
import { StudentCarePage } from '../features/student-care/StudentCarePage.tsx'
import styles from './StudentCareRoute.module.css'

/*
 * 학생 케어(Wangyu, features/student-care) 통합 Route Wrapper — Shared Shell 영역
 * - AdminShell 안의 Main Content에 Wangyu StudentCarePage를 그대로 렌더링한다. (Feature 내부 Logic · Component · API · CSS 수정 없음)
 * - 화면 제목(h1 "학생 케어") · 지점 선택 · 기준 설정은 StudentCarePage가 직접 그린다. 이 Wrapper는 제목을 따로 두지 않는다. (h1 중복 방지)
 *   Shell 위치 정보(Breadcrumb / 현재 메뉴)는 AdminShell이 맡는다.
 * - Wangyu 화면은 회색 배경(--color-background, app/theme.css) 위 흰 카드(--color-surface)를 전제로 하므로, 이 영역에만 그 배경을 둔다. (body 전역은 Suyeon Shell 그대로)
 * - 학생 선택 같은 Feature 내부 상태는 StudentCarePage가 관리한다. (주소 Query 연동 없음)
 */

export const studentCarePath = '/student-care'

export function StudentCareRoute() {
  return (
    <div className={ui.page}>
      <div className={styles.surface}>
        <StudentCarePage />
      </div>
    </div>
  )
}
