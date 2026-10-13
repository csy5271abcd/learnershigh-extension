// ---------- Student Task List (GET /api/student/tasks, api-contract §9-1) ----------
// Contract 필드: taskId / title / subject / deadlineDate / currentStage / nextAction
// 그 외(제출물 요약 / 단계 상태 문구 / 차례 / 주의 표시 / snapshotDate)는 Tasks-00 Mockup을 위한 Frontend View Model이다. (Contract Gap)

/**
 * 수행평가 8단계 번호 (school-admissions.md / domain.md §12-2).
 * Contract의 currentStage Enum Naming은 미확정이라 Frontend는 단계 번호로만 다룬다.
 */
export type TaskStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** 지금 누가 움직여야 하는지. Stage와 별개다. */
/** 지금 누구 차례인지 (Frontend 파생 값). done = 최종 제출을 마친 수행평가 (내 차례 / 기다리는 중으로 세지 않는다) */
export type TaskTurn = 'student' | 'waiting' | 'done'

/**
 * Student에게 보이는 주의 표시. Admin 운영 상태(domain.md §12-3)를 Stage와 분리해 받고,
 * Student에게는 운영시간 숫자 없이 상태로만 보여준다. (예: Review 48h 초과 → Review 지연)
 */
export type TaskAttentionFlag = 'reviewDelayed' | 'deadlinePassed' | 'onHold'

export interface StudentTaskSummary {
  taskId: string
  title: string
  subject: string
  /** YYYY-MM-DD */
  deadlineDate: string
  currentStage: TaskStageNumber
  /** 현재 단계 안의 상태 (예: V2 검토 대기, AI 1차 분석 중). Backend가 정한 문구를 그대로 보여준다. */
  stageStatus: string
  /** 제출물 요약 (예: A3 포스터 + 3분 발표) */
  deliverableSummary: string
  turn: TaskTurn
  attentionFlags: TaskAttentionFlag[]
  /** 다음에 할 일. AI / Admin이 학생 제출물을 대신 쓰는 내용이 아니라 행동 안내다. */
  nextAction: string
}

export interface StudentTaskListResult {
  items: StudentTaskSummary[]
  /** 이 목록이 기준으로 삼은 날짜 (D-day 계산 기준, YYYY-MM-DD) */
  snapshotDate: string
}

// ---------- Student Task Detail (GET /api/student/tasks/{taskId}, api-contract §9-3 / §11 / §12 / §13) ----------
// Task Identity는 목록과 같은 StudentTaskSummary(taskId)를 그대로 쓰고, Detail에만 필요한 값을 더한다.
// 평가 기준 / 제출물 / 참고 자료 / 과정 자료 / 피드백 반영 여부 / Revision Diff Shape는 Contract에 없어 Frontend View Model이다. (Contract Gap)
// 각 Section 값이 null이면 "이 Task의 상세 자료가 아직 준비되지 않음"(Fixture에 없음), 빈 배열이면 "실제로 없음"이다.

/** 수행평가 안내문 (Stage 1에서 등록한 파일) */
export interface TaskGuideFile {
  fileName: string
  format: string
  /** YYYY-MM-DD */
  registeredDate: string
}

export interface TaskEvaluationCriterion {
  criterionId: string
  name: string
  /** 배점. 학생이 등록할 때 비워둘 수 있다. */
  points: number | null
  /** 최신 Version의 AI 사전 점검 한 줄. 참고용 보조 점검이며 채점이 아니다. */
  aiCheck?: string
}

export type TaskReferenceKind = 'link' | 'article' | 'textbook'

/** 참고 자료: 학생이 과제를 위해 참고하는 기사 / 교과서 / 링크. (과정 자료와 다른 배열) */
export interface TaskReferenceMaterial {
  referenceId: string
  kind: TaskReferenceKind
  title: string
  source: string
  /** 어디에 쓰는지 (예: thesis 근거 통계 1개) */
  usage: string
}

/**
 * Evidence 단계 Tag (Evidence-00 / TasksDetail-04 Mockup: 계획 · 조사 · 초안 · 최종 · 발표).
 * Contract stageTag는 RESEARCH 예시뿐이라 전체 Enum이 미확정이다. Frontend 표시용 값이며 Task currentStage를 바꾸지 않는다.
 */
export type TaskProcessCategory = 'plan' | 'research' | 'draft' | 'final' | 'presentation'

/**
 * Evidence(과정 자료): 학생이 직접 조사 · 준비하며 올린 파일. (GET / POST / DELETE /api/student/tasks/{taskId}/evidence)
 * Version(제출 Revision 단위, 수정 기록 Tab)과 다른 Entity다.
 */
export interface TaskEvidence {
  evidenceId: string
  taskId: string
  fileName: string
  /** 파일 참조. 지금은 개발용 로컬 참조이고, File Storage가 정해지면 fileRef / Storage URL로 바뀐다. (OD-09) */
  fileRef: string
  stageTag: TaskProcessCategory
  /** ISO 8601 */
  createdAt: string
  mimeType?: string
  sizeBytes?: number
  /** 이번 Session에 학생이 고른 파일. 미리보기에만 쓴다. (Seed 자료는 원본 파일이 없다) */
  file?: File
}

/** School Evidence 전체 목록: 자료가 있는 Task별 묶음 (Evidence-00) */
export interface SchoolEvidenceListResult {
  groups: { task: StudentTaskSummary; items: TaskEvidence[] }[]
}

/** 한 Task의 Evidence. complete = false면 Seed 자료 정보가 없어(준비 안 됨) 이번 Session에 추가한 것만 있다. */
export interface TaskEvidenceList {
  items: TaskEvidence[]
  complete: boolean
}

/** 선생님 피드백 (teacherFeedback). 검토 중이면 comment가 없다. 어느 Version에 대한 피드백인지 versionId로 잇는다. */
export interface TaskTeacherFeedback {
  feedbackId: string
  versionId: string
  versionLabel: string
  status: 'delivered' | 'reviewing'
  comment?: string
  nextAction?: string
  /** ISO 8601 */
  deliveredAt?: string
  /**
   * 학생이 다음 버전을 내기 전에 반영해야 하는 항목인지 (Frontend View Model, Contract 필드 없음).
   * 지금은 전달된 선생님 피드백 = 필수, AI 사전 점검 = 선택(참고용)으로 둔다.
   */
  required?: boolean
  /** 학생이 "반영함"으로 표시했는지 (학생 본인 표시, 시스템 검증 아님. Contract 갱신 Endpoint 없음) */
  reflected?: boolean
}

/** AI 사전 점검 한 항목. reflected는 학생이 반영 여부를 표시한 값이다. (Contract Gap, 화면에서는 읽기 전용) */
export interface TaskAiFeedbackItem {
  itemId: string
  summary: string
  reflected: boolean
}

/** AI 사전 점검 (aiFeedback). 참고용이며 선생님이 확인하기 전 결과다. */
export interface TaskAiFeedback {
  feedbackId: string
  versionId: string
  versionLabel: string
  /** ISO 8601 */
  analyzedAt: string
  items: TaskAiFeedbackItem[]
}

export interface TaskFeedback {
  teacher: TaskTeacherFeedback[]
  ai: TaskAiFeedback[]
  /**
   * 선생님 (재)검토 결과: 이 Version 다음에 수정본이 더 필요한지 (Frontend View Model, Contract에 revisionRequired 없음)
   * needsAnotherRevision = false면 최종 제출 준비 상태다. (Stage 8 전이는 실제 최종 제출 때)
   */
  reviewDecisions: { versionId: string; needsAnotherRevision: boolean }[]
}

/** 학부모 공유 상태 (Contract). Student는 not_shared ↔ consented만 바꾼다. attached / shared는 Admin Report Flow가 바꾼다. */
export type TaskParentShareStatus = 'not_shared' | 'consented' | 'attached' | 'shared'

/**
 * 최종 결과물 (GET /api/student/tasks/{taskId}/final-artifact). Version과 다른 Entity다.
 * 최종 제출 때 최종본으로 정해진 Version의 파일을 참조한다. (새 파일을 따로 올리지 않는다)
 */
export interface TaskFinalArtifact {
  artifactId: string
  taskId: string
  /** 파일 형식 (예: PDF, DOCX) */
  type: string
  fileRef: string
  parentShareStatus: TaskParentShareStatus
  /** Frontend View Model: 최종본이 된 Version */
  sourceVersionId: string
  sourceVersionLabel: string
  fileName: string
  /** ISO 8601 */
  createdAt: string
  /** 이번 Session에 학생이 제출한 원본 파일 (미리보기용) */
  file?: File
}

/**
 * 한 Task의 최종 결과물.
 * none: 아직 최종 제출 전(또는 정보 없음). error: 최종 결과물만 불러오지 못했다. (Task 전체 오류와 구분)
 */
export type TaskFinalArtifactState = { status: 'none' } | { status: 'ready'; data: TaskFinalArtifact } | { status: 'error' }

/**
 * Archive 항목 Read Model (GET /api/student/archive item). 별도 Archive 저장 Entity가 아니다. (API-OD-05)
 * 완료된 Task / Archived Growth Activity에서 계산하고, sourceId로 원본을 가리킨다. (원본 내용을 복사하지 않는다)
 */
export interface ArchiveItemView {
  source: 'task' | 'growth'
  sourceId: string
  title: string
  periodLabel: string
  /** 과목 (Task) / Activity Type (Growth) */
  category: string
  result: string
  /** 학생이 쓴 Reflection 요약. Task에는 없다(null). */
  reflectionSummary: string | null
  /** 과정 자료 수. 자료 정보가 준비되지 않은 원본은 null (0개와 구분) */
  evidenceCount: number | null
}

export type ArchiveSourceFilter = 'all' | 'task' | 'growth'

/** Archive 목록 (페이지 정보는 Contract 의미만 맞춰 둔다. Mockup에 Pagination UI 없음) */
export interface SchoolArchiveResult {
  items: ArchiveItemView[]
  /** 조건 없이 본 전체 항목 수 (전체 Empty와 조건 Empty를 구분) */
  totalAll: number
  page: { number: number; size: number; totalElements: number; totalPages: number }
}

/**
 * 한 Task의 피드백 (GET /api/student/tasks/{taskId}/feedback).
 * not-prepared: 이 Task의 피드백 정보가 Fixture에 없다. error: 피드백만 불러오지 못했다. (Task 전체 오류와 구분)
 */
export type TaskFeedbackState = { status: 'ready'; data: TaskFeedback } | { status: 'not-prepared' } | { status: 'error' }

/** Task와 연결된 Mentor Activity Case. Case 자체 값은 Mentor Hub Canonical Case를 contentId로 참조한다. */
export interface TaskMentorCaseLink {
  contentId: string
  /** 선생님(학원)이 이 Task에 추천한 Case인지. 내부 출처는 Admin Recommendation이다. */
  teacherRecommended: boolean
  /** 왜 지금 이 Task에 도움이 되는지 */
  relationNote: string
}

/** 화면 표시용 Case 값. Canonical Activity Case에서 그대로 읽어 온 값이다. (복제 데이터가 아니다) */
export interface TaskMentorCaseView extends TaskMentorCaseLink {
  title: string
  mentorName: string
  /** 대학 · 학과 */
  mentorAffiliation: string
  /** 활동 당시 학년 (예: 고1) */
  gradeLabel: string
  activityType: string
  stageTitles: string[]
  materials: { materialId: string; roleLabel: string; name: string; description: string }[]
}

/**
 * AI 사전 점검 상태 (Student 화면용, Feature 내부 값).
 * Contract 예시는 PROCESSING / SUCCESS, Domain은 Loading / Success / Failed까지만 확인된다. 전체 Enum은 확정하지 않고 API 연결 시 Mapping한다.
 */
export type TaskAiAnalysisStatus = 'processing' | 'success' | 'failed'

/**
 * 제출 Version (V1 / V2 / V3 …): 학생이 제출한 수행평가 Revision 단위. (POST / GET /api/student/tasks/{taskId}/versions)
 * Evidence(과정 자료)와 다른 Entity다. 새 Version은 이전 Version을 덮어쓰지 않는다.
 */
export interface TaskVersion {
  versionId: string
  taskId: string
  /** Task 안에서 1부터 증가 */
  versionNumber: number
  /** V1 / V2 … (versionNumber에서 만든 표시값) */
  label: string
  fileName: string
  /** 파일 참조. 지금은 개발용 로컬 참조이고, File Storage가 정해지면 fileRef / Storage URL로 바뀐다. (OD-09) */
  fileRef: string
  /** ISO 8601 */
  submittedAt: string
  aiAnalysisStatus: TaskAiAnalysisStatus
  /** 실패한 분석을 다시 시도할 수 있는지 (AI_ANALYSIS_RETRY_NOT_ALLOWED와 대응) */
  retryAllowed: boolean
  /** AI 사전 점검 성공 후 공용 검토 대기열(Shared Feedback Queue)에 들어갔는지. Admin Queue 화면은 아직 없다. */
  inFeedbackQueue: boolean
  /** 이 Version에서 바꾼 점 (학생이 남긴 메모, Seed만 있음) */
  note?: string
  /** 분량 요약 (예: 3분 55초 · 548단어, Seed만 있음) */
  sizeSummary?: string
  mimeType?: string
  sizeBytes?: number
  /** 이번 Session에 학생이 제출한 파일. 미리보기에만 쓴다. */
  file?: File
}

/** 한 Task의 Version. complete = false면 Version 정보가 Fixture에 없다(준비 안 됨). */
export interface TaskVersionList {
  items: TaskVersion[]
  complete: boolean
}

/** Diff 한 덩어리. 학생이 직접 쓴 원고를 Version끼리 비교한 것이다. */
export type TaskRevisionBlock =
  | { kind: 'same'; text: string }
  | { kind: 'changed'; before: string; after: string }
  | { kind: 'removed'; before: string }
  | { kind: 'added'; after: string }

export interface TaskRevisionDiff {
  fromVersionId: string
  toVersionId: string
  blocks: TaskRevisionBlock[]
  /** 이 수정에서 반영한 선생님 피드백 */
  appliedFeedbackId?: string
}

/** 지금 할 일 Card의 기다리는 동안 / 보조 Action. 화면이 없는 Action은 이유와 함께 비활성으로 둔다. */
export type TaskDetailAction =
  | { kind: 'compareVersions'; label: string; fromVersionId: string; toVersionId: string }
  | { kind: 'submitTopic'; label: string }
  | { kind: 'addEvidence'; label: string }
  | { kind: 'submitVersion'; label: string }
  | { kind: 'retryAiAnalysis'; label: string; versionId: string }
  | { kind: 'submitFinal'; label: string }
  | { kind: 'previewFinal'; label: string }
  | { kind: 'openTab'; label: string; tab: 'feedback' | 'mentor-case'; versionId?: string }
  | { kind: 'unavailable'; label: string; reason: string }

export interface TaskNowCard {
  /** 큰 제목 (예: V2 검토가 진행 중이에요) */
  headline: string
  description: string
  /** 최근 제출 등 사실 한 줄 (운영시간 숫자는 넣지 않는다) */
  fact?: string
  primaryAction?: TaskDetailAction
  /** 기다리는 동안 할 수 있는 일 */
  waitingActions: TaskDetailAction[]
}

/**
 * 주제 상태 (Student 화면용, Feature 내부 값).
 * Contract의 topicApprovalStatus Enum(OD-03, PENDING은 초기 후보)을 확정하지 않는다. API 연결 시 Mapping한다.
 * - not-submitted: 아직 제출 전
 * - in-review: 학생이 제출, 선생님(학원) 검토 중 (Stage 2)
 * - direction-requested: 선생님이 방향을 남김 → 학생이 수정해 다시 제출 (반려가 아니다)
 * - confirmed: 주제 확인 완료 (Stage 3 자료 조사부터)
 */
export type TaskTopicState =
  | { state: 'not-submitted' }
  | { state: 'in-review'; topic: string }
  | { state: 'direction-requested'; topic: string; guidance: string }
  | { state: 'confirmed'; topic: string }

export interface StudentTaskDetailExtra {
  /** null이면 이 Task의 주제 정보가 Fixture에 없다. */
  topic: TaskTopicState | null
  nowCard: TaskNowCard
  guideFile: TaskGuideFile | null
  /** 학생이 직접 입력한 안내문 내용 (Task Create, POST /api/student/tasks description) */
  guideText: string | null
  criteria: TaskEvaluationCriterion[] | null
  references: TaskReferenceMaterial[] | null
  mentorCases: TaskMentorCaseView[] | null
  revisionDiffs: TaskRevisionDiff[]
}

export interface StudentTaskDetail {
  task: StudentTaskSummary
  /** 과정 자료 Tab / School Evidence가 같은 Canonical Evidence를 읽는다. */
  evidence: TaskEvidenceList
  /** 피드백 / 수정 기록 Tab과 지금 할 일이 같은 Canonical Version을 읽는다. */
  versions: TaskVersionList
  /** 피드백 Tab과 지금 할 일 / Tasks 목록이 같은 Canonical Feedback을 읽는다. */
  feedback: TaskFeedbackState
  /** 최종 결과물 (최종 제출 후) */
  finalArtifact: TaskFinalArtifactState
  /** Archive 보관 대상인지 (Archive Projection에서 계산, 별도 Archive 저장 없음) */
  inArchive: boolean
  /** Detail 자료. null이면 이 Task의 상세 자료가 아직 준비되지 않았다. (목록 정보만 있음) */
  detail: StudentTaskDetailExtra | null
  snapshotDate: string
}

export type LoadState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error' }
