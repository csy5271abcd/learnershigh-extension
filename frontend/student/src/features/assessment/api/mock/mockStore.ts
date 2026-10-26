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
import {
  fixtureCatalog,
  fixtureEnrichmentTasks,
  fixtureMockExamMaterials,
  fixturePersonalMockExamMaterials,
  fixtureUniversityResources,
} from './enrichmentFixture.ts'
import { fixtureResources } from './resourcesFixture.ts'
import { fixtureFavorites, fixtureGrowthRecords } from './growthArchiveFixture.ts'
import type {
  AcademicContext,
  ArchiveFavoriteRequest,
  EnrichmentCatalogItem,
  EnrichmentTask,
  GrowthRecord,
  MockExamMaterial,
  PersonalMockExamMaterial,
  StudentResource,
  UniversityResource,
} from '../types.ts'

// 앱 Instance별 In-memory Store. 새로고침하면 Fixture 상태로 돌아간다 (assessment-frontend-mock.md §5).
// 브라우저 저장소를 쓰지 않으며 Admin 앱과 런타임 동기화하지 않는다.
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
} = {
  academicContexts: structuredClone(fixtureAcademicContexts),
  schoolAssessments: structuredClone(fixtureSchoolAssessments),
  notes: structuredClone(fixtureNotes),
  artifacts: structuredClone(fixtureArtifacts),
  artifactVersions: structuredClone(fixtureArtifactVersions),
  feedbackRequests: structuredClone(fixtureFeedbackRequests),
  enrichmentCatalog: structuredClone(fixtureCatalog),
  enrichmentTasks: structuredClone(fixtureEnrichmentTasks),
  mockExamMaterials: structuredClone(fixtureMockExamMaterials),
  personalMockExamMaterials: structuredClone(fixturePersonalMockExamMaterials),
  universityResources: structuredClone(fixtureUniversityResources),
  resources: structuredClone(fixtureResources),
  growthRecords: structuredClone(fixtureGrowthRecords),
  favorites: structuredClone(fixtureFavorites),
}
