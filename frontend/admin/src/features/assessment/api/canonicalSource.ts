// Student Assessment Canonical Fixture·공통 Type의 Admin 쪽 유일한 입구 (2026-10-29, P-27 PROPOSED).
//
// - Student와 Admin이 같은 학생·수행평가·노트·결과물·피드백·콘텐츠 ID를 쓰도록 Student의 Fixture를 **그대로** 읽는다
//   (domain.md §25, assessment-frontend-mock.md §4). Admin에 같은 콘텐츠를 다시 적지 않는다 (Surface별 복제 금지).
// - 승인된 공유 위치(`frontend/shared/assessment/`, 4-2 A안)가 아직 없어 임시로 Student 경로를 import한다 (4-2 B안).
//   Admin 코드에서 `frontend/student/**`를 import하는 곳은 이 파일과 `canonicalUi.ts` 두 곳뿐이다. 공유 위치가 승인되면 이 두 파일의 경로만 바꾼다.
// - 여기서 내보내는 값은 읽기 전용 원본이다. Admin Mock Store는 structuredClone한 사본만 바꾼다 (Student Fixture 객체를 고치지 않는다).
// - 두 앱은 Origin이 달라(5173 / 5174) 런타임 상태를 공유하지 않는다. 학생이 Student 앱에서 바꾼 내용은 Admin에 보이지 않는다 (Stage 2 Backend로 검증).

export { ApiError, toApiError } from '../../../../../student/src/features/assessment/api/apiError.ts'
export type * from '../../../../../student/src/features/assessment/api/types.ts'

export {
  fixtureAcademicContexts,
  fixtureAsOfDate,
  fixtureCurrentTerm,
  fixtureSchoolAssessments,
  type SchoolAssessmentRecord,
} from '../../../../../student/src/features/assessment/api/mock/assessmentFixture.ts'
export {
  fixtureArtifacts,
  fixtureArtifactVersions,
  fixtureFeedbackRequests,
  fixtureNotes,
  type ArtifactRecord,
  type ArtifactVersionRecord,
  type FeedbackRequestRecord,
  type NoteRecord,
  type NoteRevisionRecord,
} from '../../../../../student/src/features/assessment/api/mock/assessmentDetailFixture.ts'
export { fixtureCatalog, fixtureEnrichmentTasks } from '../../../../../student/src/features/assessment/api/mock/enrichmentFixture.ts'
export { fixtureAnalysisResults, fixtureEvaluationPlans } from '../../../../../student/src/features/assessment/api/mock/evaluationPlansFixture.ts'
export { fixtureFavorites, fixtureGrowthRecords } from '../../../../../student/src/features/assessment/api/mock/growthArchiveFixture.ts'
export { fixtureResources } from '../../../../../student/src/features/assessment/api/mock/resourcesFixture.ts'
// 학생 화면 읽기 전용 보기 (요청 ⑧, P-28): 모드 전환·한 학생 기록 주입·이전 조회 결과 비우기
export { blockedWriteAttempts, setAssessmentViewMode } from '../../../../../student/src/features/assessment/api/viewMode.ts'
export { configureAdminReadOnlyView } from '../../../../../student/src/features/assessment/api/http/assessmentHttpClient.ts'
export { loadReadOnlyStudentSnapshot, type ReadOnlyStudentSnapshot } from '../../../../../student/src/features/assessment/api/mock/readOnlyViewStore.ts'
export { clearApiQueryCache } from '../../../../../student/src/features/assessment/model/useApiQuery.ts'
export { fixtureMockExamResearch, mockExamResearchSourceHash } from '../../../../../student/src/features/assessment/api/mock/mockExamResearchFixture.ts'
// 원문 지문은 Git 제외 로컬 파일이 있을 때만 붙는다 (Student와 같은 정책, P-24). Admin도 같은 함수로 붙인다.
export { withLocalMockExamPassages } from '../../../../../student/src/features/assessment/api/mock/mockExamPassages.ts'
export {
  fixtureReferenceAreas,
  fixtureReferenceSources,
  referenceSourcesBasis,
} from '../../../../../student/src/features/assessment/api/mock/referenceSourcesFixture.ts'
export { universityExamDocuments } from '../../../../../student/src/features/assessment/api/mock/universityExamMock.ts'

// 화면 표시 규칙도 Student와 같아야 하는 것만 가져온다 (과목명·출처 줄·문항 라벨).
export { mockExamSubjectName, mockExamSubjects } from '../../../../../student/src/features/assessment/model/enrichmentView.ts'
export { examLine, gradeLabel, gradeKey, periodKey, periodLabel, subjectBadge } from '../../../../../student/src/features/assessment/model/mockExamResearchView.ts'
export {
  answerSectionKinds,
  examCategoryLabels,
  examSectionLabels,
  formatFileSize,
  pageRangeLabel,
  questionAtPage,
  questionDisplayLabel,
  universityLine,
} from '../../../../../student/src/features/assessment/model/universityExamView.ts'
export { areaLabel, sourcesForArea, areasOfSource } from '../../../../../student/src/features/assessment/model/referenceAreas.ts'
// 수행평가 상세 표시 규칙 (Student 상세와 같은 값·같은 문구, 시연 피드백 ③)
export { sourceLabel, statusLabels } from '../../../../../student/src/features/assessment/model/schoolAssessmentView.ts'
export { matchSubject } from '../../../../../student/src/features/assessment/model/pdfImportView.ts'
export { candidateStatusLabel, sourcePageLabel } from '../../../../../student/src/features/assessment/model/evaluationItemCandidate.ts'

// 평가계획서 로컬 분석기 개발 Client (2026-11-11, 개발 Flag 전용). Student와 같은 Client·같은 오류 구분을 쓴다(복제 금지).
// 토큰은 개발 서버 Proxy(Node)에서만 붙는다. 운영 Build에서는 Flag 분기와 함께 빠진다.
export {
  AnalysisPreviewError,
  analysisPreviewMaxBytes,
  checkAnalyzerHealth,
  fileSha256,
  requestAnalysisPreview,
  sniffFormat,
  type AnalysisPreviewResponse,
} from '../../../../../student/src/features/assessment/api/dev/analysisPreviewClient.ts'
// 과목별 참고자료 자료원 카탈로그 (정적 콘텐츠, P-24). Student와 같은 원천을 읽는다(2026-11-11).
export { getReferenceCatalogContent } from '../../../../../student/src/features/assessment/content/enrichmentContent.ts'
// 심화 탐구 정적 콘텐츠 (assessment-enrichment-content.md §4·§6, 2026-11-12). Admin 심화 탐구는 Student와 **같은 함수·같은 원천**을 읽는다.
// Backend·dataSource(mock|http)와 무관하다. Admin에 콘텐츠 배열을 따로 두지 않는다.
export {
  catalogSubjectLabels,
  getCatalogContent,
  getMockExamContent,
  getUniversityExamContent,
  listCatalogContent,
  listMockExamContent,
  listUniversityExamContent,
  mockExamPassageCount,
  type EnrichmentContentItem,
} from '../../../../../student/src/features/assessment/content/enrichmentContent.ts'
export { mockExamSourceLabel } from '../../../../../student/src/features/assessment/model/enrichmentView.ts'
