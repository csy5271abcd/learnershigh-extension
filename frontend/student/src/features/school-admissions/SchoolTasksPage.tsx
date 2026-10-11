import { SchoolLayout, type SchoolSectionId } from './components/SchoolLayout.tsx'
import { SchoolTaskRow } from './components/SchoolTaskRow.tsx'
import styles from './SchoolTasksPage.module.css'
import { matchesTaskFilter, taskListFilters, type TaskListFilter } from './model/tasks.ts'
import type { StudentTaskListResult } from './model/types.ts'
import { useSchoolTaskList } from './model/useSchoolTaskList.ts'

interface SchoolTasksPageProps {
  /** Data Source Boundary. 현재는 Fixture Loader, API 연결 시 GET /api/student/tasks. */
  loadList: () => Promise<StudentTaskListResult>
  /** Filter는 호출 측(Route, URL ?filter=)이 소유해 새로고침 / 다른 화면 왕복 후에도 유지한다. */
  filter: TaskListFilter
  onFilterChange: (filter: TaskListFilter) => void
  studentGrade: string
  onSectionSelect: (id: SchoolSectionId) => void
}

// School Home = Tasks 목록 (Tasks-00 Mockup)
// 학생이 빠르게 파악할 것: 어떤 Task / 과목 / 현재 단계 / 상태 / 마감 / 다음 할 일. (KPI 화면이 아니다)
export function SchoolTasksPage({ loadList, filter, onFilterChange, studentGrade, onSectionSelect }: SchoolTasksPageProps) {
  const { state, reload } = useSchoolTaskList(loadList)

  return (
    <SchoolLayout current="tasks" studentGrade={studentGrade} onSectionSelect={onSectionSelect} busy={state.status === 'loading'}>
      <section className={styles.createBanner} aria-labelledby="school-task-create-heading">
        <div className={styles.createText}>
          <h2 id="school-task-create-heading" className={styles.createTitle}>
            새 수행평가를 받았나요?
          </h2>
          <p className={styles.createDescription}>안내문을 올리고 평가 기준을 정리하면 8단계로 관리할 수 있어요.</p>
        </div>
        {/* Task Create 화면은 다음 작업이다. 가짜 Form / 완료 안내를 만들지 않는다. */}
        <div className={styles.createAction}>
          <button type="button" className={styles.createButton} disabled aria-describedby="school-task-create-unavailable">
            수행평가 등록
          </button>
          <span id="school-task-create-unavailable" className={styles.createUnavailable}>
            등록 화면 준비 중
          </span>
        </div>
      </section>

      <section className={styles.list} aria-labelledby="school-tasks-heading">
        <h2 id="school-tasks-heading" className="lh-visually-hidden">
          수행평가 목록
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              수행평가를 불러오는 중이에요.
            </p>
            <div className={styles.skeleton} aria-hidden="true">
              <span className={styles.skeletonChips} />
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} className={styles.skeletonRow} />
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>수행평가를 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.items.length === 0 ? (
            <p className={styles.emptyNotice} role="status">
              아직 등록한 수행평가가 없어요. 새 수행평가를 받으면 여기에서 단계별로 관리할 수 있어요.
            </p>
          ) : (
            <TaskList data={state.data} filter={filter} onFilterChange={onFilterChange} />
          ))}
      </section>
    </SchoolLayout>
  )
}

interface TaskListProps {
  data: StudentTaskListResult
  filter: TaskListFilter
  onFilterChange: (filter: TaskListFilter) => void
}

function TaskList({ data, filter, onFilterChange }: TaskListProps) {
  // Chip 숫자는 같은 Task 목록에서 센다. (별도 Counter를 두지 않는다)
  const counts = Object.fromEntries(
    taskListFilters.map(({ id }) => [id, data.items.filter((task) => matchesTaskFilter(task, id)).length]),
  ) as Record<TaskListFilter, number>
  const visible = data.items.filter((task) => matchesTaskFilter(task, filter))
  const filterLabel = taskListFilters.find(({ id }) => id === filter)?.label

  return (
    <>
      <div className={styles.filters} role="group" aria-label="수행평가 Filter">
        {taskListFilters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={styles.filterChip}
            aria-pressed={id === filter}
            onClick={() => onFilterChange(id)}
          >
            {label} {counts[id]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.emptyNotice} role="status">
          <p>'{filterLabel}'에 해당하는 수행평가가 없어요.</p>
          <button type="button" className={styles.retryButton} onClick={() => onFilterChange('all')}>
            전체 보기
          </button>
        </div>
      ) : (
        <>
          <div className={styles.columns} aria-hidden="true">
            <span>Task</span>
            <span>마감</span>
            <span>현재 단계</span>
            <span>상태</span>
          </div>
          <ul className={styles.rows}>
            {visible.map((task) => (
              <li key={task.taskId}>
                <SchoolTaskRow task={task} snapshotDate={data.snapshotDate} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
