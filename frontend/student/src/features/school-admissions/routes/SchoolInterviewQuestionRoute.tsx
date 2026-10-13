import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  createSchoolInterviewDetailLoader,
  createSchoolInterviewService,
  readSchoolInterviewActionScenario,
  readSchoolInterviewLoadScenario,
} from '../fixtures/schoolInterview.fixture.ts'
import { isInterviewEligible } from '../model/interview.ts'
import { useSchoolStudentGrade } from '../model/useSchoolStudentGrade.ts'
import { SchoolInterviewQuestionPage } from '../SchoolInterviewQuestionPage.tsx'
import { schoolActivityPath, schoolInterviewPath, schoolTasksPath } from './paths.ts'
import type { SchoolActivityDetailEntryState } from './SchoolActivitiesRoute.tsx'

const isFromInterviewList = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { fromInterviewList?: boolean }).fromInterviewList === true

// Interview Question Detail. 관련 활동 → Activity Detail → 돌아가기(History Back)로 이 질문에 돌아온다.
// 개발용 ?fixtureStudentGrade=3 · ?fixture=loading | error | related-missing | interview-answer-fail-once | interview-practice-fail-once
export function SchoolInterviewQuestionRoute() {
  const { questionId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  const grade = useSchoolStudentGrade()
  // 답변 / 연습 상태가 바뀌면 다시 그려 Loader(저장소 revision)가 바뀐 값을 읽게 한다.
  const [, setRevision] = useState(0)

  const loadDetail = createSchoolInterviewDetailLoader(import.meta.env.DEV ? readSchoolInterviewLoadScenario(search) : 'success', grade)
  const service = createSchoolInterviewService(import.meta.env.DEV ? readSchoolInterviewActionScenario(search) : 'success')

  return (
    <SchoolInterviewQuestionPage
      questionId={questionId}
      eligible={isInterviewEligible(grade)}
      loadDetail={loadDetail}
      service={service}
      onChanged={() => setRevision((value) => value + 1)}
      onBack={() => {
        if (isFromInterviewList(location.state)) navigate(-1)
        else navigate(schoolInterviewPath)
      }}
      onOpenActivity={(activityId) => {
        const state: SchoolActivityDetailEntryState = { fromInterview: true }
        navigate(schoolActivityPath(activityId), { state })
      }}
      onGoTasks={() => navigate(schoolTasksPath)}
    />
  )
}
