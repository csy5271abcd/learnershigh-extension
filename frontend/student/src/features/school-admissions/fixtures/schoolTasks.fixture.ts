// UI 검증용 Fixture다. 실제 Backend / LearnersHigh 수행평가 데이터가 아니다.
// - 로그인 Student는 Student Surface의 Canonical Student 한 명(최하은, 고2)이다. 다른 학생의 Task를 섞지 않는다. (domain.md §56)
// - Task 9개의 제목 / 제출물 / 단계 / 상태 분포는 Tasks-00 Mockup 기준이다.
//   단 고1 과목(통합과학 · 통합사회 · 과학탐구실험)은 고2 Student에 맞게 바꿨다.
// - 항생제 포스터 Task는 Mentor Hub의 "진행 중 Task"와 같은 Task다. (같은 taskId / 제목, 화면 전용 Task를 만들지 않는다)
// - 기준일(snapshotDate) 2026-10-06: Mockup의 D-day(10월 16일 → D-10)와 맞춘 값이다.

import { mentorHubHomeFixture } from '../../mentor-hub/fixtures/mentorHubHome.fixture.ts'
import type { StudentTaskListResult, StudentTaskSummary } from '../model/types.ts'
import { findSeedOverride, listCreatedTasks, taskStoreRevision } from './schoolTaskRepository.fixture.ts'

const currentTask = mentorHubHomeFixture.studentContext.currentTask

export const schoolStudentContext = {
  displayName: mentorHubHomeFixture.studentContext.displayName,
  grade: mentorHubHomeFixture.studentContext.grade,
}

export const SCHOOL_SNAPSHOT_DATE = '2026-10-06'

export const fixtureStudentTasks: StudentTaskSummary[] = [
  {
    taskId: 'fixture-task-02',
    title: '사회 쟁점 3분 영어 Speech · How AI is Changing Education',
    subject: '영어',
    deadlineDate: '2026-10-16',
    currentStage: 6,
    stageStatus: 'V2 검토 대기',
    deliverableSummary: '2분 40초~3분 20초 Speech + 시각자료 1장',
    turn: 'waiting',
    attentionFlags: ['reviewDelayed'],
    nextAction: '선생님이 V2를 검토하고 있어요.',
  },
  {
    taskId: 'fixture-task-03',
    title: '생활 문제 해결 Python 데이터 프로젝트 · 급식 메뉴별 잔반량 분석',
    subject: '정보',
    deadlineDate: '2026-10-09',
    currentStage: 5,
    stageStatus: 'V1 검토 대기',
    deliverableSummary: '.py/.ipynb + 결과 화면 + 보고서 2쪽',
    turn: 'waiting',
    attentionFlags: [],
    nextAction: '선생님이 V1을 검토하고 있어요.',
  },
  {
    taskId: 'fixture-task-04',
    title: '함수를 활용한 실생활 모델링 · 자동차 속도와 제동거리',
    subject: '수학',
    deadlineDate: '2026-10-20',
    currentStage: 7,
    stageStatus: 'Revision',
    deliverableSummary: '탐구보고서 3쪽 + 그래프',
    turn: 'student',
    attentionFlags: [],
    nextAction: '피드백을 반영한 수정본을 올려주세요.',
  },
  {
    taskId: 'fixture-task-05',
    title: '우리 지역 생활환경 조사 · 하천 주변 토지 이용과 환경 문제',
    subject: '한국지리',
    deadlineDate: '2026-10-27',
    currentStage: 2,
    stageStatus: '주제 검토 대기',
    deliverableSummary: '현장 사진 3장 이상 + 지도 표시 + A4 2쪽 보고서',
    turn: 'waiting',
    attentionFlags: [],
    nextAction: '선생님이 주제를 검토하고 있어요.',
  },
  {
    taskId: currentTask?.taskId ?? 'fixture-task-01',
    title: currentTask?.title ?? '항생제 내성과 자연선택 탐구 포스터',
    subject: '생명과학Ⅰ',
    deadlineDate: '2026-10-05',
    currentStage: 4,
    stageStatus: '초안 미제출',
    deliverableSummary: 'A3 포스터 + 3분 발표',
    turn: 'student',
    attentionFlags: ['deadlinePassed'],
    nextAction: '초안 V1을 올려주세요.',
  },
  {
    taskId: 'fixture-task-06',
    title: '물의 전기분해 실험 보고서 · 기체 부피비 2:1 확인',
    subject: '화학Ⅰ',
    deadlineDate: '2026-10-15',
    currentStage: 5,
    stageStatus: 'AI 1차 분석 중',
    deliverableSummary: '실험 보고서 A4 3쪽 + 실험 사진 4장',
    turn: 'waiting',
    attentionFlags: [],
    nextAction: 'AI 사전 점검이 끝나면 알려드릴게요.',
  },
  {
    taskId: 'fixture-task-07',
    title: '설문으로 알아본 우리 반 통학 시간 · 대푯값과 산포도',
    subject: '수학',
    deadlineDate: '2026-10-23',
    currentStage: 3,
    stageStatus: '자료 조사',
    deliverableSummary: '설문 탐구 보고서 2쪽 + 도수분포표·히스토그램',
    turn: 'student',
    attentionFlags: [],
    nextAction: '조사 자료를 1개 이상 올려주세요.',
  },
  {
    taskId: 'fixture-task-08',
    title: '영어 독서 에세이 · 「Wonder」 주인공의 변화',
    subject: '영어',
    deadlineDate: '2026-09-30',
    currentStage: 8,
    stageStatus: '최종 제출 완료',
    deliverableSummary: '영어 에세이 250~300단어',
    turn: 'waiting',
    attentionFlags: [],
    nextAction: '최종 결과 확정을 기다리고 있어요.',
  },
  {
    taskId: 'fixture-task-09',
    title: '독립협회와 만민공동회 사료 비교 분석',
    subject: '한국사',
    deadlineDate: '2026-10-30',
    currentStage: 1,
    stageStatus: '보류',
    deliverableSummary: '사료 비교표 + A4 3쪽 보고서',
    turn: 'waiting',
    attentionFlags: ['onHold'],
    nextAction: '보류된 수행평가예요. 다시 진행되면 알려드릴게요.',
  },
]

// ---------- Scenario (개발 중 ?fixture= 로 확인. ?filter=와 함께 써도 된다) ----------

export type SchoolTaskListFixtureScenario = 'success' | 'empty' | 'loading' | 'error'
const scenarios: SchoolTaskListFixtureScenario[] = ['success', 'empty', 'loading', 'error']

export function readSchoolTaskListFixtureScenario(search: string): SchoolTaskListFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolTaskListLoader = () => Promise<StudentTaskListResult>

const loaders = new Map<string, SchoolTaskListLoader>()

/**
 * 실제 GET /api/student/tasks 대신 Fixture를 돌려준다. 같은 scenario에는 같은 함수를 돌려준다. (목록 Hook의 Cache Key)
 * 이번 Session에 Task를 등록 / 변경하면 다른 함수가 되어 목록을 다시 불러온다.
 */
export function createSchoolTaskListFixtureLoader(scenario: SchoolTaskListFixtureScenario): SchoolTaskListLoader {
  const key = `${scenario}|${taskStoreRevision()}`
  let loader = loaders.get(key)
  if (!loader) {
    loader = () => {
      switch (scenario) {
        case 'loading':
          return new Promise<StudentTaskListResult>(() => {})
        case 'error':
          return Promise.reject(new Error('School task list fixture error'))
        case 'empty':
          return Promise.resolve({ items: [], snapshotDate: SCHOOL_SNAPSHOT_DATE })
        case 'success':
          // 이번 Session에 등록한 Task + Seed(Session 중 변경 반영). Filter 숫자도 이 목록에서 다시 센다.
          return Promise.resolve({
            items: [...listCreatedTasks(), ...fixtureStudentTasks.map((task) => findSeedOverride(task.taskId)?.task ?? task)],
            snapshotDate: SCHOOL_SNAPSHOT_DATE,
          })
      }
    }
    loaders.set(key, loader)
  }
  return loader
}
