import type {
  EnrichmentSourceReference,
  UniversityExamCategory,
  UniversityExamDocument,
  UniversityExamQuestion,
  UniversityExamSectionKind,
  UniversityResource,
} from '../types.ts'
import { fail, respond, scenarioActive } from './mockRuntime.ts'
import manifest from './universityExamManifest.json'

// 대학별 기출 PDF 카탈로그 Mock (P-25 PROPOSED). 원본은 references/previous-exam-questions의 PDF이고,
// Manifest(universityExamManifest.json)는 `npm run exam-manifest`(tools/university-exam-manifest.mjs)로 실제 폴더와 대조한다.
// 화면을 열 때마다 PDF를 다시 분석하지 않는다. 원문 파일은 개발 서버 전용 경로로만 열린다 (vite.config.ts).

const categories = new Set<UniversityExamCategory>(['PAST_EXAM', 'SAMPLE_QUESTION', 'OTHER'])
const sectionKinds = new Set<UniversityExamSectionKind>(['INTENT', 'BASIS', 'EXPLANATION', 'RUBRIC', 'SAMPLE_ANSWER', 'REVIEW'])

/** Manifest를 화면 타입으로 옮긴다. 모르는 유형은 OTHER, 모르는 구획·잘못된 쪽은 버린다 (추측해서 채우지 않는다). */
function normalizeDocument(raw: (typeof manifest.documents)[number]): UniversityExamDocument {
  const pageCount = raw.pageCount
  const validPage = (page: unknown): page is number => Number.isInteger(page) && (page as number) >= 1 && (page as number) <= pageCount
  const questions: UniversityExamQuestion[] = raw.questions
    .filter((question) => validPage(question.pageStart))
    .map((question) => ({
      questionId: question.questionId,
      label: question.label,
      field: question.field ?? null,
      topic: question.topic ?? null,
      concepts: [...question.concepts],
      pageStart: question.pageStart,
      pageEnd: validPage(question.pageEnd) ? question.pageEnd : null,
      sections: question.sections
        .filter((section) => sectionKinds.has(section.kind as UniversityExamSectionKind) && validPage(section.page))
        .map((section) => ({ kind: section.kind as UniversityExamSectionKind, page: section.page })),
      ...('studyExamples' in question && Array.isArray(question.studyExamples) ? { studyExamples: [...question.studyExamples] } : {}),
    }))
  return {
    documentId: raw.documentId,
    university: raw.university,
    universityName: raw.universityName,
    academicYear: raw.academicYear,
    category: categories.has(raw.category as UniversityExamCategory) ? (raw.category as UniversityExamCategory) : 'OTHER',
    examType: raw.examType,
    title: raw.title,
    subjectAreas: [...raw.subjectAreas],
    relativePath: raw.relativePath,
    fileName: raw.fileName,
    sizeBytes: raw.sizeBytes,
    sha256: raw.sha256,
    pageCount,
    indexStatus: raw.indexStatus === 'INDEXED' && questions.length > 0 ? 'INDEXED' : 'NONE',
    questions,
  }
}

export const universityExamDocuments: UniversityExamDocument[] = manifest.documents.map(normalizeDocument)

const examTypeResourceLabel = (document: UniversityExamDocument) =>
  document.category === 'SAMPLE_QUESTION' ? `${document.examType}` : document.category === 'PAST_EXAM' ? `${document.examType} 기출` : document.examType

/**
 * §27 목록 Mock도 같은 문서 카탈로그에서 만든다 (같은 자료 = 같은 ID). 공식 원본 URL은 확인되지 않아 null이다.
 * relatedConcepts는 원문의 개념 칸을 모은 것이고 inquiryIdeas는 학생용 예시(공식 추천 아님)만 담는다.
 */
export function universityResourcesFromExams(): UniversityResource[] {
  return universityExamDocuments.map((document) => ({
    resourceId: document.documentId,
    university: document.university,
    title: document.title,
    academicYear: document.academicYear,
    resourceType: examTypeResourceLabel(document),
    officialUrl: null,
    checkedAt: null,
    relatedConcepts: [...new Set(document.questions.flatMap((question) => question.concepts))],
    inquiryIdeas: document.questions.flatMap((question) => question.studyExamples ?? []),
  }))
}

const serverError = () => fail(500, { code: 'INTERNAL_ERROR', message: '일시적인 서버 오류가 발생했어요.', details: {} })

/** P-25 제안: 대학별 기출 문서 목록 (필터·검색은 화면이 받은 목록 안에서 한다) */
export function listUniversityExamDocumentsMock(): Promise<{ items: UniversityExamDocument[] }> {
  return respond(() => {
    if (scenarioActive('universityError')) serverError()
    return { items: scenarioActive('enrichmentEmpty') ? [] : universityExamDocuments }
  })
}

/** P-25 제안: 문서 상세 (문항 인덱스 포함) */
export function getUniversityExamDocumentMock(documentId: string): Promise<UniversityExamDocument> {
  return respond(() => {
    if (scenarioActive('universityExamDetailError')) serverError()
    const document = universityExamDocuments.find((item) => item.documentId === documentId)
    if (!document) {
      fail(404, { code: 'UNIVERSITY_RESOURCE_NOT_FOUND', message: '대학 자료를 찾을 수 없어요.', details: { resourceId: documentId } })
    }
    return document
  })
}

/** §18 sourceReference.locator(P-25)가 그 문서 안의 실제 쪽·문항을 가리키는지 */
export function isValidExamLocator(source: EnrichmentSourceReference): boolean {
  const locator = source.locator
  if (!locator) return true
  const document = universityExamDocuments.find((item) => item.documentId === source.sourceId)
  if (!document || !Number.isInteger(locator.page) || locator.page < 1 || locator.page > document.pageCount) return false
  return locator.questionId === null || document.questions.some((question) => question.questionId === locator.questionId)
}
