import { StudentGlobalNavigation } from './components/student-navigation/StudentGlobalNavigation.tsx'
import { MentorHubHomePage } from './features/mentor-hub/MentorHubHomePage.tsx'
import {
  createMentorHubHomeFixtureLoader,
  mentorHubHomeFixture,
  readFixtureScenario,
} from './features/mentor-hub/fixtures/mentorHubHome.fixture.ts'

// Router가 아직 없어 Mentor Hub Home을 바로 렌더링하고, Global Navigation은 Mentor를 Active로 표시한다.
// API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=empty|loading|error로 상태를 확인한다.
const loadMentorHubHome = createMentorHubHomeFixtureLoader(
  import.meta.env.DEV ? readFixtureScenario(window.location.search) : 'success',
)

// 인증 / 사용자 Model이 없어 Navigation 표시용 이름은 Fixture 값을 재사용한다.
const studentDisplayName = mentorHubHomeFixture.studentContext.displayName

function App() {
  return (
    <>
      <StudentGlobalNavigation activeItem="mentor" userDisplayName={studentDisplayName} />
      <MentorHubHomePage loadHome={loadMentorHubHome} />
    </>
  )
}

export default App
