import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  createSchoolEvidenceFixtureService,
  createSchoolEvidenceListFixtureLoader,
  readSchoolEvidenceFixtureScenario,
  readSchoolEvidenceListFixtureScenario,
} from '../fixtures/schoolEvidence.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import { SchoolEvidencePage } from '../SchoolEvidencePage.tsx'
import { schoolActivitiesPath, schoolArchivePath, schoolTaskPath, schoolTasksPath } from './paths.ts'
import type { SchoolTaskDetailEntryState } from './SchoolTaskDetailRoute.tsx'

// School Evidence. Task 제목을 누르면 그 Task Detail의 과정 자료 Tab으로 간다.
// Detail의 돌아가기 / Browser Back은 History Back이라 이 목록의 Scroll로 돌아온다. (App Shell ScrollRestoration)
// 개발용 ?fixture=loading | error | empty | evidence-add-fail-once | evidence-delete-fail-once
export function SchoolEvidenceRoute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // 자료가 바뀌면 다시 그려 Loader(저장소 revision)가 바뀐 값을 읽게 한다.
  const [, setEvidenceRevision] = useState(0)
  const search = searchParams.toString()

  const loadList = createSchoolEvidenceListFixtureLoader(import.meta.env.DEV ? readSchoolEvidenceListFixtureScenario(search) : 'success')
  const evidenceService = createSchoolEvidenceFixtureService(import.meta.env.DEV ? readSchoolEvidenceFixtureScenario(search) : 'success')

  return (
    <SchoolEvidencePage
      loadList={loadList}
      evidenceService={evidenceService}
      onEvidenceChanged={() => setEvidenceRevision((value) => value + 1)}
      onTaskOpen={(taskId) => {
        // 목록에서 왔다는 표시: Detail의 돌아가기가 History Back으로 이 화면을 복원한다.
        const state: SchoolTaskDetailEntryState = { fromTaskList: true, backTo: 'evidence' }
        navigate(`${schoolTaskPath(taskId)}?tab=process`, { state })
      }}
      studentGrade={schoolStudentContext.grade}
      onSectionSelect={(id) => {
        if (id === 'tasks') navigate(schoolTasksPath)
        else if (id === 'activities') navigate(schoolActivitiesPath)
        else if (id === 'archive') navigate(schoolArchivePath)
      }}
    />
  )
}
