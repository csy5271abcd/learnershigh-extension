import type { AcademicContext, SubjectRef } from '../types.ts'

// 학생이 이 학기에 추가한 과목의 Mock 보관 (2026-10-28, P-26 PROPOSED).
// Mock Store는 새로고침하면 Fixture로 돌아가므로(assessment-frontend-mock.md §5), 학생이 추가한 과목만 이 브라우저 저장소에 남긴다.
// 서버 저장이 아니다. 로그인 학생 구분이 없는 Mock이라 한 브라우저 = 한 학생으로 본다. 다른 데이터(수행평가·노트)는 저장하지 않는다.

const storageKey = 'lh-assessment-mock:student-subjects:v1'

export type StudentSubjectOrigin = 'STUDENT_CREATED' | 'OTHER_TERM'

export interface StoredStudentSubject {
  /** 학업 Context 범위: 학교·학년도·학년·학기 */
  termKey: string
  subjectId: string
  name: string
  origin: StudentSubjectOrigin
}

export const contextTermKey = (context: Pick<AcademicContext, 'school' | 'academicYear' | 'grade' | 'semester'>) =>
  `${context.school.schoolId}|${context.academicYear}|${context.grade}|${context.semester}`

/** 저장된 목록. 저장소를 쓸 수 없거나 내용이 깨졌으면 빈 목록 (Fixture만으로 시작) */
export function loadStudentSubjects(): StoredStudentSubject[] {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { version?: number; entries?: unknown }
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) return []
    return parsed.entries.filter(
      (entry): entry is StoredStudentSubject =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as StoredStudentSubject).termKey === 'string' &&
        typeof (entry as StoredStudentSubject).subjectId === 'string' &&
        typeof (entry as StoredStudentSubject).name === 'string' &&
        ((entry as StoredStudentSubject).origin === 'STUDENT_CREATED' || (entry as StoredStudentSubject).origin === 'OTHER_TERM'),
    )
  } catch {
    return []
  }
}

/** 저장. 실패하면 예외를 그대로 올린다 (호출 측이 등록을 실패로 처리하고 Store를 바꾸지 않는다). */
export function saveStudentSubjects(entries: StoredStudentSubject[]): void {
  window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, entries }))
}

/** Fixture 학업 정보에 저장된 과목을 다시 붙인다 (학기가 맞는 Context에만, 같은 ID는 한 번만). */
export function withStoredStudentSubjects(contexts: AcademicContext[]): AcademicContext[] {
  const entries = loadStudentSubjects()
  for (const entry of entries) {
    const context = contexts.find((item) => contextTermKey(item) === entry.termKey)
    if (!context || context.subjects.some((subject) => subject.subjectId === entry.subjectId)) continue
    const subject: SubjectRef = { subjectId: entry.subjectId, name: entry.name }
    if (entry.origin === 'STUDENT_CREATED') subject.addedByStudent = true
    context.subjects.push(subject)
  }
  return contexts
}

/** 학생이 추가한(저장소에 있는) 과목 ID — Sidebar 과목 수 시나리오가 원래 과목만 자르도록 구분할 때 쓴다 */
export function storedSubjectIds(): Set<string> {
  return new Set(loadStudentSubjects().map((entry) => entry.subjectId))
}

/** Mock 전용 새 과목 ID. 기존 `subj_NN`·시나리오 `subj_scn_NN`과 겹치지 않는 접두어를 쓰고, 저장소에 남아 새로고침해도 같다. */
export function newStudentSubjectId(existing: Set<string>): string {
  for (;;) {
    const random =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 10) : Math.random().toString(36).slice(2, 12)
    const id = `subj_custom_${random}`
    if (!existing.has(id)) return id
  }
}
