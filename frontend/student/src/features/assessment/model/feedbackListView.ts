import {
  getFeedbackReply,
  getNoteRevision,
  listArtifacts,
  listArtifactVersions,
  listFeedbackRequests,
  listNoteRevisions,
  listNotes,
} from '../api/assessmentDetailApi.ts'
import { listSchoolAssessments } from '../api/schoolAssessmentApi.ts'
import type {
  AcademicTermQuery,
  Artifact,
  ArtifactVersion,
  FeedbackReplyResponse,
  FeedbackRequest,
  FeedbackRequestStatus,
  NoteRevisionDetail,
  PageResponse,
  SchoolAssessment,
} from '../api/types.ts'

// 선생님 피드백 목록 (screen-map S15, feedback §8 ST-15).
// §31 목록 항목에는 어떤 과제의 요청인지(sourceType·sourceId)가 없어(MM-19), 학기별 수행평가(§12)의 노트 Revision(§20·21)과
// 요청 Snapshot의 noteRevisionId를 맞춰 과제를 찾는다. 계약에 없는 필드를 만들지 않기 위한 조합이며,
// P-15로 §31에 source가 들어오면 이 조합은 지운다.

const pageSize = 100

export type FeedbackFilter = 'ALL' | FeedbackRequestStatus

export function parseFeedbackFilter(value: string | null): FeedbackFilter {
  return value === 'PENDING' || value === 'DELIVERED' ? value : 'ALL'
}

export interface SnapshotFile {
  versionId: string
  /** 요청 당시 버전. 과제를 못 찾았거나 버전이 사라졌으면 없다. */
  artifact?: Artifact
  version?: ArtifactVersion
  /** 이 결과물의 지금 최신 버전 번호 (요청 당시와 구분해 보여주기 위함) */
  latestVersionNumber?: number
}

export interface FeedbackListEntry {
  request: FeedbackRequest
  /** §32. 답변 대기면 null (요청하지 않는다) */
  reply: FeedbackReplyResponse | null
  /** 요청한 학교 수행평가. 불러온 학기에서 찾지 못하면 없다. */
  assessment?: SchoolAssessment
  /** 요청 당시 노트 Revision 본문 (불변) */
  noteRevision?: NoteRevisionDetail
  latestRevisionNumber?: number
  files: SnapshotFile[]
}

export interface FeedbackOverview {
  entries: FeedbackListEntry[]
  counts: Record<FeedbackFilter, number>
}

async function listAllFeedbackRequests(): Promise<FeedbackRequest[]> {
  const first = await listFeedbackRequests({ page: 0, size: pageSize })
  const rest: PageResponse<FeedbackRequest>[] = await Promise.all(
    Array.from({ length: Math.max(0, first.page.totalPages - 1) }, (_, index) =>
      listFeedbackRequests({ page: index + 1, size: pageSize }),
    ),
  )
  return [first, ...rest].flatMap((page) => page.items)
}

async function listTermAssessments(terms: AcademicTermQuery[]): Promise<SchoolAssessment[]> {
  const pages = await Promise.all(
    terms.map((term) => listSchoolAssessments({ academicYear: term.academicYear, semester: term.semester, page: 0, size: pageSize })),
  )
  return pages.flatMap((page) => page.items)
}

interface SourceNote {
  assessment: SchoolAssessment
  noteId: string
  latestRevisionNumber: number
  revisionIds: Set<string>
}

async function loadSourceNotes(assessments: SchoolAssessment[]): Promise<SourceNote[]> {
  const perAssessment = await Promise.all(
    assessments.map(async (assessment) => {
      const { items } = await listNotes('SCHOOL_ASSESSMENT', assessment.assessmentId)
      return Promise.all(
        items.map(async (note): Promise<SourceNote> => {
          const revisions = (await listNoteRevisions(note.noteId)).items
          return {
            assessment,
            noteId: note.noteId,
            latestRevisionNumber: note.revisionNumber,
            revisionIds: new Set(revisions.map((revision) => revision.revisionId)),
          }
        }),
      )
    }),
  )
  return perAssessment.flat()
}

async function loadArtifactVersions(assessmentId: string): Promise<{ artifact: Artifact; versions: ArtifactVersion[] }[]> {
  const { items } = await listArtifacts('SCHOOL_ASSESSMENT', assessmentId)
  return Promise.all(items.map(async (artifact) => ({ artifact, versions: (await listArtifactVersions(artifact.artifactId)).items })))
}

/**
 * 요청 목록 + 각 요청의 과제·요청 당시 노트/파일·답변을 한 번에 불러온다.
 * 하나라도 실패하면 오류로 돌려준다 (일부만 비어 있는 목록을 정상처럼 보여주지 않는다).
 */
export async function loadFeedbackOverview(terms: AcademicTermQuery[]): Promise<FeedbackOverview> {
  const [requests, assessments] = await Promise.all([listAllFeedbackRequests(), listTermAssessments(terms)])
  const sourceNotes = await loadSourceNotes(assessments)
  const sourceOf = (request: FeedbackRequest) =>
    sourceNotes.find((source) => source.revisionIds.has(request.snapshot.noteRevisionId))

  const requestedSourceIds = new Set(requests.flatMap((request) => sourceOf(request)?.assessment.assessmentId ?? []))
  const artifactsBySource = new Map(
    await Promise.all(
      [...requestedSourceIds].map(async (assessmentId) => [assessmentId, await loadArtifactVersions(assessmentId)] as const),
    ),
  )

  const entries = await Promise.all(
    requests.map(async (request): Promise<FeedbackListEntry> => {
      const source = sourceOf(request)
      const [noteRevision, reply] = await Promise.all([
        source ? getNoteRevision(source.noteId, request.snapshot.noteRevisionId) : undefined,
        request.status === 'DELIVERED' ? getFeedbackReply(request.requestId) : null,
      ])
      const artifacts = source ? (artifactsBySource.get(source.assessment.assessmentId) ?? []) : []
      const files = request.snapshot.artifactVersionIds.map((versionId): SnapshotFile => {
        const owner = artifacts.find(({ versions }) => versions.some((version) => version.versionId === versionId))
        return {
          versionId,
          artifact: owner?.artifact,
          version: owner?.versions.find((version) => version.versionId === versionId),
          latestVersionNumber: owner ? Math.max(...owner.versions.map((version) => version.versionNumber)) : undefined,
        }
      })
      return {
        request,
        reply,
        assessment: source?.assessment,
        noteRevision,
        latestRevisionNumber: source?.latestRevisionNumber,
        files,
      }
    }),
  )

  entries.sort((a, b) => b.request.requestedAt.localeCompare(a.request.requestedAt))
  const pending = entries.filter((entry) => entry.request.status === 'PENDING').length
  return {
    entries,
    counts: { ALL: entries.length, PENDING: pending, DELIVERED: entries.length - pending },
  }
}

/** 추천 유형 표시 이름 (§46 예시 type만. 그 밖의 값은 그대로 '추천'으로 묶는다) */
export function recommendationLabel(type: string): string {
  if (type === 'ENRICHMENT_TASK') return '추천 활동'
  if (type === 'RESOURCE') return '추천 자료'
  return '추천'
}

/** 위치별 의견의 위치 표시. 위치가 없으면 문서 전체 의견이다. */
export function commentLocationLabel(location: { type: string; pageNumber?: number } | null | undefined): string {
  if (!location) return '문서 전체'
  if (location.type === 'PDF_PAGE' && location.pageNumber !== undefined) return `${location.pageNumber}쪽`
  if (location.type === 'NOTE_BLOCK') return '노트 블록'
  return '지정 위치'
}

export function snapshotFileLabel(file: SnapshotFile): string {
  if (!file.artifact || !file.version) return '결과 파일 · 버전 정보를 찾을 수 없어요'
  return `결과 파일 · ${file.artifact.title} v${file.version.versionNumber} (${file.version.file.fileName})`
}
