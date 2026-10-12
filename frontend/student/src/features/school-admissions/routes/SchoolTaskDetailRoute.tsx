import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { mentorCasePath } from '../../mentor-hub/routes/paths.ts'
import { createSchoolTaskDetailFixtureLoader, readSchoolTaskDetailFixtureScenario } from '../fixtures/schoolTaskDetail.fixture.ts'
import { createSchoolEvidenceFixtureService, readSchoolEvidenceFixtureScenario } from '../fixtures/schoolEvidence.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import {
  applyTopicReviewFixture,
  createSchoolTopicSubmitFixtureService,
  readSchoolTopicSubmitFixtureScenario,
  readTopicReviewFixtureResult,
} from '../fixtures/schoolTopic.fixture.ts'
import { canSubmitTopic } from '../model/topic.ts'
import { parseTaskDetailTab, type TaskDetailTabId } from '../model/taskDetail.ts'
import { SchoolTaskDetailPage } from '../SchoolTaskDetailPage.tsx'
import { schoolEvidencePath, schoolTasksPath, topicModalParam } from './paths.ts'
import { SchoolTopicModal } from './SchoolTopicModal.tsx'

/** Tasks 목록에서 Detail로 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 목록의 Filter / Scroll을 복원한다. */
export interface SchoolTaskDetailEntryState {
  fromTaskList: true
}

const isFromTaskList = (state: unknown): state is SchoolTaskDetailEntryState =>
  typeof state === 'object' && state !== null && (state as Partial<SchoolTaskDetailEntryState>).fromTaskList === true

/** 주제 제출 Modal을 이 화면에서 열었다는 표시 (닫을 때 History Back으로 되돌린다) */
const isTopicOpenedHere = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { topicOpenedHere?: boolean }).topicOpenedHere === true

// Task Detail. 선택 Tab(?tab=)과 수정 기록 Version Pair(?from=&to=)를 URL에 두어 새로고침 / Mentor Case 왕복 후에도 유지한다.
// Tab 전환은 History를 쌓지 않는다. (Back은 이전 화면으로) Scroll은 App Shell의 ScrollRestoration이 복원한다.
export function SchoolTaskDetailRoute() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTaskDetailTab(searchParams.get('tab'))
  const topicOpen = searchParams.has(topicModalParam)
  const [topicSubmitted, setTopicSubmitted] = useState(false)
  // 자료가 바뀌면 다시 그려 Loader(저장소 revision)가 바뀐 값을 읽게 한다.
  const [, setEvidenceRevision] = useState(0)

  // 개발용: 선생님(학원)의 주제 검토 결과 재현 (?fixtureTopicReview=direction-requested | confirmed).
  // Admin Action이므로 Student 화면에는 버튼이 없다. 적용 후 주소에서 지운다.
  const reviewFixture = import.meta.env.DEV ? readTopicReviewFixtureResult(searchParams.toString()) : undefined
  useEffect(() => {
    if (!reviewFixture) return
    applyTopicReviewFixture(taskId, reviewFixture)
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.delete('fixtureTopicReview')
        return params
      },
      { replace: true, preventScrollReset: true, state: location.state },
    )
  }, [reviewFixture, taskId, setSearchParams, location.state])

  const submitTopic = createSchoolTopicSubmitFixtureService(
    import.meta.env.DEV ? readSchoolTopicSubmitFixtureScenario(searchParams.toString()) : 'success',
  )

  const openTopic = () => {
    setTopicSubmitted(false)
    const params = new URLSearchParams(searchParams)
    params.set(topicModalParam, '1')
    // History에 남겨 Browser Back으로 Modal이 닫히게 한다. 목록에서 왔다는 표시도 함께 유지한다.
    const state = { ...(typeof location.state === 'object' ? location.state : {}), topicOpenedHere: true }
    navigate({ search: `?${params.toString()}` }, { state, preventScrollReset: true })
  }

  const closeTopic = (submitted: boolean) => {
    setTopicSubmitted(submitted)
    if (isTopicOpenedHere(location.state)) navigate(-1)
    else
      updateParams((params) => {
        params.delete(topicModalParam)
      })
  }

  const evidenceService = createSchoolEvidenceFixtureService(
    import.meta.env.DEV ? readSchoolEvidenceFixtureScenario(searchParams.toString()) : 'success',
  )

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
      onOpenTopic={openTopic}
      focusNowCard={topicSubmitted && !topicOpen}
      evidenceService={evidenceService}
      onEvidenceChanged={() => {
        // 주제 제출 직후의 지금 할 일 Focus는 한 번만. 자료를 바꾼 뒤에는 원래 버튼으로 Focus를 돌려준다.
        setTopicSubmitted(false)
        setEvidenceRevision((value) => value + 1)
      }}
      // 주제를 쓸 수 있는 상태(제출 전 / 방향 요청)에서만 연다. 그 외 상태로 ?topic=1에 들어오면 열지 않는다.
      renderTopicDialog={(data) =>
        topicOpen && canSubmitTopic(data.detail?.topic) ? (
          <SchoolTopicModal key={data.task.taskId} data={data} submitTopic={submitTopic} onClose={closeTopic} />
        ) : null
      }
      studentGrade={schoolStudentContext.grade}
      onSectionSelect={(id) => {
        if (id === 'tasks') navigate(schoolTasksPath)
        else if (id === 'evidence') navigate(schoolEvidencePath)
      }}
    />
  )
}
