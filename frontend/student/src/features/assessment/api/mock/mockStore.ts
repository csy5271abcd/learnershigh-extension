import { fixtureAcademicContexts, fixtureSchoolAssessments, type SchoolAssessmentRecord } from './assessmentFixture.ts'
import {
  fixtureArtifacts,
  fixtureArtifactVersions,
  fixtureFeedbackRequests,
  fixtureNotes,
  type ArtifactRecord,
  type ArtifactVersionRecord,
  type FeedbackRequestRecord,
  type NoteRecord,
} from './assessmentDetailFixture.ts'
import { fixtureCatalog, fixtureEnrichmentTasks, fixturePersonalMockExamMaterials } from './enrichmentFixture.ts'
import { fixtureMockExamResearch } from './mockExamResearchFixture.ts'
import { withLocalMockExamPassages } from './mockExamPassages.ts'
import { fixtureResources } from './resourcesFixture.ts'
import { withStoredStudentSubjects } from './studentSubjectStore.ts'
import { universityResourcesFromExams } from './universityExamMock.ts'
import { fixtureFavorites, fixtureGrowthRecords } from './growthArchiveFixture.ts'
import { fixtureEvaluationPlans } from './evaluationPlansFixture.ts'
import type { EvaluationPlanAnalysisRecord, EvaluationPlanUploadRecord } from './evaluationPlansMock.ts'
import type {
  AcademicContext,
  ArchiveFavoriteRequest,
  EvaluationPlan,
  EnrichmentCatalogItem,
  EnrichmentTask,
  GrowthRecord,
  PersonalReview,
  MockExamMaterial,
  PersonalMockExamMaterial,
  StudentResource,
  UniversityResource,
} from '../types.ts'

// 앱 Instance별 In-memory Store. 새로고침하면 Fixture 상태로 돌아간다 (assessment-frontend-mock.md §5).
// 예외: 학생이 이 학기에 추가한 과목만 이 브라우저 저장소에서 다시 붙인다 (studentSubjectStore.ts, 2026-10-28 P-26).
// 그 밖의 데이터는 브라우저 저장소를 쓰지 않으며 Admin 앱과 런타임 동기화하지 않는다.
export const mockStore: {
  academicContexts: AcademicContext[]
  schoolAssessments: SchoolAssessmentRecord[]
  notes: NoteRecord[]
  artifacts: ArtifactRecord[]
  artifactVersions: ArtifactVersionRecord[]
  feedbackRequests: FeedbackRequestRecord[]
  enrichmentCatalog: EnrichmentCatalogItem[]
  enrichmentTasks: EnrichmentTask[]
  mockExamMaterials: MockExamMaterial[]
  personalMockExamMaterials: PersonalMockExamMaterial[]
  universityResources: UniversityResource[]
  resources: StudentResource[]
  growthRecords: GrowthRecord[]
  favorites: ArchiveFavoriteRequest[]
  /** 즐겨찾기한 시각 (`sourceType:sourceId`). §30에 없어 라이브러리 콘텐츠 정렬에만 쓰는 Mock 내부 값 */
  favoriteMarkedAt: Record<string, string>
  evaluationPlans: EvaluationPlan[]
  evaluationPlanUploads: EvaluationPlanUploadRecord[]
  evaluationPlanAnalyses: EvaluationPlanAnalysisRecord[]
  personalReviews: PersonalReview[]
} = {
  academicContexts: withStoredStudentSubjects(structuredClone(fixtureAcademicContexts)),
  schoolAssessments: structuredClone(fixtureSchoolAssessments),
  notes: structuredClone(fixtureNotes),
  artifacts: structuredClone(fixtureArtifacts),
  artifactVersions: structuredClone(fixtureArtifactVersions),
  feedbackRequests: structuredClone(fixtureFeedbackRequests),
  enrichmentCatalog: structuredClone(fixtureCatalog),
  enrichmentTasks: structuredClone(fixtureEnrichmentTasks),
  // 공개 추천 소재 = 모의고사 60선 (2026-10-28). 예전 시연 카드는 retiredMockExamMaterials로 상세 조회만 된다.
  mockExamMaterials: withLocalMockExamPassages(structuredClone(fixtureMockExamResearch)),
  personalMockExamMaterials: structuredClone(fixturePersonalMockExamMaterials),
  // §27 대학 자료 = 대학별 기출 PDF 카탈로그(2026-10-28, SNU·KAIST 실제 PDF). 예전 가상 대학 시연 자료는 지웠다.
  universityResources: universityResourcesFromExams(),
  resources: structuredClone(fixtureResources),
  growthRecords: structuredClone(fixtureGrowthRecords),
  favorites: structuredClone(fixtureFavorites),
  favoriteMarkedAt: {},
  evaluationPlans: structuredClone(fixtureEvaluationPlans),
  evaluationPlanUploads: [],
  evaluationPlanAnalyses: [],
  personalReviews: [],
}
