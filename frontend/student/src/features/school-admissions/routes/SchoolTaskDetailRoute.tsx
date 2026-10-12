import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { mentorCasePath } from '../../mentor-hub/routes/paths.ts'
import { createSchoolTaskDetailFixtureLoader, readSchoolTaskDetailFixtureScenario } from '../fixtures/schoolTaskDetail.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import { parseTaskDetailTab, type TaskDetailTabId } from '../model/taskDetail.ts'
import { SchoolTaskDetailPage } from '../SchoolTaskDetailPage.tsx'
import { schoolTasksPath } from './paths.ts'

/** Tasks 목록에서 Detail로 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 목록의 Filter / Scroll을 복원한다. */
export interface SchoolTaskDetailEntryState {
  fromTaskList: true
}

const isFromTaskList = (state: unknown): state is SchoolTaskDetailEntryState =>
  typeof state === 'object' && state !== null && (state as Partial<SchoolTaskDetailEntryState>).fromTaskList === true

// Task Detail. 선택 Tab(?tab=)과 수정 기록 Version Pair(?from=&to=)를 URL에 두어 새로고침 / Mentor Case 왕복 후에도 유지한다.
// Tab 전환은 History를 쌓지 않는다. (Back은 이전 화면으로) Scroll은 App Shell의 ScrollRestoration이 복원한다.
export function SchoolTaskDetailRoute() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTaskDetailTab(searchParams.get('tab'))

  const loadDetail = createSchoolTaskDetailFixtureLoader(
    import.meta.env.DEV ? readSchoolTaskDetailFixtureScenario(searchParams.toString()) : 'success',
  )

  const updateParams = (apply: (params: URLSearchParams) => void) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        apply(params)
        return params
      },
      // 목록에서 들어왔다는 표시(state)를 유지해야 돌아가기가 목록 상태를 복원한다.
      { replace: true, preventScrollReset: true, state: location.state },
    )
  }

  const changeTab = (next: TaskDetailTabId) =>
    updateParams((params) => {
      if (next === 'overview') params.delete('tab')
      else params.set('tab', next)
    })

  return (
    <SchoolTaskDetailPage
      taskId={taskId}
      loadDetail={loadDetail}
      tab={tab}
      fromVersionParam={searchParams.get('from')}
      toVersionParam={searchParams.get('to')}
      onTabChange={changeTab}
      onCompareVersions={(from, to) =>
        updateParams((params) => {
          params.set('tab', 'revision')
          params.set('from', from)
          params.set('to', to)
        })
      }
      onBackToTasks={() => {
        if (isFromTaskList(location.state)) navigate(-1)
        else navigate(schoolTasksPath)
      }}
      // 기존 Mentor Activity Case Detail로 이동한다. Back하면 이 Task의 같은 Tab / Scroll로 돌아온다.
      onMentorCaseOpen={(contentId) => navigate(mentorCasePath(contentId))}
      studentGrade={schoolStudentContext.grade}
      onSectionSelect={(id) => {
        if (id === 'tasks') navigate(schoolTasksPath)
      }}
    />
  )
}
