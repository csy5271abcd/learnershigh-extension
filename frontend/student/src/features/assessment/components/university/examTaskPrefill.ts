import type { SubjectRef, UniversityExamDocument, UniversityExamQuestion } from '../../api/types.ts'
import { documentConcepts, examSourceLine, suggestedSubjectId } from '../../model/universityExamView.ts'
import type { CreateEnrichmentPrefill } from '../enrichment/CreateEnrichmentModal.tsx'

/**
 * 대학 기출 PDF에서 심화 탐구를 시작할 때의 Modal 초기값 (§18 POST + sourceReference.locator P-25).
 * 탐구 주제·질문은 비워 둔다 — 학생이 직접 쓴다. 출처·개념은 원문 데이터에서만 가져온다.
 * page가 없으면(목록 카드에서 시작) 문서 전체를 출처로 남긴다.
 */
export function examTaskPrefill(
  document: UniversityExamDocument,
  question: UniversityExamQuestion | null,
  page: number | null,
  subjects: SubjectRef[],
): CreateEnrichmentPrefill {
  const concepts = question ? question.concepts : documentConcepts(document).slice(0, 10)
  const lines = [document.title]
  if (page) lines.push(examSourceLine(document, question, page, question && question.pageStart === page ? question.pageEnd : null))
  return {
    title: '',
    goal: '',
    subjectId: suggestedSubjectId(subjects, question?.field ?? (document.subjectAreas.length === 1 ? document.subjectAreas[0] : null)),
    sourceReference: {
      type: 'UNIVERSITY_RESOURCE',
      sourceId: document.documentId,
      locator: page ? { questionId: question?.questionId ?? null, page } : null,
    },
    sourceTitle: document.title,
    sourceDetails: { lines, concepts, examples: question?.studyExamples },
    modalTitle: question ? '이 기출문제로 심화 탐구하기' : '이 자료로 심화 탐구하기',
    goalLabel: '탐구 질문',
    goalPlaceholder: '기출 문항을 읽고 더 알아보고 싶어진 질문을 적어 보세요. 나중에 바꿔도 돼요.',
  }
}
