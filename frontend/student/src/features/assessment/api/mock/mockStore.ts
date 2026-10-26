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
import type { AcademicContext } from '../types.ts'

// 앱 Instance별 In-memory Store. 새로고침하면 Fixture 상태로 돌아간다 (assessment-frontend-mock.md §5).
// 브라우저 저장소를 쓰지 않으며 Admin 앱과 런타임 동기화하지 않는다.
export const mockStore: {
  academicContexts: AcademicContext[]
  schoolAssessments: SchoolAssessmentRecord[]
  notes: NoteRecord[]
  artifacts: ArtifactRecord[]
  artifactVersions: ArtifactVersionRecord[]
  feedbackRequests: FeedbackRequestRecord[]
} = {
  academicContexts: structuredClone(fixtureAcademicContexts),
  schoolAssessments: structuredClone(fixtureSchoolAssessments),
  notes: structuredClone(fixtureNotes),
  artifacts: structuredClone(fixtureArtifacts),
  artifactVersions: structuredClone(fixtureArtifactVersions),
  feedbackRequests: structuredClone(fixtureFeedbackRequests),
}
