import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { downloadEvaluationPlanFile, getEvaluationPlan, previewEvaluationPlanFile } from '../api/evaluationPlansApi.ts'
import type { PlanFileMeta } from '../api/types.ts'
import { ChevronLeftIcon, DownloadIcon } from '../components/AssessmentIcons.tsx'
import { ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { PdfViewer } from '../components/university/PdfViewer.tsx'
import { formatBytes } from '../model/assessmentDetailView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import styles from './ArtifactViewerRoute.module.css'

// 학교 공통 평가계획서 원문 보기 (S-4, 2026-11-13).
// - 서버는 관리자가 확정한 문서만, 학생 자기 학교·학년도·학년·학기 문서만 준다(아니면 404). 이 화면은 그 결과를 그대로 보여 준다.
// - PDF: 인증된 API로 바이트를 받아 blob 주소로 pdf.js Viewer에 넘긴다(쪽 이동·확대·축소). ?page=N이면 그 쪽부터 연다.
// - HWP·HWPX(A25): 서버가 미리보기용 PDF로 변환한 것을 보여 준다(원본 아님 — 줄바꿈·쪽 나눔이 다를 수 있다고 알린다).
//   변환기가 없거나(415) 변환에 실패하면(422) 원본 내려받기를 안내한다.

type Loaded = { key: string; kind: 'ready'; url: string } | { key: string; kind: 'error'; status: number; message: string }

export function EvaluationPlanOriginalRoute() {
  const { planId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const plan = useApiQuery(`evaluation-plan-original:${planId}`, () => getEvaluationPlan(planId))
  const page = Math.max(1, Number(params.get('page')) || 1)
  const setPage = (next: number) =>
    setParams(
      (previous) => {
        const value = new URLSearchParams(previous)
        value.set('page', String(next))
        return value
      },
      { replace: true },
    )

  const back = (
    <button type="button" className={styles.back} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }} onClick={() => navigate(-1)}>
      <ChevronLeftIcon size={14} /> 돌아가기
    </button>
  )

  if (plan.status === 'error' && plan.error) {
    return (
      <main className={styles.page}>
        {back}
        <ErrorState title="평가계획서를 불러오지 못했어요" error={plan.error} onRetry={plan.retry} />
      </main>
    )
  }
  if (!plan.data) {
    return (
      <main className={styles.page}>
        <LoadingRows rows={3} label="평가계획서를 불러오는 중" />
      </main>
    )
  }

  const file = plan.data.file ?? null
  return (
    <main className={styles.page} data-testid="evaluation-plan-original">
      <div className={styles.head}>
        <div className={styles.titleBlock}>
          {back}
          <h1 className={styles.title}>{plan.data.fileName}</h1>
          <p className={styles.meta}>
            {plan.data.academicYear}학년도 {plan.data.grade}학년 {plan.data.semester}학기 · 학교가 공개한 평가계획서 원문이에요. 관리자가 확인한 문서만 보여요.
          </p>
        </div>
        {file?.available && <DownloadButton planId={planId} file={file} />}
      </div>
      <OriginalBody planId={planId} file={file} page={page} onPageChange={setPage} />
    </main>
  )
}

function OriginalBody({ planId, file, page, onPageChange }: { planId: string; file: PlanFileMeta | null; page: number; onPageChange: (page: number) => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const converted = file?.documentFormat === 'HWP' || file?.documentFormat === 'HWPX'
  const canPreview = Boolean(file?.available && (file.previewAvailable || converted))
  const preview = loaded && loaded.key === planId ? loaded : null

  useEffect(() => {
    if (!canPreview) return
    let cancelled = false
    let created: string | null = null
    previewEvaluationPlanFile(planId).then(
      (blob) => {
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setLoaded({ key: planId, kind: 'ready', url: created })
      },
      (cause: Error & { status?: number }) => {
        if (!cancelled) setLoaded({ key: planId, kind: 'error', status: cause.status ?? 0, message: cause.message })
      },
    )
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [planId, canPreview])

  if (!file || !file.available) {
    return <p className={styles.unsupported}>이 평가계획서는 원문 파일이 아직 등록되지 않았어요. 학교 홈페이지·학교알리미에서 확인해 주세요.</p>
  }
  if (!canPreview || (converted && preview?.kind === 'error' && preview.status === 415)) {
    return (
      <p className={styles.unsupported} data-testid="plan-original-no-preview">
        {file.documentFormat} 문서는 앱 안에서 바로 볼 수 있도록 준비하고 있어요. 지금은 원본을 내려받아 한글 프로그램에서 열어 주세요.
      </p>
    )
  }
  if (preview?.kind === 'error') {
    return (
      <p className={styles.unsupported} role="alert" data-testid="plan-original-error">
        {converted && preview.status === 422 ? `${file.documentFormat} 문서를 미리보기로 바꾸지 못했어요. 원본을 내려받아 한글 프로그램에서 열어 주세요.` : `원문을 불러오지 못했어요. ${preview.message}`}
      </p>
    )
  }
  if (preview?.kind !== 'ready') {
    return <LoadingRows rows={3} label="원문을 불러오는 중" />
  }
  if (converted) {
    return (
      <>
        <p className={styles.unsupported} data-testid="plan-converted-notice">
          {file.documentFormat} 원본을 미리보기용 PDF로 바꿔 보여 드려요. 글꼴이 달라 줄바꿈·쪽 나눔이 원본과 조금 다를 수 있어요. 정확한 내용은 원본을 내려받아 확인해 주세요.
        </p>
        <PdfViewer url={preview.url} title={`${file.fileName} (미리보기 변환)`} expectedPageCount={0} page={page} onPageChange={onPageChange} />
      </>
    )
  }
  return <PdfViewer url={preview.url} title={file.fileName} expectedPageCount={file.pageCount ?? 0} page={page} onPageChange={onPageChange} />
}

function DownloadButton({ planId, file }: { planId: string; file: PlanFileMeta }) {
  const [error, setError] = useState<string | null>(null)
  const download = () => {
    setError(null)
    downloadEvaluationPlanFile(planId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = file.fileName
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setError(`내려받지 못했어요. ${cause.message}`),
    )
  }
  return (
    <div className={styles.controls}>
      <span className={styles.meta}>
        {file.documentFormat} · {formatBytes(file.sizeBytes)}
        {file.pageCount ? ` · ${file.pageCount}쪽` : ''}
      </span>
      <button type="button" className={styles.button} onClick={download} data-testid="plan-original-download">
        <DownloadIcon size={14} /> 원본 내려받기
      </button>
      {error && (
        <span className={styles.meta} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
