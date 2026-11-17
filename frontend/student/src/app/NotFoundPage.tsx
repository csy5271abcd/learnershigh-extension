import { useNavigate } from 'react-router'
import { assessmentPath } from '../features/assessment/routes/paths.ts'
import styles from './NotFoundPage.module.css'

// 정의되지 않은 Extension 개발 Route에 들어온 경우 (제거된 Mentor Hub·School Activity 주소 포함)
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main className={styles.page}>
      <div className={styles.notice}>
        <h1 className={styles.title}>페이지를 찾을 수 없어요.</h1>
        <p className={styles.description}>주소를 다시 확인해 주세요.</p>
        <button type="button" className={styles.button} onClick={() => navigate(assessmentPath)}>
          Assessment 홈으로 이동
        </button>
      </div>
    </main>
  )
}
