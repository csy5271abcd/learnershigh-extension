import type { AcademicContext, SubjectRef } from '../api/types.ts'
import { isSameTerm } from './academicTerm.ts'

// 학생 과목 추가 규칙 (2026-10-28, P-26 PROPOSED). 화면 검증과 Mock 서버 검증이 같은 규칙을 쓴다.
// 과목명 길이 제한은 계약에 없어 Mock UI 규칙이다.

/** 과목명 최대 길이 (Mock UI 규칙, 계약 미정) */
export const subjectNameMaxLength = 40

/** 저장할 표시 이름: Unicode NFC, 앞뒤 공백 제거, 연속 공백 하나로 */
export function cleanSubjectName(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim()
}

/**
 * 중복 비교 키: 호환 문자 정규화(NFKC, 예: 전각 문자), 공백 제거, 영문 대소문자 무시.
 * "공통국어1"과 "공통국어2", "물리학Ⅰ"과 "물리학Ⅱ"는 다른 키로 남는다.
 */
export function subjectNameKey(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, '').toLocaleLowerCase('ko')
}

export type SubjectNameProblem = 'required' | 'tooLong' | 'duplicate'

export function subjectNameProblem(name: string, existing: SubjectRef[]): SubjectNameProblem | null {
  const cleaned = cleanSubjectName(name)
  if (!cleaned) return 'required'
  if ([...cleaned].length > subjectNameMaxLength) return 'tooLong'
  const key = subjectNameKey(cleaned)
  return existing.some((subject) => subjectNameKey(subject.name) === key) ? 'duplicate' : null
}

export const subjectNameMessages: Record<SubjectNameProblem, string> = {
  required: '과목명을 입력해 주세요.',
  tooLong: `과목명은 ${subjectNameMaxLength}자까지 입력할 수 있어요.`,
  duplicate: '이미 등록된 과목입니다.',
}

/**
 * 기존 과목 후보: 같은 학생의 다른 학기 학업 정보(§9-1)에 있는 과목 중 이 학기에 없는 것.
 * 학교 공식 과목 카탈로그가 아니므로 "다른 학기에서 쓰던 과목"으로만 안내한다. 학생이 직접 만든 과목도 다른 학기에서 다시 고를 수 있다.
 */
export function subjectCandidates(contexts: AcademicContext[], target: AcademicContext): SubjectRef[] {
  const taken = new Set(target.subjects.map((subject) => subjectNameKey(subject.name)))
  const seen = new Set<string>()
  const candidates: SubjectRef[] = []
  for (const context of contexts) {
    if (isSameTerm(context, target)) continue
    for (const subject of context.subjects) {
      const key = subjectNameKey(subject.name)
      if (taken.has(key) || seen.has(key)) continue
      seen.add(key)
      candidates.push(subject)
    }
  }
  return candidates
}
