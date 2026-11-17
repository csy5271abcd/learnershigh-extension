import {
  fixtureAcademicContexts,
  fixtureAnalysisResults,
  fixtureArtifacts,
  fixtureArtifactVersions,
  fixtureCatalog,
  fixtureEnrichmentTasks,
  fixtureEvaluationPlans,
  fixtureFeedbackRequests,
  fixtureGrowthRecords,
  fixtureMockExamResearch,
  fixtureNotes,
  fixtureReferenceSources,
  fixtureSchoolAssessments,
  universityExamDocuments,
  withLocalMockExamPassages,
  type AcademicContext,
  type ArtifactRecord,
  type ArtifactVersionRecord,
  type EnrichmentTask,
  type FeedbackRequestRecord,
  type GrowthRecord,
  type NoteRecord,
  type SchoolAssessmentRecord,
} from '../canonicalSource.ts'
import type {
  AdminCatalogTask,
  AdminEvaluationPlan,
  AdminMockExamMaterial,
  AdminUniversityResource,
  AiReviewRecord,
  FeedbackReplyDraft,
  ReferenceScrap,
} from '../types.ts'
import { buildDemoRecords } from './adminDemoFixture.ts'
import { canonicalStudentId, fixtureRoster } from './adminRosterFixture.ts'

// Admin Assessment In-memory Mock Store. 새로고침하면 처음 상태로 돌아간다 (Student Mock과 같은 정책, 브라우저 저장소 사용 안 함).
// - 학생 기록(수행평가·노트·결과물·피드백 요청·심화 탐구·성장 기록)과 공통 콘텐츠(60선·대학 PDF 27개·참고자료원 24곳·공통 Task)는
//   Student Canonical Fixture의 사본이다. 같은 ID·같은 값으로 시작하고 Admin 화면은 이 사본만 읽는다.
// - Admin만 가진 값: 담당 학생 명단, 답변 초안, 공개 상태·내부 메모, 스크랩, 관리자 평가계획서 개정본·검토 기록.
// - 학생 원본(노트·결과물)을 바꾸는 함수는 두지 않는다 (§35·36 GET만).

const catalogFromCanonical = (): AdminCatalogTask[] =>
  fixtureCatalog.map((item) => ({
    catalogTaskId: item.catalogTaskId,
    title: item.title,
    subjectId: item.subjectId,
    curriculumConcept: null,
    inquiryType: null,
    difficulty: null,
    problem: null,
    goal: item.goal,
    methods: [...item.methods],
    resources: [],
    expectedArtifacts: [],
    selfCheckItems: [],
    relatedMaterialIds: [],
    relatedExamQuestionIds: [],
    referenceSourceIds: [],
    publishState: item.published ? 'PUBLISHED' : 'DRAFT',
    updatedAt: '2026-10-01T09:00:00+09:00',
  }))

const mockExamFromCanonical = (): AdminMockExamMaterial[] =>
  withLocalMockExamPassages(structuredClone(fixtureMockExamResearch)).map((material) => ({
    material,
    // Student 앱이 60선을 모두 공개 소재로 보여주므로 같은 상태로 시작한다
    publishState: 'PUBLISHED',
    internalMemo: null,
    sourceLicenseNote: '원문 지문 재배포 권한 확인 전 (API-OD-A11). 원문은 로컬 개발 파일에서만 붙는다.',
    relatedCatalogTaskIds: [],
    referenceSourceIds: [],
    origin: 'CANONICAL_60',
    updatedAt: null,
    // 원문은 로컬 개발 파일이 있을 때만 시작값을 갖는다. 외부 AI 전송은 관리자가 이용 조건을 확인하기 전까지 막는다 (P-30)
    adminPassage: {
      text: material.research?.passage ?? '',
      origin: material.research?.passage ? 'LOCAL_FILE' : 'NONE',
      updatedAt: null,
      aiTransferAllowed: false,
    },
  }))

const universityFromCanonical = (): AdminUniversityResource[] =>
  structuredClone(universityExamDocuments).map((document) => ({
    document,
    // Student 앱이 27개를 모두 대학별 자료로 보여주므로 같은 상태로 시작한다. 공식 게시 주소·확인일은 원본 Manifest에 없어 비워 둔다.
    publishState: 'PUBLISHED',
    publisher: document.universityName,
    sourceUrl: null,
    checkedDate: null,
    licenseNote: '원본 PDF 공개 배포 권한 확인 전 (API-OD-A11, P-25). 개발 환경 로컬 파일로만 열람.',
    relatedCatalogTaskIds: [],
    updatedAt: null,
  }))

/** §38 목록 형태로 묶는다. Student Fixture의 문서 1개 = 관리자 평가계획서 1건의 첫 개정본 */
const plansFromCanonical = (): AdminEvaluationPlan[] =>
  fixtureEvaluationPlans.map((plan) => {
    const analysis = fixtureAnalysisResults[plan.documentRevisionId]
    return {
      planId: plan.planId,
      schoolId: plan.schoolId,
      academicYear: plan.academicYear,
      grade: plan.grade,
      semester: plan.semester,
      revisions: [
        {
          documentRevisionId: plan.documentRevisionId,
          revisionNumber: 1,
          fileName: plan.fileName,
          fileRef: `file_${plan.documentRevisionId}`,
          sizeBytes: null,
          sourceUrl: plan.sourceUrl,
          uploadedAt: plan.uploadedAt,
          analysisStatus: analysis ? analysis.status : 'FAILED',
          // Student Fixture의 reviewStatus는 문서 등록 상태다. 관리자 추출 검토는 분석이 끝난(COMPLETED) 문서만 확인 완료로 시작한다
          // (분석 실패·검토 필요 문서를 '확인 완료'로 보이지 않게)
          reviewStatus: plan.reviewStatus === 'CONFIRMED' && analysis?.status === 'COMPLETED' ? 'CONFIRMED' : 'UNREVIEWED',
          confirmedFields: [],
        },
      ],
    }
  })

/** 실제 확인된 자료원(24곳 중 2곳)을 저장한 예시 스크랩. 존재하지 않는 기사·논문을 만들지 않는다 */
const scrapsFromSources = (): ReferenceScrap[] =>
  ['ref_08', 'ref_09']
    .map((sourceId) => fixtureReferenceSources.find((source) => source.sourceId === sourceId))
    .filter((source) => source !== undefined)
    .map((source, index) => ({
      scrapId: `scrap_00${index + 1}`,
      title: source.name,
      sourceUrl: source.url,
      sourceName: source.name,
      referenceSourceId: source.sourceId,
      type: 'SITE',
      memo: index === 0 ? '통계 수치를 쓰는 사회 탐구 피드백에 추천' : '과학 실험 보고서의 선행 연구 찾기 안내용',
      tags: index === 0 ? ['통계', '사회'] : ['과학', '논문'],
      subjectIds: index === 0 ? ['subj_03'] : ['subj_02'],
      authorOrOrg: null,
      publishedDate: null,
      relatedCatalogTaskIds: [],
      relatedMaterialIds: [],
      createdAt: `2026-10-0${index + 2}T10:00:00+09:00`,
      updatedAt: `2026-10-0${index + 2}T10:00:00+09:00`,
    }))

export interface AdminMockStore {
  roster: typeof fixtureRoster
  /** studentId → 학기별 학업 정보. student_001만 Canonical 값이 있다 */
  academicContexts: Record<string, AcademicContext[]>
  /** 각 Record의 소유 학생 (Student Fixture는 로그인 학생 기준이라 studentId가 없다 → Admin Mock이 연결) */
  schoolAssessments: (SchoolAssessmentRecord & { studentId: string })[]
  enrichmentTasks: (EnrichmentTask & { studentId: string })[]
  growthRecords: (GrowthRecord & { studentId: string })[]
  notes: (NoteRecord & { studentId: string })[]
  artifacts: (ArtifactRecord & { studentId: string })[]
  artifactVersions: ArtifactVersionRecord[]
  feedbackRequests: (FeedbackRequestRecord & { studentId: string })[]
  replyDrafts: Record<string, FeedbackReplyDraft & { savedAt: string }>
  catalog: AdminCatalogTask[]
  mockExam: AdminMockExamMaterial[]
  university: AdminUniversityResource[]
  plans: AdminEvaluationPlan[]
  scraps: ReferenceScrap[]
  aiReviews: AiReviewRecord[]
}

const own = <T extends object>(items: T[]): (T & { studentId: string })[] =>
  structuredClone(items).map((item) => ({ ...item, studentId: canonicalStudentId }))

// 다학교 시연 학생(demo_ 접두, 합성 데이터)을 Canonical 학생 뒤에 붙인다. Canonical 값·ID는 바꾸지 않는다 (P-29)
const demo = buildDemoRecords(fixtureCatalog.map((item) => item.catalogTaskId))

export const adminStore: AdminMockStore = {
  roster: [...structuredClone(fixtureRoster), ...demo.roster],
  academicContexts: { [canonicalStudentId]: structuredClone(fixtureAcademicContexts), ...demo.academicContexts },
  schoolAssessments: [...own(fixtureSchoolAssessments), ...demo.schoolAssessments],
  enrichmentTasks: [...own(fixtureEnrichmentTasks), ...demo.enrichmentTasks],
  growthRecords: [...own(fixtureGrowthRecords), ...demo.growthRecords],
  notes: [...own(fixtureNotes), ...demo.notes],
  artifacts: [...own(fixtureArtifacts), ...demo.artifacts],
  artifactVersions: [...structuredClone(fixtureArtifactVersions), ...demo.artifactVersions],
  feedbackRequests: [...own(fixtureFeedbackRequests), ...demo.feedbackRequests],
  replyDrafts: {},
  catalog: catalogFromCanonical(),
  mockExam: mockExamFromCanonical(),
  university: universityFromCanonical(),
  plans: plansFromCanonical(),
  scraps: scrapsFromSources(),
  aiReviews: [],
}
