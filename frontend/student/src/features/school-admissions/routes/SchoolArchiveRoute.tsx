import { useNavigate, useSearchParams } from 'react-router'
import { createSchoolArchiveFixtureLoader, readSchoolArchiveFixtureScenario } from '../fixtures/schoolArchive.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import type { ArchiveSourceFilter } from '../model/types.ts'
import { SchoolArchivePage } from '../SchoolArchivePage.tsx'
import { schoolEvidencePath, schoolTaskPath, schoolTasksPath } from './paths.ts'
import type { SchoolTaskDetailEntryState } from './SchoolTaskDetailRoute.tsx'

const parseSource = (value: string | null): ArchiveSourceFilter => (value === 'task' || value === 'growth' ? value : 'all')

// School Archive. 검색(?query=) / 출처(?source=)는 URL에 둔다. (바꿀 때 History를 쌓지 않는다)
// 카드에서 원본 Task Detail로 가고, Detail의 돌아가기 / Browser Back은 History Back이라 검색 · 출처 · Scroll이 복원된다.
// 개발용 ?fixture=loading | error | empty
export function SchoolArchiveRoute() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const source = parseSource(searchParams.get('source'))
  const query = searchParams.get('query') ?? ''
  const loadArchive = createSchoolArchiveFixtureLoader(
    import.meta.env.DEV ? readSchoolArchiveFixtureScenario(searchParams.toString()) : 'success',
  )

  const updateParams = (apply: (params: URLSearchParams) => void) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        apply(params)
        return params
      },
      { replace: true, preventScrollReset: true },
    )

  return (
    <SchoolArchivePage
      loadArchive={loadArchive}
      source={source}
      query={query}
      onSourceChange={(next) =>
        updateParams((params) => {
          if (next === 'all') params.delete('source')
          else params.set('source', next)
        })
      }
      onQueryChange={(next) =>
        updateParams((params) => {
          if (next) params.set('query', next)
          else params.delete('query')
        })
      }
      onReset={() =>
        updateParams((params) => {
          params.delete('query')
          params.delete('source')
        })
      }
      onItemOpen={(item) => {
        // 지금은 Task만 원본이 있다. (Growth Activity Detail은 Growth Activity Branch에서 연결)
        if (item.source !== 'task') return
        const state: SchoolTaskDetailEntryState = { fromTaskList: true, backTo: 'archive' }
        navigate(schoolTaskPath(item.sourceId), { state })
      }}
      studentGrade={schoolStudentContext.grade}
      onSectionSelect={(id) => {
        if (id === 'tasks') navigate(schoolTasksPath)
        else if (id === 'evidence') navigate(schoolEvidencePath)
      }}
    />
  )
}
