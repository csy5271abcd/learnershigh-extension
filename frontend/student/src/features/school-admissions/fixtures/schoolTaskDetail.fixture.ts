// UI 검증용 Task Detail Fixture다. 실제 Backend / LearnersHigh 수행평가 데이터가 아니다.
// - Task 기본값(제목 / 과목 / 단계 / 상태 / 다음 할 일)은 목록 Fixture(fixtureStudentTasks)를 그대로 쓴다. (같은 taskId, 복제 없음)
// - 상세 자료는 두 Task에만 있다. (사용자 확인 2026-10-12)
//   · fixture-task-02 영어 Speech: TasksDetail-01 ~ 07 Mockup 내용. 단 운영시간 숫자(Review 48h 초과 / 62시간)는 학생용 문장으로 바꿨다.
//   · fixture-task-01 항생제 포스터: 확인된 사실만 둔다. 4단계(초안 V1 미제출)라 Version / 피드백은 실제로 없고,
//     Mentor Case는 Mentor Hub Home의 기존 Admin 추천 relation을 그대로 쓴다. 근거가 없는 평가 기준 / 참고 자료 / 과정 자료는 null(준비 안 됨).
// - 나머지 Task는 detail: null (목록 정보만, 상세 자료 준비 중).
// - 원고 문장은 학생이 직접 쓴 제출물이라는 가정의 표시용 문장이다. AI / Admin이 쓴 문장이 아니다.

import { findActivityCaseFixture } from '../../mentor-hub/fixtures/activityCases.fixture.ts'
import { mentorHubHomeFixture } from '../../mentor-hub/fixtures/mentorHubHome.fixture.ts'
import { fixtureMentorContent } from '../../mentor-hub/fixtures/mentors.fixture.ts'
import { caseMaterialName, caseMaterialRoleLabel } from '../../mentor-hub/model/caseMaterials.ts'
import type { StudentTaskDetail, StudentTaskDetailExtra, TaskMentorCaseLink, TaskMentorCaseView } from '../model/types.ts'
import { taskEvidence } from './schoolEvidence.fixture.ts'
import { taskFeedback } from './schoolFeedback.fixture.ts'
import { taskVersions } from './schoolVersion.fixture.ts'
import { findCreatedTask, findSeedOverride, taskStoreRevision } from './schoolTaskRepository.fixture.ts'
import { fixtureStudentTasks, SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'

/** Task의 Case 연결(contentId)을 Canonical Activity Case 값으로 채운다. 공개되지 않은(없는) Case는 보여주지 않는다. */
function caseViews(links: TaskMentorCaseLink[]): TaskMentorCaseView[] {
  return links.flatMap((link) => {
    const activityCase = findActivityCaseFixture(link.contentId)
    if (!activityCase) return []
    const { mentor } = activityCase
    return [
      {
        ...link,
        title: activityCase.title,
        mentorName: mentor.name,
        mentorAffiliation: `${mentor.university} ${mentor.major}`,
        gradeLabel: `고${activityCase.grade}`,
        activityType: activityCase.activityType,
        stageTitles: activityCase.stages.map((stage) => stage.title),
        materials: activityCase.materials.map((material) => ({
          materialId: material.materialId,
          roleLabel: caseMaterialRoleLabel[material.role],
          name: caseMaterialName(material),
          description: material.description,
        })),
      },
    ]
  })
}

const speechDetail: StudentTaskDetailExtra = {
  topic: { state: 'confirmed', topic: 'How AI is Changing Education' },
  nowCard: {
    headline: 'V2 검토가 진행 중이에요',
    description: '검토가 완료되면 수정할 내용을 확인할 수 있어요.',
    fact: '10월 3일 20:45에 V2를 제출했어요',
    primaryAction: { kind: 'compareVersions', label: 'V1과 V2 비교해보기', fromVersionId: 'speech-v1', toVersionId: 'speech-v2' },
    waitingActions: [{ kind: 'unavailable', label: '발표 연습 녹음 올리기', reason: '녹음 올리기 화면은 준비 중이에요.' }],
  },
  guideFile: { fileName: '2학기 영어 수행평가 안내문_Speech.pdf', format: 'PDF', registeredDate: '2026-09-22' },
  guideText: null,
  criteria: [
    { criterionId: 'thesis', name: '내용 구성 · thesis', points: 30, aiCheck: 'thesis가 두 번째 문단에 있어요. 앞쪽으로 옮기면 좋아요' },
    { criterionId: 'time', name: '시간 준수 (2분 40초~3분 20초)', points: 20, aiCheck: '3분 55초 · 35초 길어요' },
    { criterionId: 'delivery', name: '발음·전달', points: 20, aiCheck: '녹음이 없어 아직 점검 전이에요' },
    { criterionId: 'vocabulary', name: '어휘·표현', points: 20, aiCheck: '반복 표현이 2회 남아 있어요' },
    { criterionId: 'visual', name: '시각자료 활용', points: 10, aiCheck: '시각자료 1장이 아직 없어요' },
  ],
  references: [
    { referenceId: 'unesco', kind: 'link', title: 'UNESCO · Guidance for generative AI in education', source: 'unesco.org', usage: 'thesis 근거 통계 1개' },
    { referenceId: 'herald', kind: 'article', title: 'AI 디지털교과서 도입 관련 기사', source: 'The Korea Herald', usage: '도입부 사례' },
    { referenceId: 'textbook', kind: 'textbook', title: '영어Ⅰ 교과서 4단원 Speech 예시', source: 'p.86~89', usage: '구조 참고' },
  ],
  mentorCases: caseViews([
    { contentId: fixtureMentorContent.speechCase.contentId, teacherRecommended: true, relationNote: '분량 초과를 줄여간 과정이 지금 V2와 같아요.' },
    { contentId: fixtureMentorContent.tourGuideCase.contentId, teacherRecommended: false, relationNote: '영어 표현을 읽는 사람 기준으로 고친 과정을 볼 수 있어요.' },
    { contentId: fixtureMentorContent.aiInterviewCase.contentId, teacherRecommended: false, relationNote: 'AI 주제에서 주장과 근거를 나눈 과정을 참고할 수 있어요.' },
  ]),
  revisionDiffs: [
    {
      fromVersionId: 'speech-v1',
      toVersionId: 'speech-v2',
      appliedFeedbackId: 'speech-teacher-v1',
      blocks: [
        {
          kind: 'changed',
          before:
            'Good morning, everyone. Today I want to talk about something very important. Artificial intelligence is very important in our lives, and it is also very important in education.',
          after: 'Good morning, everyone. Today I want to talk about how AI is changing the way we learn.',
        },
        {
          kind: 'same',
          text: 'First, AI can give students personal feedback. For example, writing apps can check grammar right away and show better expressions.',
        },
        {
          kind: 'removed',
          before: 'Also, my cousin used an AI chatbot to plan a family trip, and it was very convenient and very fast.',
        },
        {
          kind: 'changed',
          before: 'Second, AI is very very helpful for teachers because it is very helpful to make many quizzes.',
          after: 'Second, AI helps teachers make quizzes that fit each student.',
        },
        { kind: 'added', after: 'However, we should still check AI answers ourselves before we use them.' },
      ],
    },
  ],
}

// 항생제 포스터 Task의 Mentor Case: Mentor Hub Home의 Admin 추천 relation을 그대로 쓴다. (새 추천 데이터를 만들지 않는다)
function recommendedCasesFor(taskId: string): TaskMentorCaseLink[] {
  return mentorHubHomeFixture.adminRecommendedCases
    .filter((item) => item.linkedTask.taskId === taskId)
    .map((item) => ({ contentId: item.caseId, teacherRecommended: true, relationNote: item.relationReason }))
}

const antibioticTaskId = mentorHubHomeFixture.studentContext.currentTask?.taskId ?? 'fixture-task-01'

const antibioticDetail: StudentTaskDetailExtra = {
  topic: null,
  nowCard: {
    headline: '초안 V1을 올려주세요',
    description: '초안을 올리면 AI 사전 점검과 선생님 피드백을 이어서 받을 수 있어요.',
    primaryAction: { kind: 'unavailable', label: '초안 V1 제출', reason: '초안 제출 화면은 준비 중이에요.' },
    waitingActions: [{ kind: 'openTab', label: '선생님 추천 Case 보기', tab: 'mentor-case' }],
  },
  guideFile: null,
  guideText: null,
  criteria: null,
  references: null,
  mentorCases: caseViews(recommendedCasesFor(antibioticTaskId)),
  revisionDiffs: [],
}

// 하천 조사 Task (2/8 주제 검토 대기): 목록에 보이는 주제 검토 상태만 둔다. 다른 상세 자료는 준비 안 됨(null).
const riverDetail: StudentTaskDetailExtra = {
  topic: { state: 'in-review', topic: '하천 주변 토지 이용과 환경 문제' },
  nowCard: { headline: '주제를 제출했어요', description: '선생님 검토를 기다리고 있어요.', waitingActions: [] },
  guideFile: null,
  guideText: null,
  criteria: null,
  references: null,
  mentorCases: null,
  revisionDiffs: [],
}

const details: Record<string, StudentTaskDetailExtra> = {
  'fixture-task-02': speechDetail,
  [antibioticTaskId]: antibioticDetail,
  'fixture-task-05': riverDetail,
}

/** Seed Task의 상세 자료 (없으면 null) */
export function seedTaskDetail(taskId: string): StudentTaskDetailExtra | null {
  return details[taskId] ?? null
}

// ---------- Scenario (개발 중 ?fixture= 로 확인) ----------

/** feedback-error-once: Task는 불러오고 피드백만 한 번 실패 (피드백 Tab에서 다시 시도) */
export type SchoolTaskDetailFixtureScenario = 'success' | 'loading' | 'error' | 'feedback-error-once'
const scenarios: SchoolTaskDetailFixtureScenario[] = ['success', 'loading', 'error', 'feedback-error-once']
/** 피드백 실패를 처음 본 저장소 revision. 다시 시도(저장소 갱신) 뒤에는 성공한다. (StrictMode 중복 호출에도 같은 결과) */
let feedbackErrorRevision: number | undefined

export function readSchoolTaskDetailFixtureScenario(search: string): SchoolTaskDetailFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

function feedbackFailsNow(scenario: SchoolTaskDetailFixtureScenario): boolean {
  if (scenario !== 'feedback-error-once') return false
  feedbackErrorRevision ??= taskStoreRevision()
  return feedbackErrorRevision === taskStoreRevision()
}

export type SchoolTaskDetailLoader = (taskId: string) => Promise<StudentTaskDetail | null>

const loaders = new Map<string, SchoolTaskDetailLoader>()

/**
 * 실제 GET /api/student/tasks/{taskId} 대신 Fixture를 돌려준다. 없는 taskId는 null(Not Found).
 * 저장소가 바뀌면(주제 제출 등) 다른 함수가 되어 다시 불러온다.
 */
export function createSchoolTaskDetailFixtureLoader(scenario: SchoolTaskDetailFixtureScenario): SchoolTaskDetailLoader {
  const key = `${scenario}|${taskStoreRevision()}`
  let loader = loaders.get(key)
  if (!loader) {
    loader = (taskId) => {
      switch (scenario) {
        case 'loading':
          return new Promise<StudentTaskDetail | null>(() => {})
        case 'error':
          return Promise.reject(new Error('School task detail fixture error'))
        case 'success':
        case 'feedback-error-once': {
          // 이번 Session에 등록한 Task는 등록할 때 입력한 값만 상세 자료로 가진다.
          const created = findCreatedTask(taskId)
          const override = findSeedOverride(taskId)
          const seed = fixtureStudentTasks.find((item) => item.taskId === taskId)
          const task = created?.task ?? override?.task ?? seed
          if (!task) return Promise.resolve(null)
          const detail = created ? created.detail : (override?.detail ?? details[taskId] ?? null)
          return Promise.resolve({
            task,
            detail,
            evidence: taskEvidence(taskId),
            versions: taskVersions(taskId),
            feedback: feedbackFailsNow(scenario) ? { status: 'error' } : taskFeedback(taskId),
            snapshotDate: SCHOOL_SNAPSHOT_DATE,
          })
        }
      }
    }
    loaders.set(key, loader)
  }
  return loader
}
