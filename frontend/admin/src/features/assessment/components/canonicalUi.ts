// Student Assessment와 같은 모양이어야 하는 공통 UI의 Admin 쪽 유일한 입구 (2026-10-29, P-27 PROPOSED).
// Router에 묶이지 않은 표현 컴포넌트만 가져온다 (Admin은 react-router를 쓰지 않는다).
// 공유 위치가 승인되면 이 파일의 경로만 바꾼다. 데이터 입구는 api/canonicalSource.ts.

// `.lh-assessment` 하위에만 적용되는 Assessment Design Token (전역 Admin Shell 스타일은 바꾸지 않는다)
import '../../../../../student/src/features/assessment/styles/assessmentTheme.css'

export { Modal } from '../../../../../student/src/features/assessment/components/Modal.tsx'
export { EmptyState, ErrorState, LoadingRows } from '../../../../../student/src/features/assessment/components/StateViews.tsx'
export { Toast, type ToastMessage } from '../../../../../student/src/features/assessment/components/Toast.tsx'
export * from '../../../../../student/src/features/assessment/components/AssessmentIcons.tsx'
export { PdfViewer } from '../../../../../student/src/features/assessment/components/university/PdfViewer.tsx'
// 학생 Assessment 화면 전체를 읽기 전용으로 그리는 Viewer (요청 ⑧, P-28). Router는 Viewer 안에서만 산다
export { AssessmentReadOnlyViewer } from '../../../../../student/src/features/assessment/routes/AssessmentReadOnlyViewer.tsx'
export { ExamQuestionNavigator } from '../../../../../student/src/features/assessment/components/university/ExamQuestionNavigator.tsx'
// Student 노트 블록 렌더러 (관리자 상세에서도 학생 화면과 같은 블록 표현, 시연 피드백 ③)
export { NoteBlocksView } from '../../../../../student/src/features/assessment/components/detail/NoteSection.tsx'
export { ReferenceCategoryIcon } from '../../../../../student/src/features/assessment/components/reference-links/ReferenceSourceCard.tsx'
// 평가계획서 분석 미리보기 결과 본문 (Student 결과 페이지와 같은 화면, Router 없음). 학교별 평가계획서의 자동 분석 미리보기에서 쓴다 (2026-11-12)
export { AnalysisPreviewResult } from '../../../../../student/src/features/assessment/components/pdf-import/AnalysisPreviewResult.tsx'
