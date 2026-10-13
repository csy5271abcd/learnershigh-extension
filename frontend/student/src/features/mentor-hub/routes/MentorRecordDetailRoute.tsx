import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { createMentorRecordFixtureLoader, readRecordDetailFixtureScenario } from '../fixtures/mentorRecord.fixture.ts'
import { MentorRecordDetailPage } from '../MentorRecordDetailPage.tsx'
import { mentorProfilePath, mentorRecordListPath } from './paths.ts'
import { useMentorContentLink } from './useMentorContentLink.ts'

export function MentorRecordDetailRoute() {
  const { contentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const resolveContentLink = useMentorContentLink()

  // API 연결 전까지 Fixture를 Data Source로 쓴다. 개발 중에는 ?fixture=loading|error|not-found로 상태를 확인한다.
  const loadRecord = createMentorRecordFixtureLoader(
    import.meta.env.DEV ? readRecordDetailFixtureScenario(searchParams.toString()) : 'success',
  )

  // App 안에서 이동해 왔다면 History Back으로 이전 화면(Record 목록 검색 / Filter / Scroll, Home, Profile)을 복원한다.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(mentorRecordListPath)
  }

  return (
    <MentorRecordDetailPage
      contentId={contentId}
      loadRecord={loadRecord}
      onBack={goBack}
      onGoToRecordList={() => navigate(mentorRecordListPath)}
      onMentorSelect={(mentorId) => navigate(mentorProfilePath(mentorId))}
      resolveContentLink={resolveContentLink}
    />
  )
}
