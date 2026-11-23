import type { AcademicContext, EvaluationItemRef, SchoolAssessment } from '../types.ts'

// Assessment Canonical Fixture (Stage 1, 시연 데이터).
// - Shape은 api-contract.md §9·§12 응답을 따른다. 계약에 없는 필드는 넣지 않는다.
// - 위치는 임시다: Admin이 같은 데이터를 쓰기 전에 승인된 공유 위치로 옮긴다 (assessment-frontend-mock.md §4-2).
// - 학교·과목·과제는 실존 학교의 실제 평가정보가 아니다.
// - 화면은 이 파일을 직접 import하지 않는다. api/의 Mock Adapter만 사용한다.

/** 고정 기준 시점. D-day 등 시간 계산은 실행 시점이 아니라 이 값을 기준으로 한다 (testing.md §14). */
export const fixtureAsOfDate = '2026-10-16'

export const fixtureCurrentTerm = { academicYear: 2026, semester: 2 } as const

const school = { schoolId: 'school_001', name: '예시고등학교' }

/** 학기별 §9-1 응답 원본. 학기를 바꿔도 다른 학기의 값은 바뀌지 않는다. */
export const fixtureAcademicContexts: AcademicContext[] = [
  {
    school,
    academicYear: 2026,
    grade: 1,
    semester: 2,
    subjects: [
      { subjectId: 'subj_01', name: '공통국어2' },
      { subjectId: 'subj_02', name: '통합과학2' },
      { subjectId: 'subj_03', name: '통합사회2' },
      { subjectId: 'subj_04', name: '과학탐구실험2' },
    ],
    source: 'EXISTING_LEARNERSHIGH',
  },
  {
    school,
    academicYear: 2026,
    grade: 1,
    semester: 1,
    subjects: [
      { subjectId: 'subj_11', name: '공통국어1' },
      { subjectId: 'subj_12', name: '통합과학1' },
      { subjectId: 'subj_13', name: '통합사회1' },
      { subjectId: 'subj_14', name: '과학탐구실험1' },
    ],
    source: 'EXISTING_LEARNERSHIGH',
  },
]

/**
 * Mock Store 내부 Record. `academicYear`/`semester`/`description`은 §12 등록 요청에 있는 값이며
 * 학기별 목록 필터를 위해 저장한다. 응답에는 §12 응답 필드만 내보낸다.
 */
export interface SchoolAssessmentRecord extends SchoolAssessment {
  academicYear: number
  semester: number
  description: string | null
}

const planRef = (subjectId: string, itemKey: string): EvaluationItemRef => ({
  documentRevisionId: 'plan_rev_002',
  subjectId,
  itemKey,
})

export const fixtureSchoolAssessments: SchoolAssessmentRecord[] = [
  {
    assessmentId: 'assessment_001',
    title: '비판적 매체 읽기와 논설문 작성하기',
    subjectId: 'subj_01',
    status: 'IN_PROGRESS',
    deadlineDate: '2026-10-20',
    createdAt: '2026-09-01T09:00:00+09:00',
    evaluationItemRef: planRef('subj_01', 'performance_01'),
    academicYear: 2026,
    semester: 2,
    description: null,
  },
  {
    assessmentId: 'assessment_002',
    title: '중화반응의 양적 관계를 분석하여 중화점 추론하기',
    subjectId: 'subj_02',
    status: 'IN_PROGRESS',
    deadlineDate: '2026-10-28',
    createdAt: '2026-09-03T09:00:00+09:00',
    evaluationItemRef: planRef('subj_02', 'performance_01'),
    academicYear: 2026,
    semester: 2,
    description: null,
  },
  {
    assessmentId: 'assessment_003',
    title: '우리 지역의 공간 불평등 문제 탐구 발표',
    subjectId: 'subj_03',
    status: 'BEFORE_START',
    deadlineDate: '2026-11-12',
    createdAt: '2026-09-10T09:00:00+09:00',
    evaluationItemRef: null,
    academicYear: 2026,
    semester: 2,
    description: '모둠별 지역 조사 후 발표',
  },
  {
    assessmentId: 'assessment_004',
    title: '학교 주변 생물 탐구',
    subjectId: 'subj_04',
    status: 'BEFORE_START',
    deadlineDate: null,
    createdAt: '2026-09-12T09:00:00+09:00',
    evaluationItemRef: null,
    academicYear: 2026,
    semester: 2,
    description: null,
  },
  {
    assessmentId: 'assessment_005',
    title: '매체 자료의 신뢰성 평가하기',
    subjectId: 'subj_01',
    status: 'COMPLETED',
    deadlineDate: '2026-09-24',
    createdAt: '2026-08-28T09:00:00+09:00',
    evaluationItemRef: null,
    academicYear: 2026,
    semester: 2,
    description: null,
  },
  // 2026학년도 1학기 — 지난 학기 기록. 현재 학기 목록에 섞이지 않아야 한다 (assessment-student.md §4).
  ...[
    ['assessment_101', '시 감상문 쓰기', 'subj_11', '2026-04-10'],
    ['assessment_102', '설득하는 글 발표', 'subj_11', '2026-06-05'],
    ['assessment_103', '물질의 규칙성 탐구 보고서', 'subj_12', '2026-05-15'],
    ['assessment_104', '인권 문제 신문 만들기', 'subj_13', '2026-05-22'],
    ['assessment_105', '지역 기후 자료 분석', 'subj_13', '2026-06-19'],
    ['assessment_106', '산과 염기 실험 보고서', 'subj_14', '2026-06-26'],
  ].map(
    ([assessmentId, title, subjectId, deadlineDate], index): SchoolAssessmentRecord => ({
      assessmentId,
      title,
      subjectId,
      status: 'COMPLETED',
      deadlineDate,
      createdAt: `2026-03-${String(10 + index).padStart(2, '0')}T09:00:00+09:00`,
      evaluationItemRef: null,
      academicYear: 2026,
      semester: 1,
      description: null,
    }),
  ),
]
