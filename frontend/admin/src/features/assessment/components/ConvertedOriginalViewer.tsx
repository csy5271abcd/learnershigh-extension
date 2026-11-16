import { useEffect, useState } from 'react'
import { previewPlanRevision } from '../api/assessmentAdminApi.ts'
import type { PlanFileMeta } from '../api/types.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { AlertIcon, InfoIcon, PdfViewer } from './canonicalUi.ts'
import { PlanStructureViewer, type StructureFocus } from './PlanStructureViewer.tsx'

// A25 HWP·HWPX 원문 미리보기: 서버가 원본을 PDF로 변환한 '미리보기 변환본'을 PDF Viewer로 보여 준다(api-contract §38-10).
// - 변환 PDF는 원본이 아니다: 글꼴 대체로 줄바꿈·쪽 나눔이 다를 수 있어 그렇게 알린다. 공식 대조는 원본 다운로드.
// - 분석 근거는 구역·표 위치(documentLocator)라 변환 PDF의 쪽으로 옮기지 않는다 → '분석용 구조' 탭에서 강조한다.
// - 변환기 미설정(415)·변환 실패(422)는 구분해 안내하고, 구조 추출 화면을 변환 결과처럼 보이게 하지 않는다.
type Loaded = { key: string; kind: 'ready'; url: string } | { key: string; kind: 'error'; status: number; message: string }

export function ConvertedOriginalViewer({ planId, revisionId, file, focus, onDownload }: { planId: string; revisionId: string; file: PlanFileMeta; focus: StructureFocus | null; onDownload: () => void }) {
  const key = `${planId}/${revisionId}`
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'pdf' | 'structure'>('pdf')
  const [lastFocus, setLastFocus] = useState(focus)
  if (focus !== lastFocus) {
    // 분석 근거로 이동 요청 → 위치를 정확히 보여 줄 수 있는 구조 탭으로 (쪽 번호로 추측하지 않는다)
    setLastFocus(focus)
    if (focus && file.structurePreviewAvailable) setTab('structure')
  }
  const result = loaded && loaded.key === key ? loaded : null

  useEffect(() => {
    let cancelled = false
    let created: string | null = null
    previewPlanRevision(planId, revisionId).then(
      (blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setLoaded({ key, kind: 'ready', url: created })
      },
      (cause: Error & { status?: number }) => {
        if (!cancelled) setLoaded({ key, kind: 'error', status: cause.status ?? 0, message: cause.message })
      },
    )
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [key, planId, revisionId, attempt])

  return (
    <div className={styles.convertedViewer} data-testid="plan-converted-viewer">
      <div className={styles.viewerTabs} role="tablist" aria-label="원문 보기 방식">
        <button type="button" role="tab" aria-selected={tab === 'pdf'} className={styles.viewerTab} onClick={() => setTab('pdf')} data-testid="plan-converted-tab-pdf">
          PDF 미리보기
        </button>
        {file.structurePreviewAvailable && (
          <button type="button" role="tab" aria-selected={tab === 'structure'} className={styles.viewerTab} onClick={() => setTab('structure')} data-testid="plan-converted-tab-structure">
            분석용 구조
          </button>
        )}
      </div>
      {tab === 'structure' ? (
        <>
          <p className={styles.viewerNotice}>
            <InfoIcon size={14} /> 분석 근거 위치(구역·표·행·열)를 찾기 위한 추출 구조예요. 원본 서식과 다르게 보일 수 있어요.
          </p>
          <PlanStructureViewer planId={planId} revisionId={revisionId} focus={focus} />
        </>
      ) : result?.kind === 'ready' ? (
        <>
          <p className={styles.viewerNotice} data-testid="plan-converted-notice">
            <InfoIcon size={14} /> {file.documentFormat} 원본을 미리보기용 PDF로 변환해 보여 드려요. 글꼴이 달라 줄바꿈·쪽 나눔이 원본과 다를 수 있어요. 정확한 대조는 원본을 내려받아 확인해 주세요.
          </p>
          <PdfViewer url={result.url} title={`${file.fileName} (미리보기 변환)`} expectedPageCount={0} page={page} onPageChange={setPage} />
        </>
      ) : result?.kind === 'error' ? (
        <div className={styles.viewerNotice} role="alert" data-testid="plan-converted-error" data-status={result.status}>
          <AlertIcon size={15} />
          <div>
            <strong>{result.status === 415 ? 'PDF 미리보기 변환기가 설정되지 않았어요' : result.status === 422 ? '이 문서를 PDF로 변환하지 못했어요' : '미리보기를 불러오지 못했어요'}</strong>
            <p style={{ margin: '4px 0 8px' }}>
              {result.status === 415 ? '원본은 서버에 그대로 보관되어 있어요. 원본을 내려받아 한글 프로그램에서 확인해 주세요. (개발 환경: 실행 가이드의 ASSESSMENT_PREVIEW_CONVERTER 설정)' : result.message}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={styles.secondaryButton} onClick={onDownload} data-testid="plan-converted-download">
                원본 내려받기
              </button>
              {result.status !== 415 && result.status !== 422 && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setLoaded(null)
                    setAttempt((value) => value + 1)
                  }}
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div aria-busy="true" data-testid="plan-converted-loading">
          <p className={styles.muted}>원문을 PDF로 변환하는 중… 처음 여는 문서는 10초 정도 걸릴 수 있어요.</p>
        </div>
      )}
    </div>
  )
}
