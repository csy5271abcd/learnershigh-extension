import ui from '../components/AdminUi.module.css'
import { StudentCarePage } from '../features/student-care/StudentCarePage.tsx'
import styles from './StudentCareRoute.module.css'

/*
 * 학생 케어(Wangyu, features/student-care) 통합 Route Wrapper — Shared Shell 영역
 * - AdminShell 안의 Main Content에 Wangyu StudentCarePage를 그대로 렌더링한다. (Feature 내부 Logic · Component · API · CSS 수정 없음)
 * - Wangyu 개발용 App Shell(별도 Header / Breadcrumb)은 쓰지 않고, 화면 제목은 다른 Admin 화면과 같은 위치 · 형식으로 둔다.
 * - Wangyu 화면은 회색 배경(--color-background) 위 흰 카드(--color-surface)를 전제로 하므로, 이 영역에만 그 배경을 둔다. (body 전역은 Suyeon Shell 그대로)
 * - 지점 선택 · 탭 · 학생 상세 같은 Feature 내부 상태는 StudentCarePage가 관리한다. (주소 Query 연동 없음)
 */

export const studentCarePath = '/student-care'

export function StudentCareRoute() {
  return (
    <div className={ui.page}>
      <header className={ui.headerText}>
        <h1 className={ui.title}>학생 케어</h1>
        <p className={ui.lead}>평소와 달라진 학생을 찾아 사유를 확인하고, 약속을 정한 뒤 같은 기준으로 다시 확인해요.</p>
      </header>
      <div className={styles.surface}>
        <StudentCarePage />
      </div>
    </div>
  )
}
