// ---------- Student Task Create Wizard (POST /api/student/tasks, api-contract §9-2) ----------
// TaskRegister-01 ~ 05 Mockup: 안내문 → 기본 정보 → 평가 기준 → 확인 4단계 Modal.
// Contract Request는 title / subject / deadlineDate / description뿐이다.
// 안내문 파일 · 형태 · 진행 정도 · 평가 기준 · 제출물은 Frontend Create Draft로만 둔다. (Contract Gap)

export type TaskCreateStep = 'guide' | 'basic' | 'criteria' | 'confirm'

export const taskCreateSteps: { id: TaskCreateStep; label: string; title: string }[] = [
  { id: 'guide', label: '안내문', title: '어떤 수행평가를 받았나요?' },
  { id: 'basic', label: '기본 정보', title: '과제 정보를 확인해주세요' },
  { id: 'criteria', label: '평가 기준', title: '평가 기준을 정리해볼까요?' },
  { id: 'confirm', label: '확인', title: '이대로 등록할까요?' },
]

export type TaskGuideMode = 'file' | 'text'

/** 선택한 안내문 파일. File 객체를 그대로 보관한다. (실제 Upload / File Storage는 아직 없다, OD-09) */
export interface TaskGuideFileDraft {
  file: File
  fileName: string
  mimeType: string
  sizeBytes: number
}

/**
 * 진행 정도 (TaskRegister-02 "지금 어디까지 했나요?").
 * currentStage를 옮기는 근거가 Domain / Contract에 없어 등록 시점의 맥락 정보로만 보관한다. (Stage 전이 아님)
 */
export type TaskStartingPoint = 'from-start' | 'topic-decided' | 'research-done'

export const taskStartingPointOptions: { id: TaskStartingPoint; label: string }[] = [
  { id: 'from-start', label: '처음부터 시작해요' },
  { id: 'topic-decided', label: '주제가 이미 정해졌어요' },
  { id: 'research-done', label: '자료 조사까지 끝났어요' },
]

/** 형태 후보 (TaskRegister-02 Mockup 그대로). 확정 Enum이 아니라 입력 후보다. */
export const performanceTypeOptions = ['탐구 보고서', '발표', '포스터', 'Speech', '설문 탐구', '토론', '논증문', '데이터 프로젝트']

export interface TaskCriterionDraft {
  /** 화면 Row 구분용 (저장 Identity 아님) */
  rowId: string
  name: string
  /** 입력 그대로의 문자열 (빈 값 허용) */
  points: string
}

export interface TaskCreateDraft {
  guideMode: TaskGuideMode
  guideFile: TaskGuideFileDraft | null
  /** 안내문 직접 입력 → Contract description */
  guideText: string
  title: string
  subject: string
  performanceType: string
  startingPoint: TaskStartingPoint
  /** YYYY-MM-DD (date input 값) */
  deadlineDate: string
  criteria: TaskCriterionDraft[]
  /** 제출물 (예: A4 보고서 자료 PDF 파일) */
  deliverable: string
}

export const emptyCriterion = (rowId: string): TaskCriterionDraft => ({ rowId, name: '', points: '' })

export const initialTaskCreateDraft = (): TaskCreateDraft => ({
  guideMode: 'file',
  guideFile: null,
  guideText: '',
  title: '',
  subject: '',
  performanceType: '',
  // TaskRegister-02: "처음부터 시작해요"가 기본 선택
  startingPoint: 'from-start',
  deadlineDate: '',
  criteria: [emptyCriterion('criterion-1')],
  deliverable: '',
})

/** 처음 연 상태에서 학생이 무엇이든 입력했는지. (입력 방식 전환 / 기본 선택 / 빈 Row 추가만으로는 작성 중이 아니다) */
export function isTaskCreateDraftDirty(draft: TaskCreateDraft): boolean {
  return (
    draft.guideFile !== null ||
    draft.guideText.trim() !== '' ||
    draft.title.trim() !== '' ||
    draft.subject !== '' ||
    draft.performanceType !== '' ||
    draft.startingPoint !== 'from-start' ||
    draft.deadlineDate !== '' ||
    draft.deliverable.trim() !== '' ||
    draft.criteria.some((row) => row.name.trim() !== '' || row.points.trim() !== '')
  )
}

// ---------- 안내문 파일 읽기 상태 (브라우저에서 파일을 읽는 진행률. 서버 Upload 상태 Enum이 아니다) ----------

export type GuideFileReadState =
  | { status: 'idle' }
  | { status: 'reading'; fileName: string; percent: number }
  | { status: 'ready' }
  | { status: 'error'; fileName: string }

/**
 * 안내문 첨부 허용 형식: 기존 LearnersHigh 수행평가 작성 화면의 허용 확장자와 같다.
 * (references/existing-runners-high/screens/student/performance-task/performance-task-detail.png)
 * 최대 용량 규칙은 Source에 없어 두지 않는다.
 */
export const guideFileAccept = '.pdf,.docx,.txt,.png,.jpg,.jpeg'
const guideFileExtensions = ['pdf', 'docx', 'txt', 'png', 'jpg', 'jpeg']

export function guideFileTypeError(fileName: string): string | undefined {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return guideFileExtensions.includes(extension) ? undefined : 'pdf, docx, txt, png, jpg, jpeg 파일만 올릴 수 있어요.'
}

// ---------- 단계별 검사 (해당 단계에서 다음으로 갈 때만 검사한다) ----------

export type TaskCreateField = 'guideFile' | 'guideText' | 'title' | 'subject' | 'deadlineDate' | `criterion-${string}-points`

export type TaskCreateErrors = Partial<Record<TaskCreateField, string>>

/** Form Field의 element id (오류 연결 / 첫 오류 Focus) */
export const taskCreateFieldId = (field: TaskCreateField) => `task-create-${field}`

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/**
 * - 안내문: 지금 고른 입력 방식에 내용이 있어야 한다. (파일은 읽기 완료)
 * - 기본 정보: 과제 제목 / 과목 / 마감일 필수 (Contract Request 필드, Tasks 목록 · D-day 표시에 필요). 형태 · 진행 정도는 선택.
 * - 평가 기준: 필수 없음. 배점은 숫자만. (배점 합계 100 / 과거 마감일 금지 규칙은 Source에 없어 검사하지 않는다)
 */
export function validateTaskCreateStep(step: TaskCreateStep, draft: TaskCreateDraft, fileState: GuideFileReadState): TaskCreateErrors {
  const errors: TaskCreateErrors = {}
  if (step === 'guide') {
    if (draft.guideMode === 'file') {
      if (fileState.status === 'reading') errors.guideFile = '안내문을 준비하고 있어요. 준비가 끝나면 다음으로 갈 수 있어요.'
      else if (!draft.guideFile) errors.guideFile = '안내문 파일을 올려주세요.'
    } else if (!draft.guideText.trim()) {
      errors.guideText = '안내문 내용을 입력해주세요.'
    }
  }
  if (step === 'basic') {
    if (!draft.title.trim()) errors.title = '과제 제목을 입력해주세요.'
    if (!draft.subject) errors.subject = '과목을 골라주세요.'
    if (!draft.deadlineDate) errors.deadlineDate = '마감일을 골라주세요.'
    else if (!isValidDate(draft.deadlineDate)) errors.deadlineDate = '올바른 날짜를 입력해주세요.'
  }
  if (step === 'criteria') {
    for (const row of draft.criteria) {
      const points = row.points.trim()
      if (points && !/^\d+$/.test(points)) errors[`criterion-${row.rowId}-points`] = '배점은 0 이상의 숫자로 입력해주세요.'
    }
  }
  return errors
}

/** 화면 순서상 첫 오류 Field */
export function firstErrorField(draft: TaskCreateDraft, errors: TaskCreateErrors): TaskCreateField | undefined {
  const order: TaskCreateField[] = [
    'guideFile',
    'guideText',
    'title',
    'subject',
    'deadlineDate',
    ...draft.criteria.map((row) => `criterion-${row.rowId}-points` as const),
  ]
  return order.find((field) => errors[field])
}

/** 이름이 있는 평가 기준만 저장한다. (빈 Row는 버린다) */
export function filledCriteria(draft: TaskCreateDraft) {
  return draft.criteria
    .filter((row) => row.name.trim() !== '')
    .map((row) => ({ name: row.name.trim(), points: row.points.trim() && /^\d+$/.test(row.points.trim()) ? Number(row.points.trim()) : null }))
}

/** 배점 합계: 숫자로 입력한 배점만 더한다. */
export function criteriaPointsTotal(draft: TaskCreateDraft): number {
  return draft.criteria.reduce((sum, row) => (/^\d+$/.test(row.points.trim()) ? sum + Number(row.points.trim()) : sum), 0)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export const fileExtensionLabel = (fileName: string) => fileName.split('.').pop()?.toUpperCase() ?? ''
