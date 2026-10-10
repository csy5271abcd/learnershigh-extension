import { useNavigate } from 'react-router'
import homeStyles from '../features/mentor-hub/MentorHubHomePage.module.css'
import { mentorHubPath } from '../features/mentor-hub/routes/paths.ts'

// 정의되지 않은 Extension 개발 Route에 들어온 경우
export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <main className={homeStyles.page}>
      <div className={homeStyles.errorNotice}>
        <h1 className={homeStyles.errorTitle}>페이지를 찾을 수 없어요.</h1>
        <p className={homeStyles.errorDescription}>주소를 다시 확인해 주세요.</p>
        <button type="button" className={homeStyles.retryButton} onClick={() => navigate(mentorHubPath)}>
          Mentor Hub로 이동
        </button>
      </div>
    </main>
  )
}
