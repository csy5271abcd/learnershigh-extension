import { useNavigate, useSearchParams } from 'react-router'
import {
  createSchoolTaskListFixtureLoader,
  readSchoolTaskListFixtureScenario,
  schoolStudentContext,
} from '../fixtures/schoolTasks.fixture.ts'
import { parseTaskListFilter, type TaskListFilter } from '../model/tasks.ts'
import { SchoolTasksPage } from '../SchoolTasksPage.tsx'
import { schoolTasksPath } from './paths.ts'

// School Home = Tasks. Filter는 URL(?filter=)에 두어 새로고침 / Back 후에도 유지한다.
// Scroll은 App Shell의 ScrollRestoration이 복원한다. 개발용 ?fixture=는 함께 써도 된다.
export function SchoolTasksRoute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseTaskListFilter(searchParams.get('filter'))

  const loadList = createSchoolTaskListFixtureLoader(
    import.meta.env.DEV ? readSchoolTaskListFixtureScenario(searchParams.toString()) : 'success',
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

  return (
    <SchoolTasksPage
      loadList={loadList}
      filter={filter}
      onFilterChange={changeFilter}
      studentGrade={schoolStudentContext.grade}
      onSectionSelect={(id) => {
        // 이 Branch에서 화면이 있는 Section은 Tasks뿐이다.
        if (id === 'tasks') navigate(schoolTasksPath)
      }}
    />
  )
}
