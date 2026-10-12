// Cross-subject Connection Fixture (Canonical, Student 화면 없음). 실제 AI 후보 생성 / GET /api/admin/connections /
// confirm / reject 대신 메모리 값을 둔다.
// - Archive에 있는 실제 항목(완료 Task / Archive 저장한 Growth Activity)만 sourceRefs로 가리킨다. (Archive source 규칙 재사용)
// - reviewState는 Fixture 의미 값이다. AI 후보(candidate) → Admin 확정(confirmed) / 거절(rejected).
//   정확한 상태 Enum은 미확정(Domain OD-04 / API-OD-04)이라 Backend 값으로 쓰지 않는다.
// - Student와 AI는 확정할 수 없다. 이 파일에는 상태를 바꾸는 함수가 없다. (Admin Connection Review는 Admin Surface에서)
// - Interview는 확정된 Connection만 질문 근거로 쓴다. 후보 / 거절은 Student 화면 어디에도 나오지 않는다.
// - 현재 Archive 항목은 3개(완료 Task 1 · 성장 활동 2)라 가능한 짝도 3개다. 숫자를 맞추려고 가짜 Archive 항목을 만들지 않는다.

import type { ArchiveItemView } from '../model/types.ts'
import { growthArchiveEntries } from './schoolActivity.fixture.ts'
import { archiveTaskEntries } from './schoolFinalArtifact.fixture.ts'

/** Fixture 의미 상태 (Backend Enum 아님) */
export type ConnectionReviewState = 'candidate' | 'confirmed' | 'rejected'

/** Archive 항목을 가리킨다. (source / sourceId = Archive 카드와 같은 규칙) */
export interface ConnectionSourceRef {
  source: ArchiveItemView['source']
  sourceId: string
}

export interface SchoolConnection {
  connectionId: string
  sourceRefs: ConnectionSourceRef[]
  /** 왜 연관되어 보이는지 짧은 설명 (AI 후보 이유 / Admin 확인 메모). Student 화면에는 그대로 내보내지 않는다. */
  reason: string
  reviewState: ConnectionReviewState
}

const connections: readonly SchoolConnection[] = [
  {
    connectionId: 'fixture-connection-001',
    sourceRefs: [
      { source: 'growth', sourceId: 'fixture-activity-a11-bioinformatics' },
      { source: 'growth', sourceId: 'fixture-activity-a12-broadcast' },
    ],
    reason: '두 활동 모두 결과를 정확하게 기록하고 다른 사람에게 같은 내용으로 전달하는 과정이 중요했다.',
    reviewState: 'confirmed',
  },
  {
    connectionId: 'fixture-connection-002',
    sourceRefs: [
      { source: 'growth', sourceId: 'fixture-activity-a11-bioinformatics' },
      { source: 'task', sourceId: 'fixture-task-08' },
    ],
    reason: '자료를 읽고 근거를 바탕으로 해석을 정리했다는 점이 비슷해 보인다.',
    reviewState: 'candidate',
  },
  {
    connectionId: 'fixture-connection-003',
    sourceRefs: [
      { source: 'growth', sourceId: 'fixture-activity-a12-broadcast' },
      { source: 'task', sourceId: 'fixture-task-08' },
    ],
    reason: '둘 다 발표 형식의 결과물이 있다.',
    reviewState: 'rejected',
  },
]

/** 확정된 Connection 하나 (후보 / 거절 / 없음 → null). Interview 읽기 모델이 쓰는 유일한 입구다. */
export function confirmedConnection(connectionId: string): SchoolConnection | null {
  const connection = connections.find((item) => item.connectionId === connectionId)
  return connection?.reviewState === 'confirmed' ? connection : null
}

/** Fixture 확인용 (개발 / 검증): 전체 Connection과, Archive에 없는 sourceRef 목록 */
export function connectionFixtureSnapshot() {
  const archived = new Set([...archiveTaskEntries(), ...growthArchiveEntries()].map(({ item }) => `${item.source}:${item.sourceId}`))
  return {
    connections: connections.map((connection) => ({ ...connection, sourceRefs: connection.sourceRefs.map((ref) => ({ ...ref })) })),
    missingSourceRefs: connections.flatMap((connection) =>
      connection.sourceRefs.filter((ref) => !archived.has(`${ref.source}:${ref.sourceId}`)).map((ref) => `${connection.connectionId} → ${ref.source}:${ref.sourceId}`),
    ),
  }
}
