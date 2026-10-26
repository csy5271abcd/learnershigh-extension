import type {
  AssessmentSourceType,
  FeedbackReplyResponse,
  FeedbackRequest,
  NoteBlock,
} from '../types.ts'

// 수행평가 상세용 Canonical Fixture (Stage 1, 시연 데이터). assessmentFixture.ts와 같은 ID 체계를 쓴다.
// Shape은 api-contract.md §20·21·24·25·31·32를 따른다. 화면은 이 파일을 직접 import하지 않는다.
// 노트 블록은 계약 예시에 있는 HEADING·PARAGRAPH만 쓴다 (나머지 블록 형식은 OD-A05).

export interface NoteRevisionRecord {
  revisionId: string
  revisionNumber: number
  savedAt: string
  title: string
  blocks: NoteBlock[]
}

export interface NoteRecord {
  noteId: string
  sourceType: AssessmentSourceType
  sourceId: string
  /** 오래된 순. 과거 Revision은 바뀌지 않는다 (§21). */
  revisions: NoteRevisionRecord[]
}

const heading = (blockId: string, text: string): NoteBlock => ({ blockId, type: 'HEADING', text })
const paragraph = (blockId: string, text: string): NoteBlock => ({ blockId, type: 'PARAGRAPH', text })

const claimBlocksV1 = [
  heading('block_001', '📌 내 주장'),
  paragraph('block_002', 'AI 학습도구는 수업에서 보조 수단으로만 써야 한다.'),
]
const claimBlocksV2 = [
  ...claimBlocksV1,
  heading('block_003', '🔍 매체 비교'),
  paragraph('block_004', '같은 주제라도 제목에서 강조하는 단어가 달랐다. 기사 작성자와 발행일을 함께 확인하기.'),
]
const claimBlocksV3 = [
  ...claimBlocksV2,
  heading('block_005', '💭 나의 생각과 결론'),
  paragraph(
    'block_006',
    'AI 도구는 질문을 정리하고 자료를 찾는 데는 도움이 되지만, 글의 주장은 내가 직접 세워야 한다.',
  ),
]

export const fixtureNotes: NoteRecord[] = [
  {
    noteId: 'note_001',
    sourceType: 'SCHOOL_ASSESSMENT',
    sourceId: 'assessment_001',
    revisions: [
      { revisionId: 'rev_001', revisionNumber: 1, savedAt: '2026-10-13T19:50:00+09:00', title: '탐구 노트', blocks: claimBlocksV1 },
      { revisionId: 'rev_002', revisionNumber: 2, savedAt: '2026-10-14T21:40:00+09:00', title: '탐구 노트', blocks: claimBlocksV2 },
      { revisionId: 'rev_003', revisionNumber: 3, savedAt: '2026-10-15T15:12:00+09:00', title: '탐구 노트', blocks: claimBlocksV3 },
    ],
  },
  {
    noteId: 'note_002',
    sourceType: 'SCHOOL_ASSESSMENT',
    sourceId: 'assessment_002',
    revisions: [
      {
        revisionId: 'rev_004',
        revisionNumber: 1,
        savedAt: '2026-10-09T20:10:00+09:00',
        title: '실험 노트',
        blocks: [
          heading('block_101', '🧪 실험 주제와 목적'),
          paragraph('block_102', '산과 염기의 중화 반응에서 혼합 비율에 따른 온도 변화를 관찰한다.'),
          heading('block_103', '📊 측정값·표·그래프'),
          paragraph('block_104', '염산 10mL에 수산화나트륨을 2mL씩 넣으며 온도를 기록했다.'),
        ],
      },
      {
        revisionId: 'rev_005',
        revisionNumber: 2,
        savedAt: '2026-10-14T18:30:00+09:00',
        title: '실험 노트',
        blocks: [
          heading('block_101', '🧪 실험 주제와 목적'),
          paragraph('block_102', '산과 염기의 중화 반응에서 혼합 비율에 따른 온도 변화를 관찰한다.'),
          heading('block_103', '📊 측정값·표·그래프'),
          paragraph('block_104', '염산 10mL에 수산화나트륨을 2mL씩 넣으며 온도를 기록했다. (단위: ℃)'),
          heading('block_105', '⚠️ 오차 원인과 개선'),
          paragraph('block_106', '온도계를 넣는 시점이 매번 달라 측정값이 흔들렸다. 다음에는 10초 뒤에 읽기로 한다.'),
        ],
      },
    ],
  },
]

export interface ArtifactRecord {
  artifactId: string
  sourceType: AssessmentSourceType
  sourceId: string
  title: string
  kind: string | null
}

export interface ArtifactVersionRecord {
  versionId: string
  artifactId: string
  versionNumber: number
  file: { fileRef: string; fileName: string; contentType: string; sizeBytes: number }
  changeNote: string | null
  uploadedAt: string
}

export const fixtureArtifacts: ArtifactRecord[] = [
  { artifactId: 'artifact_001', sourceType: 'SCHOOL_ASSESSMENT', sourceId: 'assessment_001', title: '논설문 개요', kind: null },
  { artifactId: 'artifact_002', sourceType: 'SCHOOL_ASSESSMENT', sourceId: 'assessment_002', title: '실험 보고서', kind: null },
  { artifactId: 'artifact_003', sourceType: 'SCHOOL_ASSESSMENT', sourceId: 'assessment_002', title: '발표자료', kind: null },
]

export const fixtureArtifactVersions: ArtifactVersionRecord[] = [
  {
    versionId: 'version_001',
    artifactId: 'artifact_001',
    versionNumber: 1,
    file: { fileRef: 'file_001', fileName: '논설문_개요.hwp', contentType: 'application/x-hwp', sizeBytes: 204_800 },
    changeNote: '수업 시간에 쓴 개요',
    uploadedAt: '2026-10-13T19:44:00+09:00',
  },
  {
    versionId: 'version_002',
    artifactId: 'artifact_002',
    versionNumber: 1,
    file: {
      fileRef: 'file_002',
      fileName: '중화반응_실험보고서.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 482_000,
    },
    changeNote: null,
    uploadedAt: '2026-10-10T21:05:00+09:00',
  },
  {
    versionId: 'version_003',
    artifactId: 'artifact_002',
    versionNumber: 2,
    file: { fileRef: 'file_003', fileName: '중화반응_실험보고서_수정.pdf', contentType: 'application/pdf', sizeBytes: 615_000 },
    changeNote: '그래프 단위 수정',
    uploadedAt: '2026-10-14T19:20:00+09:00',
  },
  {
    versionId: 'version_004',
    artifactId: 'artifact_003',
    versionNumber: 1,
    file: {
      fileRef: 'file_004',
      fileName: '중화점_발표.pptx',
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      sizeBytes: 1_830_000,
    },
    changeNote: null,
    uploadedAt: '2026-10-15T08:30:00+09:00',
  },
]

export interface FeedbackRequestRecord extends FeedbackRequest {
  /** Mock 내부 소유 확인용. 계약 응답에는 내보내지 않는다. */
  sourceType: AssessmentSourceType
  sourceId: string
  reply: FeedbackReplyResponse['reply']
  deliveredAt?: string
}

export const fixtureFeedbackRequests: FeedbackRequestRecord[] = [
  {
    requestId: 'fbr_001',
    status: 'DELIVERED',
    requestedAt: '2026-10-11T20:00:00+09:00',
    snapshot: { noteRevisionId: 'rev_004', artifactVersionIds: ['version_002'], locked: true },
    sourceType: 'SCHOOL_ASSESSMENT',
    sourceId: 'assessment_002',
    deliveredAt: '2026-10-12T17:30:00+09:00',
    reply: {
      overallComment: '실험 방법을 순서대로 정리한 점이 좋아요. 측정값 표에 단위를 함께 적어 보세요.',
      // DOCX는 위치를 보장하는 뷰어가 없어 문서 전체 의견만 둔다 (feedback §6, §45 location=null).
      comments: [
        {
          commentId: 'comment_001',
          targetType: 'DOCX',
          artifactVersionId: 'version_002',
          location: null,
          text: '결론에서 온도 변화가 가장 컸던 구간을 중화점과 연결해 설명해 보세요.',
        },
      ],
      recommendations: [
        { type: 'ENRICHMENT_TASK', catalogTaskId: 'catalog_001', note: '지시약 종류에 따라 중화점이 어떻게 보이는지 비교해 볼 수 있어요.' },
      ],
    },
  },
  {
    // 노트 v2 + 실험 보고서 v2로 다시 보낸 요청. 답변 대기 (관리자 임시저장은 학생에게 보이지 않는다).
    requestId: 'fbr_002',
    status: 'PENDING',
    requestedAt: '2026-10-15T21:12:00+09:00',
    snapshot: { noteRevisionId: 'rev_005', artifactVersionIds: ['version_003'], locked: true },
    sourceType: 'SCHOOL_ASSESSMENT',
    sourceId: 'assessment_002',
    reply: null,
  },
]
