import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  createSchoolActivityDetailLoader,
  createSchoolActivityService,
  readSchoolActivityActionScenario,
  readSchoolActivityLoadScenario,
} from '../fixtures/schoolActivity.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import { SchoolActivityDetailPage } from '../SchoolActivityDetailPage.tsx'
import { schoolActivitiesPath, schoolArchivePath, schoolEvidencePath, schoolTasksPath } from './paths.ts'

const isFromActivityList = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { fromActivityList?: boolean }).fromActivityList === true

// Growth Activity Detail. 목록에서 왔으면 돌아가기를 History Back으로 처리해 검색 / 유형 / Scroll을 복원한다.
// 개발용 ?fixture=loading | error | activity-save-fail-once | activity-submit-fail-once | activity-evidence-add-fail-once | activity-evidence-delete-fail-once
export function SchoolActivityDetailRoute() {
  const { activityId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  // 기록 / 자료가 바뀌면 다시 그려 Loader(저장소 revision)가 바뀐 값을 읽게 한다.
  const [, setRevision] = useState(0)

  const loadDetail = createSchoolActivityDetailLoader(import.meta.env.DEV ? readSchoolActivityLoadScenario(search) : 'success')
  const service = createSchoolActivityService(import.meta.env.DEV ? readSchoolActivityActionScenario(search) : 'success')

  return (
    <SchoolActivityDetailPage
      activityId={activityId}
      loadDetail={loadDetail}
      service={service}
      onChanged={() => setRevision((value) => value + 1)}
      onBack={() => {
        if (isFromActivityList(location.state)) navigate(-1)
        else navigate(schoolActivitiesPath)
      }}
      backLabel="나의 활동 기록으로 돌아가기"
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
