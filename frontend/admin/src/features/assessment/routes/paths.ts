// Admin Assessment 관리 주소 (Router Library 없음 → app/adminLocation.ts의 pathname으로 고른다).
// App.tsx는 isAssessmentAdminPath()만 확인하고 나머지 분기는 이 Feature 안에서 한다 (Shared Shell 변경 최소화).

export const assessmentAdminPath = '/assessment'

export type AssessmentTab = 'overview' | 'students' | 'feedback' | 'plans' | 'content' | 'references'
export type ContentTab = 'tasks' | 'mock-exams' | 'universities' | 'sources'
export type RecordKind = 'school' | 'enrichment'

export type AssessmentRoute =
  | { tab: 'overview'; view: 'overview' }
  | { tab: 'students'; view: 'students' }
  | { tab: 'students'; view: 'student'; studentId: string }
  | { tab: 'students'; view: 'record'; studentId: string; kind: RecordKind; sourceId: string }
  /** 학생 화면 그대로 보기 (읽기 전용, 요청 ⑧). Student 경로는 `?path=`에 둔다 */
  | { tab: 'students'; view: 'student-view'; studentId: string }
  | { tab: 'feedback'; view: 'feedback' }
  | { tab: 'feedback'; view: 'feedback-detail'; requestId: string }
  | { tab: 'plans'; view: 'plans' }
  | { tab: 'plans'; view: 'plan-review'; planId: string; revisionId: string }
  | { tab: 'plans'; view: 'plan-ai' }
  /** A9 학년도별 평가계획서 열람 (?school=&year=&grade=&semester=&plan=&subject=&tab=&item=) */
  | { tab: 'plans'; view: 'plan-archive' }
  | { tab: 'content'; view: 'tasks' }
  | { tab: 'content'; view: 'task-edit'; catalogTaskId: string | null }
  | { tab: 'content'; view: 'mock-exams' }
  | { tab: 'content'; view: 'mock-exam-detail'; materialId: string }
  | { tab: 'content'; view: 'mock-exam-edit'; materialId: string | null }
  | { tab: 'content'; view: 'universities' }
  | { tab: 'content'; view: 'university-detail'; documentId: string }
  | { tab: 'content'; view: 'university-ai' }
  /** 참고자료원 카탈로그 (정적, Student 참고자료와 같은 원천) */
  | { tab: 'content'; view: 'sources' }
  | { tab: 'references'; view: 'references' }
  | { tab: 'overview'; view: 'not-found' }

export const isAssessmentAdminPath = (pathname: string) => pathname === assessmentAdminPath || pathname.startsWith(`${assessmentAdminPath}/`)

const enc = encodeURIComponent

export const paths = {
  overview: assessmentAdminPath,
  students: `${assessmentAdminPath}/students`,
  student: (studentId: string) => `${assessmentAdminPath}/students/${enc(studentId)}`,
  record: (studentId: string, kind: RecordKind, sourceId: string) => `${assessmentAdminPath}/students/${enc(studentId)}/${kind}/${enc(sourceId)}`,
  studentView: (studentId: string, studentPath?: string) => `${assessmentAdminPath}/students/${enc(studentId)}/view${studentPath ? `?path=${enc(studentPath)}` : ''}`,
  feedback: `${assessmentAdminPath}/feedback`,
  feedbackDetail: (requestId: string) => `${assessmentAdminPath}/feedback/${enc(requestId)}`,
  plans: `${assessmentAdminPath}/evaluation-plans`,
  /** page: 원문 근거 쪽 (검토 Workspace PDF Viewer를 그 쪽으로 연다) */
  planReview: (planId: string, revisionId: string, page?: number) =>
    `${assessmentAdminPath}/evaluation-plans/${enc(planId)}/revisions/${enc(revisionId)}${page ? `?page=${page}` : ''}`,
  planAi: `${assessmentAdminPath}/evaluation-plans/ai-analysis`,
  planArchive: (school?: string) => `${assessmentAdminPath}/evaluation-plans/archive${school ? `?school=${enc(school)}` : ''}`,
  tasks: `${assessmentAdminPath}/content/tasks`,
  taskNew: `${assessmentAdminPath}/content/tasks/new`,
  task: (catalogTaskId: string) => `${assessmentAdminPath}/content/tasks/${enc(catalogTaskId)}`,
  mockExams: `${assessmentAdminPath}/content/mock-exams`,
  mockExamNew: `${assessmentAdminPath}/content/mock-exams/new`,
  mockExam: (materialId: string) => `${assessmentAdminPath}/content/mock-exams/${enc(materialId)}`,
  mockExamEdit: (materialId: string) => `${assessmentAdminPath}/content/mock-exams/${enc(materialId)}/edit`,
  universities: `${assessmentAdminPath}/content/universities`,
  universityAi: `${assessmentAdminPath}/content/universities/ai-analysis`,
  contentSources: `${assessmentAdminPath}/content/sources`,
  university: (documentId: string, page?: number) => `${assessmentAdminPath}/content/universities/${enc(documentId)}${page ? `?page=${page}` : ''}`,
  references: `${assessmentAdminPath}/references`,
}

const tabPaths: Record<AssessmentTab, string> = {
  overview: paths.overview,
  students: paths.students,
  feedback: paths.feedback,
  plans: paths.plans,
  content: paths.tasks,
  references: paths.references,
}

export const tabPath = (tab: AssessmentTab) => tabPaths[tab]

export function matchAssessmentRoute(pathname: string): AssessmentRoute {
  const rest = pathname.slice(assessmentAdminPath.length).replace(/\/+$/, '')
  let parts: string[]
  try {
    parts = rest.split('/').filter(Boolean).map((part) => decodeURIComponent(part))
  } catch {
    return { tab: 'overview', view: 'not-found' }
  }
  const [section, a, b, c, d] = parts
  if (!section) return { tab: 'overview', view: 'overview' }
  if (section === 'students') {
    if (!a) return { tab: 'students', view: 'students' }
    if (!b) return { tab: 'students', view: 'student', studentId: a }
    if (b === 'view' && !c) return { tab: 'students', view: 'student-view', studentId: a }
    if ((b === 'school' || b === 'enrichment') && c && !d) return { tab: 'students', view: 'record', studentId: a, kind: b, sourceId: c }
  }
  if (section === 'feedback') {
    if (!a) return { tab: 'feedback', view: 'feedback' }
    if (!b) return { tab: 'feedback', view: 'feedback-detail', requestId: a }
  }
  if (section === 'evaluation-plans') {
    if (!a) return { tab: 'plans', view: 'plans' }
    if (a === 'ai-analysis' && !b) return { tab: 'plans', view: 'plan-ai' }
    if (a === 'archive' && !b) return { tab: 'plans', view: 'plan-archive' }
    if (b === 'revisions' && c && !d) return { tab: 'plans', view: 'plan-review', planId: a, revisionId: c }
  }
  if (section === 'content') {
    if (!a || a === 'tasks') {
      if (!b) return { tab: 'content', view: 'tasks' }
      if (!c) return { tab: 'content', view: 'task-edit', catalogTaskId: b === 'new' ? null : b }
    }
    if (a === 'mock-exams') {
      if (!b) return { tab: 'content', view: 'mock-exams' }
      if (b === 'new' && !c) return { tab: 'content', view: 'mock-exam-edit', materialId: null }
      if (!c) return { tab: 'content', view: 'mock-exam-detail', materialId: b }
      if (c === 'edit' && !d) return { tab: 'content', view: 'mock-exam-edit', materialId: b }
    }
    if (a === 'universities') {
      if (!b) return { tab: 'content', view: 'universities' }
      if (b === 'ai-analysis' && !c) return { tab: 'content', view: 'university-ai' }
      if (!c) return { tab: 'content', view: 'university-detail', documentId: b }
    }
    if (a === 'sources' && !b) return { tab: 'content', view: 'sources' }
  }
  if (section === 'references' && !a) return { tab: 'references', view: 'references' }
  return { tab: 'overview', view: 'not-found' }
}
