// Assessment Route (Extension Student App 내부 경로. 기존 LearnersHigh URL이 아니다).
// assessment-screen-map.md의 Route 제안을 따른다.

export const assessmentPath = '/assessment'
export const assessmentRoutePattern = 'assessment'

export const schoolAssessmentsPath = '/assessment/school-assessments'
export const schoolAssessmentDetailPath = (assessmentId: string) =>
  `${schoolAssessmentsPath}/${encodeURIComponent(assessmentId)}`
export const academicInfoPath = '/assessment/academic-info'

/** 과목별 목록은 같은 목록에 과목 필터를 적용한 것이다 (assessment-student.md §6). */
export const subjectAssessmentsPath = (subjectId: string) =>
  `${schoolAssessmentsPath}?subject=${encodeURIComponent(subjectId)}`

/** 평가계획서 분석 결과 검토·가져오기 (screen-map S5). 가져오기 Modal에서 분석을 요청한 뒤 이동한다. */
export const pdfImportReviewPath = (documentRevisionId: string) =>
  `${schoolAssessmentsPath}/pdf-import/${encodeURIComponent(documentRevisionId)}`

/** 상세를 피드백 탭이 열린 상태로 연다 (선생님 피드백 목록 → 과제 복귀) */
export const schoolAssessmentFeedbackPath = (assessmentId: string) =>
  `${schoolAssessmentDetailPath(assessmentId)}?panel=feedback`

/** 상세를 노트 수정 이력이 열린 상태로 연다 (목록 "기록" 열) */
export const schoolAssessmentHistoryPath = (assessmentId: string) => `${schoolAssessmentDetailPath(assessmentId)}?history=1`

/** 선생님 피드백 목록 (screen-map S15). 필터는 `?status=PENDING|DELIVERED` */
export const feedbackPath = '/assessment/feedback'
export const feedbackSection = { path: feedbackPath, label: '선생님 피드백' } as const

/**
 * 심화 탐구 (screen-map S16~S20). 탭: 탐구 라이브러리 / 모의고사 지문 / 내 탐구 / 대학별 자료.
 * 검색·필터·선택은 URL Query(`q`, `subject`, `selected`, `university`, `year`, `type`)에 둔다.
 */
export const enrichmentPath = '/assessment/enrichment'
export const enrichmentSection = { path: enrichmentPath, label: '심화 탐구' } as const
export const mockExamMaterialsPath = `${enrichmentPath}/mock-exams`
export const mockExamMaterialDetailPath = (materialId: string) =>
  `${mockExamMaterialsPath}/${encodeURIComponent(materialId)}`
export const myEnrichmentTasksPath = `${enrichmentPath}/my`
export const universityResourcesPath = `${enrichmentPath}/universities`
/**
 * 대학별 기출 PDF 원문 보기 (2026-10-28, P-25). `?page=`는 PDF 물리 쪽(문항은 쪽에서 다시 찾는다),
 * `?task=`는 탐구 노트에서 열었을 때 돌아갈 탐구 (노트에 이 쪽 추가·노트로 돌아가기).
 */
export const universityExamDocumentPath = (documentId: string, options: { page?: number; task?: string | null } = {}) => {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.task) params.set('task', options.task)
  const query = params.toString()
  return `${universityResourcesPath}/${encodeURIComponent(documentId)}${query ? `?${query}` : ''}`
}
export const enrichmentTaskDetailPath = (taskId: string) => `${enrichmentPath}/tasks/${encodeURIComponent(taskId)}`

/** 자료함 (screen-map S21). 검색·유형·추천 과목은 URL Query(`q`, `type`, `subject`)에 둔다. */
export const resourcesPath = '/assessment/resources'
export const resourcesSection = { path: resourcesPath, label: '자료함' } as const
export const resourceDetailPath = (resourceId: string) => `${resourcesPath}/${encodeURIComponent(resourceId)}`

/**
 * 참고자료 (2026-10-28 신설, screen-map S25). 과목별 공식 자료원(사이트·채널)을 찾는 탐색 화면이다.
 * 학생이 저장한 개별 자료를 모으는 자료함(`/resources`)과 다르다. 과목 영역·검색·분류는 URL Query(`area`, `q`, `category`)에 둔다.
 */
export const referenceLinksPath = '/assessment/reference-links'
export const referenceLinksSection = { path: referenceLinksPath, label: '참고자료' } as const
export const referenceLinksAreaPath = (areaKey: string) => `${referenceLinksPath}?area=${encodeURIComponent(areaKey)}#browse`

/**
 * 성장 기록 (screen-map S22). 과목 필터는 `?subject=`. 새 기록은 관련 활동을 `?sourceType=&sourceId=`로 미리 채울 수 있다.
 * 학생 개인 기록이며 학교생활기록부(세특) 문장이 아니다.
 */
export const growthPath = '/assessment/growth'
export const growthSection = { path: growthPath, label: '성장 기록' } as const
export const growthRecordDetailPath = (recordId: string) => `${growthPath}/${encodeURIComponent(recordId)}`
export const growthRecordNewPath = (sourceType?: string, sourceId?: string) =>
  sourceType && sourceId
    ? `${growthPath}/new?sourceType=${encodeURIComponent(sourceType)}&sourceId=${encodeURIComponent(sourceId)}`
    : `${growthPath}/new`

/** 성장 기록의 관련 활동 상세 경로 (독립 활동이면 null) */
export const relatedSourcePath = (record: { relatedSourceType: string | null; relatedSourceId: string | null }) =>
  record.relatedSourceType === 'SCHOOL_ASSESSMENT' && record.relatedSourceId
    ? schoolAssessmentDetailPath(record.relatedSourceId)
    : record.relatedSourceType === 'ENRICHMENT_TASK' && record.relatedSourceId
      ? enrichmentTaskDetailPath(record.relatedSourceId)
      : null

/** 보관함·홈 최근 기록 행의 원본 경로. 라이브러리 콘텐츠는 탐구 라이브러리에서 그 카드를 선택해 연다. */
export const archiveSourcePath = (sourceType: string, sourceId: string) =>
  sourceType === 'SCHOOL_ASSESSMENT'
    ? schoolAssessmentDetailPath(sourceId)
    : sourceType === 'ENRICHMENT_TASK'
      ? enrichmentTaskDetailPath(sourceId)
      : `${enrichmentPath}?selected=${encodeURIComponent(sourceId)}`

/** 보관함 (screen-map S23). 탭·검색·과목은 URL Query(`tab`, `q`, `subject`)에 둔다. 원본을 조회하는 Projection이다. */
export const archivePath = '/assessment/archive'
export const archiveSection = { path: archivePath, label: '보관함' } as const

/** 수행평가 꿀팁 (screen-map S14). 선택한 팁은 `?tip=TIP01`. 수행평가 상세에서는 같은 내용을 Modal로 연다. */
export const tipsPath = '/assessment/tips'
export const tipsSection = { path: tipsPath, label: '수행평가 꿀팁' } as const
