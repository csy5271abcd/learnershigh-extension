import { useEffect, useRef, useState } from 'react'
import { AnalysisPreviewError, analysisPreviewMaxBytes, checkAnalyzerHealth, fileSha256, requestAnalysisPreview, type AnalysisPreviewResponse } from '../api/canonicalSource.ts'
import { AlertIcon, AnalysisPreviewResult, FileIcon, InfoIcon, UploadIcon } from '../components/canonicalUi.ts'
import styles from '../styles/assessmentAdmin.module.css'

// 학교별 평가계획서 — 자동 분석 미리보기 (2026-11-12, 개발 Flag 전용).
// - 공식 평가계획서 운영 권한(OD-A08)이 없는 담당 학교에서 쓰는 화면이다. 공식 등록·검토·확정은 하지 않는다(서버 권한 그대로).
// - 기존 로컬 분석기 Proxy(/dev-analysis, 토큰은 개발 서버 Node에서만)와 Student 분석 미리보기 Client·결과 화면을 그대로 쓴다.
// - 결과는 이 화면 메모리에만 있고 서버·브라우저 저장소에 남기지 않는다.

const failureTitles: Record<AnalysisPreviewError['kind'], string> = {
  CONNECTION: '분석기 연결 실패',
  UNSUPPORTED: '지원하지 않는 문서',
  EXTRACTION: '원문 추출 실패',
  TOO_LARGE: '파일이 너무 커요',
  BUSY: '분석기가 다른 문서를 분석 중이에요',
  ANALYSIS: '분석 실패',
  REQUEST: '분석 요청 오류',
}

type Health = { state: 'checking' } | { state: 'ok'; version: string | null } | { state: 'down'; message: string }

interface Entry {
  previewId: string
  fileName: string
  fileSize: number
  localSha256: string | null
  analyzedAt: string
  result: AnalysisPreviewResponse
}

export function PlanAnalysisPreviewPanel({ schoolName, academicYear }: { schoolName: string; academicYear: number }) {
  const [year, setYear] = useState(academicYear)
  const [grade, setGrade] = useState(1)
  const [semester, setSemester] = useState(2)
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [health, setHealth] = useState<Health>({ state: 'checking' })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    checkAnalyzerHealth().then((result) => {
      if (!alive) return
      setHealth(result.reachable ? { state: 'ok', version: result.defaultAnalyzerVersion } : { state: 'down', message: result.message ?? '분석기 응답 없음' })
    })
    return () => {
      alive = false
    }
  }, [])

  const pick = (next: File | null) => {
    setError(null)
    setEntry(null)
    if (next && next.size > analysisPreviewMaxBytes) {
      setFile(null)
      setError(`파일이 너무 커요 (최대 ${Math.round(analysisPreviewMaxBytes / 1024 / 1024)}MB).`)
      return
    }
    setFile(next)
  }

  const start = async () => {
    if (!file || pending) return
    setPending(true)
    setError(null)
    setEntry(null)
    try {
      const [result, localSha256] = await Promise.all([requestAnalysisPreview(file), fileSha256(file).catch(() => null)])
      setEntry({ previewId: 'admin-preview', fileName: file.name, fileSize: file.size, localSha256, analyzedAt: new Date().toISOString(), result })
    } catch (caught) {
      setError(caught instanceof AnalysisPreviewError ? `${failureTitles[caught.kind]} · ${caught.message} (${caught.code})` : '분석 요청 중 알 수 없는 오류가 났어요.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="plan-preview-heading" data-testid="plan-analysis-preview">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 'var(--as-radius-md)', background: 'var(--as-color-primary-soft)', color: 'var(--as-color-text)', marginBottom: 16 }}>
        <InfoIcon size={16} />
        <div>
          <p style={{ margin: 0, fontWeight: 600 }} id="plan-preview-heading">
            평가계획서 자동 분석 — 사용 가능
          </p>
          <p className={styles.hint} style={{ margin: '4px 0 0' }} data-testid="plan-official-restricted">
            관리자 검토 및 공식 확정 — 이 학교의 공식 평가계획서 운영 권한이 없어 제한돼요(OD-A08). 담당 학생의 학교 문서를 규칙 기반으로 분석해 후보만 보여 주고, 결과는 저장하지 않아요.
          </p>
        </div>
      </div>

      <p className={styles.hint} data-testid="plan-analyzer-health" style={{ marginBottom: 12 }}>
        {health.state === 'checking' && '로컬 분석기 확인 중…'}
        {health.state === 'ok' && `로컬 분석기 연결됨 (기본 ${health.version ?? '버전 미확인'}) · AI·LLM 호출 없음`}
        {health.state === 'down' && `로컬 분석기 연결 안 됨 · ${health.message}`}
      </p>

      <div className={styles.toolbar} style={{ flexWrap: 'wrap' }}>
        <span className={styles.sectionTitle} style={{ fontSize: 15 }}>
          {schoolName}
        </span>
        <select className={styles.select} aria-label="분석 학년도" value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {[academicYear, academicYear - 1].map((value) => (
            <option key={value} value={value}>
              {value}학년도
            </option>
          ))}
        </select>
        <select className={styles.select} aria-label="분석 학년" value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
          {[1, 2, 3].map((value) => (
            <option key={value} value={value}>
              고{value}
            </option>
          ))}
        </select>
        <select className={styles.select} aria-label="분석 학기" value={semester} onChange={(event) => setSemester(Number(event.target.value))}>
          {[1, 2].map((value) => (
            <option key={value} value={value}>
              {value}학기
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.hwp,.hwpx,application/pdf"
          aria-label="평가계획서 파일 (PDF·HWP·HWPX)"
          data-testid="plan-preview-file"
          style={{ display: 'none' }}
          onChange={(event) => pick(event.target.files?.[0] ?? null)}
        />
        <button type="button" className={styles.secondaryButton} onClick={() => inputRef.current?.click()} disabled={pending}>
          <FileIcon size={15} /> 파일 선택 (PDF·HWP)
        </button>
        <button type="button" className={`${styles.primaryButton} ${styles.toolbarEnd}`} onClick={start} disabled={!file || pending} data-testid="plan-preview-start" title={!file ? '먼저 파일을 선택해 주세요' : undefined}>
          <UploadIcon size={15} /> {pending ? '분석 중…' : '분석 시작'}
        </button>
      </div>
      <p className={styles.hint} style={{ margin: '6px 0 16px' }} data-testid="plan-preview-selected">
        {file ? `선택한 파일: ${file.name} · ${year}학년도 고${grade} ${semester}학기 문서로 분석` : '분석할 PDF·HWP·HWPX 파일을 선택해 주세요. 파일은 서버에 저장되지 않아요.'}
      </p>

      {error && (
        <p role="alert" className={styles.hint} style={{ color: 'var(--as-color-danger)', display: 'flex', gap: 6, alignItems: 'center' }} data-testid="plan-preview-error">
          <AlertIcon size={14} /> {error}
        </p>
      )}
      {pending && (
        <p role="status" className={styles.muted}>
          분석기가 문서를 읽고 있어요 (HWP 약 1초, PDF 3~4초).
        </p>
      )}
      {entry && (
        <div data-testid="plan-preview-result">
          <AnalysisPreviewResult
            entry={entry}
            footnote={`이 결과는 저장되지 않았어요(다른 학교·파일을 고르면 사라져요). ${schoolName} ${year}학년도 고${grade} ${semester}학기 문서로 선택해 분석했어요. 공식 평가계획서 등록·검토·확정은 운영 권한이 있는 관리자만 할 수 있어요.`}
          />
        </div>
      )}
    </section>
  )
}
