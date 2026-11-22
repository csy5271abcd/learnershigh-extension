// Admin Assessment API (api-contract.md §33~47). 화면은 이 파일만 사용하고 Fixture·Store를 직접 import하지 않는다.
import * as http from './http/assessmentAdminHttp.ts'
import * as records from './http/adminRecordsHttp.ts'
import { getReferenceCatalogContent } from './canonicalSource.ts'
import * as mock from './mock/assessmentAdminMock.ts'
import { isAdminMockDataSource } from './mock/adminMockRuntime.ts'
import type { PlanStructurePreview, SchoolAssessment, StudentViewSource } from './types.ts'
// Stage 1: Contract 기반 Mock Adapter. Stage 2 (2026-11-09): 아래 Resource만 http Adapter로 바꿨다(VITE_ASSESSMENT_DATA_SOURCE=http).
// http로 바꾸지 않은 함수는 http 모드에서 Mock이 503 ASSESSMENT_API_NOT_CONNECTED로 끝난다(Mock 값을 돌려주지 않는다).
export {
  catalogSubjectOptions,
  getCatalogTaskMock as getCatalogTask,
  getMockExamMock as getMockExamMaterial,
  getUniversityMock as getUniversityResource,
  linkToCatalogTaskMock as linkToCatalogTask,
  listCatalogMock as listCatalog,
  listMockExamMock as listMockExamMaterials,
  listUniversityMock as listUniversityResources,
  mockExamPassageMaxLength,
  saveAiReviewMock as saveAiReview,
  saveCatalogTaskMock as saveCatalogTask,
  saveMockExamMock as saveMockExamMaterial,
  setCatalogPublishMock as setCatalogPublish,
  setMockExamPublishMock as setMockExamPublish,
  setUniversityPublishMock as setUniversityPublish,
  subjectNameOf,
  updateUniversityMock as updateUniversityResource,
  type CatalogTaskInput,
  type MockExamInput,
  type StudentListQuery,
  type UniversityMetaInput,
} from './mock/assessmentAdminMock.ts'
export { activeScenarioLabel, isAdminMockDataSource, mockAsOfDate } from './mock/adminMockRuntime.ts'
export { adminDevAuthLabel } from './http/adminHttpClient.ts'

// ---- Resource 단위 Mock / http 선택 ----
const useMock = isAdminMockDataSource
/** §34 학생별 학교 수행평가 (Student와 같은 Assessment ID·상태) */
export const listStudentSchoolAssessments: (studentId: string, term: { academicYear: number; semester: number }) => Promise<{ items: SchoolAssessment[]; totalElements?: number }> =
  useMock ? mock.listStudentSchoolAssessmentsMock : http.listStudentSchoolAssessmentsHttp
/** 담당 학교 목록: Backend Endpoint 없음 → http는 개발 설정이 있을 때만 (assessmentAdminHttp.ts) */
export const listSchools = useMock ? mock.listSchoolsMock : http.listSchoolsHttp
/** §33 Assessment 현황 (A12: http = 실제 DB 집계) */
export const getOverview = useMock ? mock.getOverviewMock : records.getOverviewHttp
export const listPlanYears = useMock ? mock.listPlanYearsMock : http.listPlanYearsHttp
/** §38 학교별 평가계획서 목록·개정 이력 */
export const listEvaluationPlans = useMock ? mock.listEvaluationPlansMock : http.listEvaluationPlansHttp
/** §38 PDF 등록 / 개정본 추가 (서버는 원본 바이트를 보관하지 않는다) */
export const uploadEvaluationPlan = useMock ? mock.uploadEvaluationPlanMock : http.uploadEvaluationPlanHttp
export const addPlanRevision = useMock ? mock.addPlanRevisionMock : http.addPlanRevisionHttp
/** §39 서버 분석 실행: http는 미구현 이유로 거절 */
export const requestPlanAnalysis = useMock ? mock.requestPlanAnalysisMock : http.requestPlanAnalysisHttp
/** 학교 이름으로 학교알리미 평가계획 불러오기 (등록 + 서버 분석). Mock 모드에는 학교알리미 연결이 없다. */
export const importFromSchoolInfo = useMock
  ? (_request: { schoolId: string; schoolName: string; academicYear: number; semester: number; defaultGrade: number | null }): Promise<import('./types.ts').SchoolInfoImportResult> =>
      Promise.reject(new Error('Mock 모드에서는 학교알리미 불러오기를 쓰지 않아요.'))
  : http.importFromSchoolInfoHttp
/** §38-11 불러오기 진행 상황 */
export const getSchoolInfoImport = useMock
  ? (_jobId: string): Promise<import('./types.ts').SchoolInfoImportResult> => Promise.reject(new Error('Mock 모드에서는 학교알리미 불러오기를 쓰지 않아요.'))
  : http.getSchoolInfoImportHttp
/** 로컬 분석기 결과 수신 (PROPOSED C-10, 개발 Flag 전용). Mock 모드에는 수신 대상 Revision이 없어 연결하지 않는다. */
export const importPlanAnalysis = useMock
  ? (_planId: string, _revisionId: string, _payload: unknown): Promise<unknown> => Promise.reject(new Error('Mock 모드에서는 분석 결과 수신을 쓰지 않아요.'))
  : http.importPlanAnalysisHttp
/** §39 분석 후보·확정값 조회 */
export const getPlanAnalysis = useMock ? mock.getPlanAnalysisMock : http.getPlanAnalysisHttp
/** §39 검토 확정: http는 과목 ID 매핑 UI가 없어 연결 전 (C-7) */
export const savePlanReview = useMock ? mock.savePlanReviewMock : http.savePlanReviewHttp
/** §39 PUT review: 원본 대조·과목 ID·필드 확인을 거치는 http 전용 검토 화면에서만 쓴다(Mock 모드에는 이 화면이 없다) */
export const confirmPlanReview = http.confirmPlanReviewHttp
// A5 공유 검토 초안: 서버 전용(Mock 데이터 모드의 이전 검토 화면은 쓰지 않는다)
export const getPlanReviewDraft = http.getPlanReviewDraftHttp
export const getTeachingPlanDraft = http.getTeachingPlanDraftHttp
export const saveTeachingPlanDraft = http.saveTeachingPlanDraftHttp
// A6 운영계획 확정 (§39-6): 서버 기능이라 Mock 대체 없음(Mock 데이터 모드에서는 이 단계를 쓰지 않는다)
export const getTeachingPlanReview = http.getTeachingPlanReviewHttp
export const getPlanSubjects = http.getPlanSubjectsHttp
// A9 학년도별 열람 (기존 API 조합, Mock 대체 없음)
export const getPlanArchiveDetail = http.getPlanArchiveDetailHttp
export const listPlanYearsRegistered = (schoolId: string) => http.listPlanYearsHttp(schoolId, false)
export const confirmTeachingPlan = http.confirmTeachingPlanHttp
export const savePlanReviewDraft = http.savePlanReviewDraftHttp
/** A12 재검토 시작·확정 이력 (§39-8) */
export const reopenPlanReviewDraft = http.reopenPlanReviewDraftHttp
export const getPlanReviewHistory = http.getPlanReviewHistoryHttp
/** A13 운영계획 재검토 시작·확정 이력 (§39-10) */
export const reopenTeachingPlanDraft = http.reopenTeachingPlanDraftHttp
export const getTeachingPlanHistory = http.getTeachingPlanHistoryHttp
export const createTeachingPlanManualRow = http.createTeachingPlanManualRowHttp
export const updateTeachingPlanManualRow = http.updateTeachingPlanManualRowHttp
// A5 학교 검색: Mock 데이터 모드에는 Backend가 없어 빈 결과(전체 학교 아님 표시 유지)
export const searchSchools = useMock ? () => Promise.resolve({ coverage: 'REGISTERED_PLANS_ONLY', masterConnected: false, truncated: false, items: [] }) : http.searchSchoolsHttp
/** S-4 (http만) 평가계획서 원문 미리보기·내려받기. Mock에는 실제 파일이 없다 */
export const previewPlanRevision = useMock
  ? (_planId: string, _revisionId: string): Promise<Blob> => Promise.reject(new Error('시연 데이터에는 실제 원문 파일이 없어요.'))
  : http.previewPlanRevisionHttp
export const getPlanStructure = useMock
  ? (_planId: string, _revisionId: string): Promise<PlanStructurePreview> => Promise.reject(new Error('시연 데이터에는 실제 원문 파일이 없어요.'))
  : http.getPlanStructureHttp
/** §38-9 평가계획서 삭제(A25). 시연(Mock) 데이터는 서버 기록이 없어 지우지 않는다 */
export const deleteEvaluationPlan = useMock
  ? (_planId: string, _schoolId: string, _confirmPublished: boolean): Promise<http.PlanDeleteResult> => Promise.reject(new Error('시연 데이터는 삭제할 수 없어요.'))
  : http.deleteEvaluationPlanHttp
export const downloadPlanRevision = useMock
  ? (_planId: string, _revisionId: string): Promise<Blob> => Promise.reject(new Error('시연 데이터에는 실제 원문 파일이 없어요.'))
  : http.downloadPlanRevisionHttp

/**
 * 대학별 기출 PDF 원문 주소. 원본은 Git에 없고 개발 서버의 개발 전용 경로가 로컬 파일을 Manifest 해시 확인 뒤 내보낸다.
 * Admin 개발 서버도 Student와 같은 Plugin(student/tools/universityExamPdfDevServer.ts)으로 직접 제공한다 (Student 서버 불필요). Build 결과물에는 PDF가 없다.
 */
export const universityExamFileUrl = (documentId: string) => `/__dev/university-exams/files/${encodeURIComponent(documentId)}.pdf`

export type UniversityFileState = 'AVAILABLE' | 'MISSING' | 'CHANGED'

/** 원문 파일 상태. 개발 서버 경로가 없으면(Build 미리보기 등) null (파일 없음과 구분) */
export async function getUniversityFileStates(): Promise<Record<string, UniversityFileState> | null> {
  try {
    const response = await fetch('/__dev/university-exams/status', { cache: 'no-store' })
    if (!response.ok) return null
    const body = (await response.json()) as { documents: { documentId: string; state: UniversityFileState }[] }
    return Object.fromEntries(body.documents.map((document) => [document.documentId, document.state]))
  } catch {
    return null
  }
}

// ---- 학생 기록·피드백·참고자료실 (2026-11-11 http 연결, §34·35·36·43·44·45) ----
// Mock과 http는 같은 계약 Shape을 쓴다. Student 앱과 같은 DB 기록을 읽는다(Surface별 Mock Store 아님).
export const listStudents = useMock ? mock.listStudentsMock : records.listStudentsHttp
/** 학생 목록 필터 선택지: http는 서버 담당 학생 목록에서 계산 (2026-11-12, 이전에는 Mock 고정이라 http에서 학교가 비었음) */
export const getStudentFilterOptions = useMock ? mock.getStudentFilterOptionsMock : records.getStudentFilterOptionsHttp
/** 학생 화면 보기: Mock은 Snapshot, http는 관리자 읽기 전용 경로(httpStudentId)로 Student 화면이 직접 조회한다 */
export const getStudentViewSnapshot: (studentId: string) => Promise<StudentViewSource> = useMock
  ? mock.getStudentViewSnapshotMock
  : records.getStudentViewSourceHttp
export const getStudent = useMock ? mock.getStudentMock : records.getStudentHttp
export const getActivitySummary = useMock ? mock.getActivitySummaryMock : records.getActivitySummaryHttp
export const getStudentSource = useMock ? mock.getStudentSourceMock : records.getStudentSourceHttp
export const listStudentNotes = useMock ? mock.listStudentNotesMock : records.listStudentNotesHttp
export const listStudentArtifacts = useMock ? mock.listStudentArtifactsMock : records.listStudentArtifactsHttp
export const listStudentGrowthRecords = useMock ? mock.listStudentGrowthRecordsMock : records.listStudentGrowthRecordsHttp
export const listFeedbackRequests = useMock ? mock.listFeedbackRequestsMock : records.listFeedbackRequestsHttp
export const getFeedbackRequest = useMock ? mock.getFeedbackRequestMock : records.getFeedbackRequestHttp
export const saveReplyDraft = useMock ? mock.saveReplyDraftMock : records.saveReplyDraftHttp
export const deliverReply = useMock ? mock.deliverReplyMock : records.deliverReplyHttp
export const listScraps = useMock ? mock.listScrapsMock : records.listScrapsHttp
export const saveScrap = useMock ? mock.saveScrapMock : records.saveScrapHttp
export const compareArtifactVersions = useMock ? mock.compareArtifactVersionsMock : records.compareArtifactVersionsHttp
/** §26 (http만) 앱 안 미리보기·원본. Mock에는 실제 파일이 없다 */
export const previewArtifactVersion = useMock
  ? (_artifactId: string, _versionId: string): Promise<Blob> => Promise.reject(new Error('시연 데이터에는 실제 파일이 없어요.'))
  : records.previewArtifactVersionHttp
export const downloadArtifactVersion = useMock
  ? (_artifactId: string, _versionId: string): Promise<Blob> => Promise.reject(new Error('시연 데이터에는 실제 파일이 없어요.'))
  : records.downloadArtifactVersionHttp
/** http: 휴지통으로 이동(복원 가능). Mock: 기존 Mock 삭제 */
export const deleteScrap = useMock ? mock.deleteScrapMock : records.deleteScrapHttp
/** 관리자 참고자료 휴지통 (http만. Mock에는 휴지통이 없다) */
export const listScrapTrash = useMock
  ? () => Promise.resolve({ items: [] as { scrap: import('./types.ts').ReferenceScrap; deletedAt: string }[] })
  : records.listScrapTrashHttp
export const restoreScrap = useMock ? (_scrapId: string) => Promise.reject(new Error('Mock에는 휴지통이 없어요.')) : records.restoreScrapHttp
/** 참고자료 학생 공개/비공개 (http 전용, Mock에는 공개 상태가 없다) */
export const setScrapPublished = useMock
  ? (_scrapId: string, _published: boolean): Promise<never> => Promise.reject(new Error('Mock 모드에서는 공개 상태를 바꾸지 않아요.'))
  : records.setScrapPublishedHttp
export const adminRecordsHttpConnected = !useMock
/** 심화 Task는 2026-11-03 범위 축소로 폐기. http에서는 학생 Task가 없으므로 빈 목록 */
export const listStudentEnrichmentTasks = useMock
  ? mock.listStudentEnrichmentTasksMock
  : (_studentId: string): ReturnType<typeof mock.listStudentEnrichmentTasksMock> =>
      Promise.resolve({ items: [] }) as ReturnType<typeof mock.listStudentEnrichmentTasksMock>
/** 추천 사이트(자료원 카탈로그)는 서버 없는 정적 콘텐츠다(P-24). http에서도 Student와 같은 정적 원천을 읽는다. */
export const getReferenceCatalog = useMock
  ? mock.getReferenceCatalogMock
  : (): ReturnType<typeof mock.getReferenceCatalogMock> =>
      Promise.resolve(getReferenceCatalogContent()) as ReturnType<typeof mock.getReferenceCatalogMock>
