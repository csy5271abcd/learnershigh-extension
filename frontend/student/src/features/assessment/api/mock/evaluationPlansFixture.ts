import type { AnalysisSubject, EvaluationPlan } from '../types.ts'

// 학교 평가계획서 시연 Fixture (§10·§11). 가상의 "예시고등학교" 문서이며 실제 학교 평가계획서·관리자 등록 문서가 아니다.
// 분석 결과도 시연용 예시 값이다. 실제 PDF 원본은 연결되어 있지 않아 페이지 근거를 원본과 대조할 수 없다.
// 기존 수행평가 assessment_001·002가 가리키는 `plan_rev_002`를 같은 문서로 써서 "이미 가져온 항목"을 확인할 수 있게 한다.

export const fixtureEvaluationPlans: EvaluationPlan[] = [
  {
    planId: 'plan_001',
    documentRevisionId: 'plan_rev_002',
    schoolId: 'school_001',
    academicYear: 2026,
    grade: 1,
    semester: 2,
    fileName: '2026_예시고_1학년_2학기_교수학습평가계획(시연).pdf',
    sourceUrl: null,
    reviewStatus: 'CONFIRMED',
    uploadedAt: '2026-08-28T10:00:00+09:00',
  },
  {
    planId: 'plan_002',
    documentRevisionId: 'plan_rev_003',
    schoolId: 'school_001',
    academicYear: 2026,
    grade: 1,
    semester: 2,
    fileName: '평가계획_스캔본(시연).pdf',
    sourceUrl: null,
    reviewStatus: 'CONFIRMED',
    uploadedAt: '2026-08-29T15:30:00+09:00',
  },
  {
    planId: 'plan_101',
    documentRevisionId: 'plan_rev_101',
    schoolId: 'school_001',
    academicYear: 2025,
    grade: 1,
    semester: 2,
    fileName: '2025_예시고_1학년_2학기_교수학습평가계획(시연).pdf',
    sourceUrl: null,
    reviewStatus: 'CONFIRMED',
    uploadedAt: '2025-08-27T10:00:00+09:00',
  },
]

/** `evaluationPlanOtherSchool` 시나리오에서만 목록에 섞는 다른 학교 문서 (서버가 걸러야 하는 경우의 화면 방어 확인용) */
export const fixtureOtherSchoolPlan: EvaluationPlan = {
  planId: 'plan_901',
  documentRevisionId: 'plan_rev_901',
  schoolId: 'school_999',
  academicYear: 2026,
  grade: 1,
  semester: 2,
  fileName: '다른학교_평가계획(시연).pdf',
  sourceUrl: null,
  reviewStatus: 'CONFIRMED',
  uploadedAt: '2026-08-30T10:00:00+09:00',
}

const empty = { standards: [], levels: [], thresholds: [] }

/** documentRevisionId별 분석 결과 (시연). 없는 문서는 분석 실패로 끝난다. */
export const fixtureAnalysisResults: Record<string, { status: 'REVIEW_REQUIRED' | 'COMPLETED'; subjects: AnalysisSubject[] }> = {
  plan_rev_002: {
    status: 'REVIEW_REQUIRED',
    subjects: [
      {
        subjectName: '공통국어2',
        extractionFailed: false,
        writtenEvaluation: {
          weightPercent: 50,
          exams: [
            { round: 1, weightPercent: 25, questionTypes: ['선택형', '서답형'] },
            { round: 2, weightPercent: 25, questionTypes: ['선택형', '논술형'] },
          ],
        },
        performanceEvaluation: {
          weightPercent: 50,
          items: [
            {
              itemKey: 'performance_01',
              label: '비판적 매체 읽기와 논설문 작성하기',
              weightPercent: 20,
              maxScore: 20,
              timing: '10월',
              rubric: ['주장이 분명하다', '근거가 타당하다', '매체 자료를 비판적으로 평가한다'],
              sourcePdfPageNumber: 12,
            },
            {
              itemKey: 'performance_02',
              label: '매체 자료의 신뢰성 평가하기',
              weightPercent: 10,
              maxScore: 10,
              timing: '9월',
              rubric: ['자료의 출처와 작성 시점을 확인한다'],
              sourcePdfPageNumber: 12,
            },
            {
              itemKey: 'performance_03',
              label: '문학 작품 감상문 쓰기',
              weightPercent: 20,
              maxScore: null,
              timing: null,
              rubric: [],
              sourcePdfPageNumber: null,
            },
          ],
        },
        achievement: {
          standards: ['[10공국2-03-01] 쓰기 맥락을 고려하여 논증하는 글을 쓴다. (시연 문장)'],
          levels: ['A', 'B', 'C', 'D', 'E'],
          thresholds: ['A 90% 이상', 'B 80% 이상', 'C 70% 이상', 'D 60% 이상', 'E 60% 미만'],
        },
        teachingPlan: ['9월: 매체 비평 단원 — 모둠 토의', '10월: 논증하는 글쓰기 — 개요 피드백'],
        sources: [
          { pdfPageNumber: 12, printedPageLabel: '10', extractedText: '공통국어2 수행평가: 논설문 작성(20%), 매체 자료 평가(10%) … (시연 문장)' },
          { pdfPageNumber: 13, printedPageLabel: '11', extractedText: '지필평가 1차 25%, 2차 25% … (시연 문장)' },
        ],
      },
      {
        subjectName: '통합과학2',
        extractionFailed: false,
        writtenEvaluation: { weightPercent: 60, exams: [{ round: 1, weightPercent: 30, questionTypes: ['선택형'] }, { round: 2, weightPercent: 30, questionTypes: ['선택형', '서답형'] }] },
        performanceEvaluation: {
          weightPercent: 40,
          items: [
            {
              itemKey: 'performance_01',
              label: '중화반응의 양적 관계를 분석하여 중화점 추론하기',
              weightPercent: 15,
              maxScore: 15,
              timing: '10월',
              rubric: ['실험 과정을 정확히 기록한다', '그래프로 중화점을 추론한다'],
              sourcePdfPageNumber: 21,
            },
            {
              itemKey: 'performance_02',
              label: '생태계 평형 탐구 보고서',
              weightPercent: 25,
              maxScore: null,
              timing: '11월',
              rubric: [],
              sourcePdfPageNumber: 21,
            },
          ],
        },
        achievement: empty,
        teachingPlan: [],
        sources: [{ pdfPageNumber: 21, printedPageLabel: '19', extractedText: '통합과학2 수행평가: 실험 보고서(15%), 탐구 보고서(25%) … (시연 문장)' }],
      },
      {
        subjectName: '통합사회2',
        extractionFailed: false,
        writtenEvaluation: null,
        performanceEvaluation: {
          weightPercent: 100,
          items: [
            {
              itemKey: 'performance_01',
              label: '우리 지역의 공간 불평등 문제 탐구 발표',
              weightPercent: 15,
              maxScore: 15,
              timing: '11월',
              rubric: [],
              sourcePdfPageNumber: 30,
            },
          ],
        },
        achievement: empty,
        teachingPlan: [],
        sources: [{ pdfPageNumber: 30, printedPageLabel: null, extractedText: '통합사회2 수행평가: 지역 문제 탐구 발표(15%) … (시연 문장)' }],
      },
      {
        subjectName: '과학탐구실험2',
        extractionFailed: true,
        writtenEvaluation: null,
        performanceEvaluation: null,
        achievement: empty,
        teachingPlan: [],
        sources: [],
      },
      {
        subjectName: '정보',
        extractionFailed: false,
        writtenEvaluation: null,
        performanceEvaluation: {
          weightPercent: 100,
          items: [
            {
              itemKey: 'performance_01',
              label: '생활 속 문제 해결 알고리즘 설계',
              weightPercent: 30,
              maxScore: 30,
              timing: '12월',
              rubric: [],
              sourcePdfPageNumber: 40,
            },
          ],
        },
        achievement: empty,
        teachingPlan: [],
        sources: [{ pdfPageNumber: 40, printedPageLabel: '38', extractedText: '정보 수행평가: 알고리즘 설계 프로젝트(30%) … (시연 문장)' }],
      },
    ],
  },
  plan_rev_101: {
    status: 'COMPLETED',
    subjects: [
      {
        subjectName: '공통국어2',
        extractionFailed: false,
        writtenEvaluation: { weightPercent: 60, exams: [{ round: 1, weightPercent: 30, questionTypes: ['선택형'] }, { round: 2, weightPercent: 30, questionTypes: ['선택형'] }] },
        performanceEvaluation: {
          weightPercent: 40,
          items: [
            {
              itemKey: 'performance_01',
              label: '토론 개요서 작성',
              weightPercent: 20,
              maxScore: 20,
              timing: '10월',
              rubric: [],
              sourcePdfPageNumber: 9,
            },
          ],
        },
        achievement: empty,
        teachingPlan: [],
        sources: [{ pdfPageNumber: 9, printedPageLabel: '7', extractedText: '2025학년도 공통국어2 수행평가: 토론 개요서(20%) … (시연 문장)' }],
      },
    ],
  },
}
