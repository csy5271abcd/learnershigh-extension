import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { createSchoolInterviewListLoader, readSchoolInterviewLoadScenario } from '../fixtures/schoolInterview.fixture.ts'
import { isInterviewEligible } from '../model/interview.ts'
import { useSchoolStudentGrade } from '../model/useSchoolStudentGrade.ts'
import { SchoolInterviewPage } from '../SchoolInterviewPage.tsx'
import { schoolArchivePath, schoolInterviewQuestionPath, schoolTasksPath } from './paths.ts'

/** Archive의 "면접 준비"에서 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 Archive 검색 · Scroll을 복원한다. */
export interface SchoolInterviewEntryState {
  fromArchive: true
}

const isFromArchive = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { fromArchive?: boolean }).fromArchive === true

/** Interview 목록에서 질문으로 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 목록 Scroll을 복원한다. */
export interface SchoolInterviewQuestionEntryState {
  fromInterviewList: true
}

// Interview Bridge 목록 (Archive "면접 준비"에서 들어오는 보조 화면, School 1차 Navigation 없음). 고3이 아니면 질문을 읽지 않고 비대상 안내만 보여준다. (Redirect하지 않는다)
// 개발용 ?fixtureStudentGrade=3 (고3 Eligibility 재현) · ?fixture=loading | error | empty | related-missing
export function SchoolInterviewRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const grade = useSchoolStudentGrade()
  const scenario = import.meta.env.DEV ? readSchoolInterviewLoadScenario(searchParams.toString()) : 'success'
  const loadList = createSchoolInterviewListLoader(scenario, grade)

  return (
    <SchoolInterviewPage
      eligible={isInterviewEligible(grade)}
      loadList={loadList}
      cacheKey={`${scenario}|${grade}`}
      onOpen={(questionId) => {
        const state: SchoolInterviewQuestionEntryState = { fromInterviewList: true }
        navigate(schoolInterviewQuestionPath(questionId), { state })
      }}
      onGoTasks={() => navigate(schoolTasksPath)}
      onBack={() => {
        if (isFromArchive(location.state)) navigate(-1)
        else navigate(schoolArchivePath)
      }}
    />
  )
}
