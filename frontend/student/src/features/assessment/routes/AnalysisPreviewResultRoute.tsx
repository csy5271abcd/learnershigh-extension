import { Link, useNavigate, useParams } from 'react-router'
import formStyles from '../components/AddSchoolAssessmentModal.module.css'
import { ChevronLeftIcon, InfoIcon } from '../components/AssessmentIcons.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { AnalysisPreviewResult } from '../components/pdf-import/AnalysisPreviewResult.tsx'
import styles from '../components/pdf-import/pdfImport.module.css'
import { getPreview } from '../model/analysisPreviewSession.ts'
import { schoolAssessmentsPath } from './paths.ts'

// 평가계획서 분석 미리보기 결과 — 전체 페이지 (2026-11-11, 개발 Flag 전용).
// - 시각 구조는 기존 S5 결과 화면(`PdfImportReviewRoute`: 뒤로 → 제목 → 문서 줄 → 후보 안내 → 과목 탭 → 지필/수행/운영/근거 블록)을 따른다.
//   Student 목업에는 분석 결과 화면 PNG가 없다(screen-map S5 "결과 검토 화면은 Mockup 미제공").
// - 데이터는 계정 B 로컬 분석기의 실제 응답(`backendImport.payload` + `analysis`)뿐이다. 없는 값은 만들지 않고
//   "미추출"(분석기가 찾지 못함) / "분석기 미지원"(분석 결과 형식에 항목 자체가 없음)으로 구분한다.
// - 결과는 저장되지 않는다(메모리 전용). 공식 평가정보·학생 수행평가로 쓰지 않는다. 확정·가져오기 버튼을 두지 않는다.
// - 결과 본문은 components/pdf-import/AnalysisPreviewResult.tsx (Admin 평가계획서 자동 분석 미리보기와 공용).

export function AnalysisPreviewResultRoute() {
  const { previewId = '' } = useParams()
  const entry = getPreview(previewId)
  const navigate = useNavigate()
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate(schoolAssessmentsPath))

  return (
    <main className={enrichmentStyles.page}>
      <div className={enrichmentStyles.mainArea}>
        <div className={`${enrichmentStyles.content} ${styles.reviewArea}`} data-testid="analysis-preview-page">
          <button type="button" className={`${enrichmentStyles.backLink} ${styles.backButton}`} onClick={goBack}>
            <ChevronLeftIcon size={15} />
            학교 수행평가
          </button>
          <h1 className={styles.reviewTitle}>평가계획서 분석 결과</h1>
          {entry ? (
            <AnalysisPreviewResult
              entry={entry}
              emptyAction={
                <Link to={schoolAssessmentsPath} className={formStyles.primaryButton}>
                  목록에서 직접 추가하기
                </Link>
              }
            />
          ) : (
            <MissingPreview />
          )}
        </div>
      </div>
    </main>
  )
}

function MissingPreview() {
  return (
    <section className={styles.stateBox} role="status" data-testid="analysis-preview-missing">
      <InfoIcon size={22} />
      <p className={styles.stateTitle}>분석 결과를 다시 불러올 수 없어요</p>
      <p className={styles.stateText}>
        분석 미리보기는 저장되지 않아요. 새로고침하거나 주소를 직접 열면 결과가 사라져요. 학교 수행평가에서 "평가계획서 가져오기"로 파일을 다시 분석해 주세요.
      </p>
      <div className={styles.stateActions}>
        <Link to={schoolAssessmentsPath} className={formStyles.primaryButton}>
          학교 수행평가로 가기
        </Link>
      </div>
    </section>
  )
}
