import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  applyActivityFeedbackFixture,
  createSchoolActivityDetailLoader,
  createSchoolActivityService,
  readSchoolActivityActionScenario,
  readActivityFeedbackFixture,
  readSchoolActivityLoadScenario,
} from '../fixtures/schoolActivity.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import { SchoolActivityDetailPage } from '../SchoolActivityDetailPage.tsx'
import { schoolActivitiesPath, schoolArchivePath, schoolEvidencePath, schoolTasksPath } from './paths.ts'

const isFromActivityList = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { fromActivityList?: boolean }).fromActivityList === true
const isFromArchive = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { fromArchive?: boolean }).fromArchive === true

// Growth Activity Detail. 목록에서 왔으면 돌아가기를 History Back으로 처리해 검색 / 유형 / Scroll을 복원한다.
// 개발용 ?fixture=loading | error | activity-*-fail-once (save · submit · evidence-add · evidence-delete · reflection · feedback-request · archive)
export function SchoolActivityDetailRoute() {
  const { activityId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.toString()
  // 기록 / 자료가 바뀌면 다시 그려 Loader(저장소 revision)가 바뀐 값을 읽게 한다.
  const [, setRevision] = useState(0)

  // 개발용: 선생님 활동 피드백 전달 재현 (?fixtureActivityFeedback=delivered). 공용 Activity Feedback Queue의 Admin 결과이므로
  // Student 화면에는 버튼이 없다. 피드백 대기 중인 활동에 적용한 뒤 주소에서 지운다.
  const feedbackFixture = import.meta.env.DEV && readActivityFeedbackFixture(search)
  useEffect(() => {
    if (!feedbackFixture) return
    // 주소를 바꾸면 다시 그려지고, 저장소 revision이 바뀌어 Loader가 새 값을 읽는다.
    applyActivityFeedbackFixture(activityId)
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.delete('fixtureActivityFeedback')
        return params
      },
      { replace: true, preventScrollReset: true, state: location.state },
    )
  }, [feedbackFixture, activityId, setSearchParams, location.state])

  const loadDetail = createSchoolActivityDetailLoader(import.meta.env.DEV ? readSchoolActivityLoadScenario(search) : 'success')
  const service = createSchoolActivityService(import.meta.env.DEV ? readSchoolActivityActionScenario(search) : 'success')

  return (
    <SchoolActivityDetailPage
      activityId={activityId}
      loadDetail={loadDetail}
      service={service}
      onChanged={() => setRevision((value) => value + 1)}
      onBack={() => {
        if (isFromActivityList(location.state) || isFromArchive(location.state)) navigate(-1)
        else navigate(schoolActivitiesPath)
      }}
      // 돌아가기 문구 = 실제로 돌아갈 곳
      backTo={isFromArchive(location.state) ? 'archive' : 'activities'}
      studentGrade={schoolStudentContext.grade}
      onSectionSelect={(id) => {
        if (id === 'tasks') navigate(schoolTasksPath)
        else if (id === 'activities') navigate(schoolActivitiesPath)
        else if (id === 'evidence') navigate(schoolEvidencePath)
        else if (id === 'archive') navigate(schoolArchivePath)
      }}
    />
  )
}
