import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { mentorCasePath } from '../../mentor-hub/routes/paths.ts'
import { createSchoolTaskDetailFixtureLoader, readSchoolTaskDetailFixtureScenario } from '../fixtures/schoolTaskDetail.fixture.ts'
import { createSchoolEvidenceFixtureService, readSchoolEvidenceFixtureScenario } from '../fixtures/schoolEvidence.fixture.ts'
import {
  applyTeacherFeedbackFixture,
  createSchoolFeedbackFixtureService,
  readSchoolFeedbackFixtureScenario,
  readTeacherFeedbackFixture,
} from '../fixtures/schoolFeedback.fixture.ts'
import { markTaskStoreChanged } from '../fixtures/schoolTaskRepository.fixture.ts'
import { schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import {
  applyAiAnalysisFixture,
  createSchoolVersionFixtureService,
  readAiAnalysisFixtureResult,
  readSchoolVersionFixtureScenario,
} from '../fixtures/schoolVersion.fixture.ts'
import {
  applyTopicReviewFixture,
  createSchoolTopicSubmitFixtureService,
  readSchoolTopicSubmitFixtureScenario,
  readTopicReviewFixtureResult,
} from '../fixtures/schoolTopic.fixture.ts'
import { canSubmitTopic } from '../model/topic.ts'
import { canSubmitNextVersion } from '../model/feedback.ts'
import { parseTaskDetailTab, type TaskDetailTabId } from '../model/taskDetail.ts'
import { SchoolTaskDetailPage } from '../SchoolTaskDetailPage.tsx'
import { feedbackVersionParam, schoolEvidencePath, schoolTasksPath, topicModalParam, versionModalParam } from './paths.ts'
import { SchoolTopicModal } from './SchoolTopicModal.tsx'
import { SchoolVersionSubmitModal } from './SchoolVersionSubmitModal.tsx'

/** Tasks 목록에서 Detail로 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해 목록의 Filter / Scroll을 복원한다. */
export interface SchoolTaskDetailEntryState {
  fromTaskList: true
}

const isFromTaskList = (state: unknown): state is SchoolTaskDetailEntryState =>
  typeof state === 'object' && state !== null && (state as Partial<SchoolTaskDetailEntryState>).fromTaskList === true

/** 주제 제출 Modal을 이 화면에서 열었다는 표시 (닫을 때 History Back으로 되돌린다) */
const isTopicOpenedHere = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { topicOpenedHere?: boolean }).topicOpenedHere === true

/** Version 제출 Modal을 이 화면에서 열었다는 표시 (닫을 때 History Back으로 되돌린다) */
const isVersionOpenedHere = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { versionOpenedHere?: boolean }).versionOpenedHere === true

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
  const versionOpen = searchParams.get(versionModalParam) === 'submit'
  const [versionSubmitted, setVersionSubmitted] = useState(false)
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

  // 개발용: AI 사전 점검 결과 재현 (?fixtureAiResult=success | failed | failed-final).
  // 서버 처리 결과이므로 Student 화면에는 버튼이 없다. 분석 중인 최근 Version에 적용한 뒤 주소에서 지운다.
  const aiFixture = import.meta.env.DEV ? readAiAnalysisFixtureResult(searchParams.toString()) : undefined
  useEffect(() => {
    if (!aiFixture) return
    applyAiAnalysisFixture(taskId, aiFixture)
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.delete('fixtureAiResult')
        return params
      },
      { replace: true, preventScrollReset: true, state: location.state },
    )
  }, [aiFixture, taskId, setSearchParams, location.state])

  // 개발용: 선생님 (재)검토 결과 재현 (?fixtureTeacherFeedback=delivered | final-ready). 공용 검토 대기열의 Admin Review 결과이므로
  // Student 화면에는 버튼이 없다. 검토 대기 중인 최근 Version에 적용한 뒤 주소에서 지운다.
  const teacherFixture = import.meta.env.DEV ? readTeacherFeedbackFixture(searchParams.toString()) : undefined
  useEffect(() => {
    if (!teacherFixture) return
    applyTeacherFeedbackFixture(taskId, teacherFixture)
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        params.delete('fixtureTeacherFeedback')
        return params
      },
      { replace: true, preventScrollReset: true, state: location.state },
    )
  }, [teacherFixture, taskId, setSearchParams, location.state])

  const feedbackService = createSchoolFeedbackFixtureService(
    import.meta.env.DEV ? readSchoolFeedbackFixtureScenario(searchParams.toString()) : 'success',
  )

  const versionService = createSchoolVersionFixtureService(
    import.meta.env.DEV ? readSchoolVersionFixtureScenario(searchParams.toString()) : 'success',
  )

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

  const openVersionSubmit = () => {
    setVersionSubmitted(false)
    const params = new URLSearchParams(searchParams)
    params.set(versionModalParam, 'submit')
    // History에 남겨 Browser Back으로 Modal이 닫히게 한다. 목록에서 왔다는 표시도 함께 유지한다.
    const state = { ...(typeof location.state === 'object' ? location.state : {}), versionOpenedHere: true }
    navigate({ search: `?${params.toString()}` }, { state, preventScrollReset: true })
  }

  const closeVersionSubmit = (submitted: boolean) => {
    setVersionSubmitted(submitted)
    if (isVersionOpenedHere(location.state)) navigate(-1)
    else
      updateParams((params) => {
        params.delete(versionModalParam)
      })
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

  const changeTab = (next: TaskDetailTabId, versionId?: string) =>
    updateParams((params) => {
      if (next === 'overview') params.delete('tab')
      else params.set('tab', next)
      // 특정 Version 피드백으로 이동할 때만 둔다. (다른 Tab으로 가면 지운다)
      if (next === 'feedback' && versionId) params.set(feedbackVersionParam, versionId)
      else params.delete(feedbackVersionParam)
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
      onRevisionFeedbackOpen={(versionId) => {
        const params = new URLSearchParams(searchParams)
        params.set('tab', 'feedback')
        params.set(feedbackVersionParam, versionId)
        // History에 남긴다. Back하면 수정 기록 Tab의 같은 비교(?from=&to=)와 Scroll로 돌아온다.
        navigate({ search: `?${params.toString()}` }, { state: location.state })
      }}
      onBackToTasks={() => {
        if (isFromTaskList(location.state)) navigate(-1)
        else navigate(schoolTasksPath)
      }}
      // 기존 Mentor Activity Case Detail로 이동한다. Back하면 이 Task의 같은 Tab / Scroll로 돌아온다.
      onMentorCaseOpen={(contentId) => navigate(mentorCasePath(contentId))}
      onOpenTopic={openTopic}
      // 주제 / Version을 제출한 직후: 바뀐 지금 할 일로 Focus / Scroll
      focusNowCard={(topicSubmitted && !topicOpen) || (versionSubmitted && !versionOpen)}
      evidenceService={evidenceService}
      versionService={versionService}
      onVersionChanged={() => {
        setTopicSubmitted(false)
        setVersionSubmitted(false)
        setEvidenceRevision((value) => value + 1)
      }}
      onOpenVersionSubmit={openVersionSubmit}
      feedbackService={feedbackService}
      onFeedbackChanged={() => {
        // 반영 표시 저장 / 피드백 다시 불러오기: 저장소를 갱신해 Loader가 새로 읽게 한다.
        markTaskStoreChanged()
        setTopicSubmitted(false)
        setVersionSubmitted(false)
        setEvidenceRevision((value) => value + 1)
      }}
      feedbackVersionParam={searchParams.get(feedbackVersionParam)}
      // 지금 Version을 낼 수 있는 상태(초안 V1 / 필수 피드백을 모두 반영한 수정본)에서만 연다.
      renderVersionDialog={(data) =>
        versionOpen && canSubmitNextVersion(data) ? (
          <SchoolVersionSubmitModal
            key={data.task.taskId}
            data={data}
            service={versionService}
            onSubmitted={() => setEvidenceRevision((value) => value + 1)}
            onClose={closeVersionSubmit}
          />
        ) : null
      }
      onEvidenceChanged={() => {
        // 주제 / Version 제출 직후의 지금 할 일 Focus는 한 번만. 자료를 바꾼 뒤에는 원래 버튼으로 Focus를 돌려준다.
        setTopicSubmitted(false)
        setVersionSubmitted(false)
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
