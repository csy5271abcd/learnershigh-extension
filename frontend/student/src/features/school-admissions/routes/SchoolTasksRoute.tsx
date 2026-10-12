import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { createSchoolTaskCreateFixtureService, readSchoolTaskCreateFixtureScenario } from '../fixtures/schoolTaskCreate.fixture.ts'
import {
  createSchoolTaskListFixtureLoader,
  readSchoolTaskListFixtureScenario,
  SCHOOL_SNAPSHOT_DATE,
  schoolStudentContext,
} from '../fixtures/schoolTasks.fixture.ts'
import { parseTaskListFilter, type TaskListFilter } from '../model/tasks.ts'
import { SchoolTasksPage } from '../SchoolTasksPage.tsx'
import { createModalParam, schoolActivitiesPath, schoolArchivePath, schoolEvidencePath, schoolTaskPath, schoolTasksPath } from './paths.ts'
import { SchoolTaskCreateModal } from './SchoolTaskCreateModal.tsx'
import type { SchoolTaskDetailEntryState } from './SchoolTaskDetailRoute.tsx'

/** 수행평가 등록 Modal을 이 화면에서 열었다는 표시 (닫을 때 History Back으로 되돌린다) */
interface CreateModalEntryState {
  createModalOpenedHere: true
}

const isOpenedHere = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as Partial<CreateModalEntryState>).createModalOpenedHere === true

const createTriggerId = 'school-task-create-trigger'

// School Home = Tasks. Filter는 URL(?filter=)에 두어 새로고침 / Back 후에도 유지한다.
// 수행평가 등록은 이 화면 위 Modal(?create=1)이다. 뒤의 목록 / Filter / Scroll은 그대로 둔다.
// Scroll은 App Shell의 ScrollRestoration이 복원한다. 개발용 ?fixture=는 함께 써도 된다.
export function SchoolTasksRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseTaskListFilter(searchParams.get('filter'))
  const createOpen = searchParams.has(createModalParam)
  const [createdTaskId, setCreatedTaskId] = useState<string>()

  // 등록하면 목록 Loader가 바뀌어 새 Task를 포함해 다시 불러온다.
  const loadList = createSchoolTaskListFixtureLoader(
    import.meta.env.DEV ? readSchoolTaskListFixtureScenario(searchParams.toString()) : 'success',
  )
  const createTask = createSchoolTaskCreateFixtureService(
    import.meta.env.DEV ? readSchoolTaskCreateFixtureScenario(searchParams.toString()) : 'success',
  )

  const changeFilter = (next: TaskListFilter) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next === 'all') params.delete('filter')
        else params.set('filter', next)
        return params
      },
      // Filter 전환마다 History가 쌓이지 않도록 현재 Entry를 바꾼다.
      { replace: true, preventScrollReset: true },
    )
  }

  const openCreate = () => {
    setCreatedTaskId(undefined)
    const params = new URLSearchParams(searchParams)
    params.set(createModalParam, '1')
    const state: CreateModalEntryState = { createModalOpenedHere: true }
    // History에 남겨 Browser Back으로 Modal이 닫히게 한다.
    navigate({ search: `?${params.toString()}` }, { state, preventScrollReset: true })
  }

  const closeCreate = (taskId?: string) => {
    if (taskId) setCreatedTaskId(taskId)
    if (isOpenedHere(location.state)) navigate(-1)
    else
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.delete(createModalParam)
          return params
        },
        { replace: true, preventScrollReset: true },
      )
  }

  // Modal이 등록 없이 닫히면 "수행평가 등록" 버튼으로 Focus를 돌려준다. (등록했으면 목록이 새 Task로 옮긴다)
  // 화면을 처음 열 때는 Focus를 옮기지 않는다.
  const wasOpenRef = useRef(createOpen)
  useEffect(() => {
    if (wasOpenRef.current && !createOpen && !createdTaskId) document.getElementById(createTriggerId)?.focus({ preventScroll: true })
    wasOpenRef.current = createOpen
  }, [createOpen, createdTaskId])

  return (
    <>
      <SchoolTasksPage
        loadList={loadList}
        filter={filter}
        onFilterChange={changeFilter}
        onTaskSelect={(taskId) => {
          const state: SchoolTaskDetailEntryState = { fromTaskList: true, backTo: 'tasks' }
          navigate(schoolTaskPath(taskId), { state })
        }}
        onCreateTask={openCreate}
        createTriggerId={createTriggerId}
        createdTaskId={createOpen ? undefined : createdTaskId}
        studentGrade={schoolStudentContext.grade}
        onSectionSelect={(id) => {
          // 화면이 있는 Section은 Tasks / Evidence / Archive다.
          if (id === 'tasks') navigate(schoolTasksPath)
          else if (id === 'activities') navigate(schoolActivitiesPath)
          else if (id === 'evidence') navigate(schoolEvidencePath)
          else if (id === 'archive') navigate(schoolArchivePath)
        }}
      />
      {createOpen && <SchoolTaskCreateModal createTask={createTask} snapshotDate={SCHOOL_SNAPSHOT_DATE} onClose={closeCreate} />}
    </>
  )
}
