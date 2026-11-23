import type { ArchiveFavoriteRequest, AcademicContext, EnrichmentTask, GrowthRecord, StudentResource } from '../types.ts'
import type { SchoolAssessmentRecord } from './assessmentFixture.ts'
import type { ArtifactRecord, ArtifactVersionRecord, FeedbackRequestRecord, NoteRecord } from './assessmentDetailFixture.ts'
import { mockStore } from './mockStore.ts'

// Admin "학생 화면 보기"(읽기 전용) 전용 데이터 입구 (2026-10-29, P-28 PROPOSED).
// Admin 번들 안의 Student Mock Store 사본에만 한 학생의 기록을 넣는다. Student 앱(별도 Origin·번들)의 Store와 섞이지 않는다.
// 호출자는 Admin Read-only Adapter이며, 담당 범위 검사(403)를 통과한 학생의 기록만 넘긴다. Student 앱은 이 함수를 쓰지 않는다.
// 공통 콘텐츠(탐구 라이브러리·모의고사 60선·대학별 자료·평가계획서)는 Store의 기존 값을 그대로 쓴다.

export interface ReadOnlyStudentSnapshot {
  academicContexts: AcademicContext[]
  schoolAssessments: SchoolAssessmentRecord[]
  notes: NoteRecord[]
  artifacts: ArtifactRecord[]
  artifactVersions: ArtifactVersionRecord[]
  feedbackRequests: FeedbackRequestRecord[]
  enrichmentTasks: EnrichmentTask[]
  growthRecords: GrowthRecord[]
  /** 학생 자료함. Admin에 원천이 없는 학생은 빈 배열 (없는 자료를 만들지 않는다) */
  resources: StudentResource[]
  favorites: ArchiveFavoriteRequest[]
}

export function loadReadOnlyStudentSnapshot(snapshot: ReadOnlyStudentSnapshot) {
  const copy = structuredClone(snapshot)
  mockStore.academicContexts = copy.academicContexts
  mockStore.schoolAssessments = copy.schoolAssessments
  mockStore.notes = copy.notes
  mockStore.artifacts = copy.artifacts
  mockStore.artifactVersions = copy.artifactVersions
  mockStore.feedbackRequests = copy.feedbackRequests
  mockStore.enrichmentTasks = copy.enrichmentTasks
  mockStore.growthRecords = copy.growthRecords
  mockStore.resources = copy.resources
  mockStore.favorites = copy.favorites
  // 학생 개인 업로드·검토·개인 소재는 Admin Read-only Adapter에 원천이 없어 비운다 (다른 학생 값이 남지 않게)
  mockStore.favoriteMarkedAt = {}
  mockStore.personalMockExamMaterials = []
  mockStore.evaluationPlanUploads = []
  mockStore.evaluationPlanAnalyses = []
  mockStore.personalReviews = []
}
