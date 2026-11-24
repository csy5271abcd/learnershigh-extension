import { useEffect, useRef, useState } from 'react'
import { getSchoolInfoImport, importFromSchoolInfo } from '../api/assessmentAdminApi.ts'
import type { SchoolInfoImportResult } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import review from '../review/review.module.css'

/**
 * PR #18 (A27-UX 부록 D 통합): 학교 이름으로 학교알리미 평가계획서를 불러온다 — 공시 파일을 받아 학년별 문서로 등록하고 서버 안 분석까지 한 번에.
 * 등록된 문서는 관리자 등록 문서와 같다(검토·확정 전 학생 비공개). 학생 화면의 '학교 공식 공개 원본'으로 표시하지 않는다(출처 증명 계약 전).
 */
export function SchoolInfoImportModal({ schoolId, schoolName, academicYear, onClose, onDone }: {
  schoolId: string
  schoolName: string
  academicYear: number
  onClose: () => void
  onDone: (result: SchoolInfoImportResult) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(schoolName.startsWith('학교 코드') ? '' : schoolName)
  const [semester, setSemester] = useState(2)
  const [grade, setGrade] = useState(1)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SchoolInfoImportResult | null>(null)

  // 분석은 서버가 차례로 돌린다: 끝날 때까지 1.5초마다 진행 상황을 다시 읽는다
  const jobId = result?.state === 'RUNNING' ? result.jobId : null
  useEffect(() => {
    if (!jobId) return
    let alive = true
    const timer = window.setInterval(() => {
      getSchoolInfoImport(jobId)
        .then((next) => alive && setResult(next))
        .catch((e) => alive && setError(e instanceof Error ? e.message : '진행 상황을 읽지 못했어요.'))
    }, 1500)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [jobId])

  const submit = async () => {
    if (!name.trim()) {
      inputRef.current?.focus()
      return
    }
    setPending(true)
    setError(null)
    try {
      const r = await importFromSchoolInfo({ schoolId, schoolName: name.trim(), academicYear, semester, defaultGrade: grade })
      setResult(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했어요.')
    } finally {
      setPending(false)
    }
  }

  const imported = result?.files.filter((f) => !f.skipped && f.planId) ?? []
  const running = result?.state === 'RUNNING'
  const percent = result && result.total > 0 ? Math.round((result.done / result.total) * 100) : 0
  // 같은 파일이 여러 학년으로 등록되면 한 줄로 묶는다 ('1·2·3학년 · 과목 12개')
  type FileRow = SchoolInfoImportResult['files'][number]
  const groups = new Map<string, FileRow[]>()
  for (const f of result?.files ?? []) groups.set(f.fileName, [...(groups.get(f.fileName) ?? []), f])
  const groupLine = (rows: FileRow[]) => {
    const first = rows[0]
    if (first.skipped) return `건너뜀 (${first.message})`
    const grades = rows.filter((f) => f.grade !== null).map((f) => f.grade).join('·')
    const prefix = grades ? `${grades}학년 · ` : ''
    if (rows.some((f) => !f.planId)) return `${prefix}등록 실패 (${rows.find((f) => !f.planId)?.message})`
    if (rows.some((f) => f.analysisStatus === 'ANALYZING')) return `${prefix}분석 중…`
    if (rows.some((f) => f.analysisStatus === 'QUEUED')) return `${prefix}분석 대기`
    const read = rows.find((f) => f.analysisStatus === 'REVIEW_REQUIRED' || f.analysisStatus === 'PARTIAL')
    if (read) return `${prefix}과목 ${read.subjects ?? 0}개 읽음`
    const failed = rows.find((f) => f.analysisStatus === 'FAILED' && f.message)
    if (failed) return `${prefix}분석 실패 (${failed.message})`
    return `${prefix}평가 정보를 찾지 못함`
  }
  const groupState = (rows: FileRow[]) => rows.some((f) => f.analysisStatus === 'ANALYZING') ? 'ANALYZING'
    : rows.some((f) => f.analysisStatus === 'QUEUED') ? 'QUEUED' : rows[0].skipped ? 'SKIPPED' : 'DONE'

  return (
    <Modal
      wide
      title="학교알리미에서 불러오기"
      initialFocusRef={inputRef}
      onRequestClose={() => !pending && !running && (result ? onDone(result) : onClose())}
      footer={
        result ? (
          <button type="button" className={review.buttonPrimary} onClick={() => onDone(result)} disabled={running} data-testid="schoolinfo-done">
            {running ? '분석 중…' : '확인'}
          </button>
        ) : (
          <>
            <button type="button" className={review.buttonGhost} onClick={onClose} disabled={pending}>
              취소
            </button>
            <button type="button" className={review.buttonPrimary} onClick={submit} disabled={pending} aria-busy={pending} data-testid="schoolinfo-submit">
              {pending ? '학교알리미에서 받는 중…' : '불러오기'}
            </button>
          </>
        )
      }
    >
      <div className={review.dialogBody} data-testid="schoolinfo-dialog">
        {!result && (
          <div className={review.formStack}>
            <p className={review.muted}>학교알리미에 공시된 교과별 평가계획서를 받아 학년별 문서로 등록하고, 서버 안에서 지필·수행 비율과 수행평가 항목·채점 기준을 읽어 둡니다(원문을 외부 분석기로 보내지 않아요). 분석 결과는 후보예요 — &lsquo;분석&rsquo; 탭에서 검토·확정해야 학생에게 보여요.</p>
            <label className={review.formRow}>
              <span>학교 이름</span>
              <input ref={inputRef} className={review.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 신원고등학교" data-testid="schoolinfo-name" />
            </label>
            <label className={review.formRow}>
                <span>학기</span>
                <select className={review.select} value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                  <option value={1}>1학기</option>
                  <option value={2}>2학기</option>
                </select>
              </label>
              <label className={review.formRow}>
                <span>학년 없는 파일</span>
                <select className={review.select} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                  {[1, 2, 3].map((g) => <option key={g} value={g}>{g}학년으로 등록</option>)}
                </select>
              </label>
            {error && <p role="alert" className={review.deleteError} data-testid="schoolinfo-error">{error}</p>}
          </div>
        )}
        {result && (
          <div data-testid="schoolinfo-result" data-state={result.state}>
            <p>
              {result.schoolName ?? name} — 파일 {groups.size}개 · 학년별 문서 {imported.length}개 등록 · 분석 {result.done}/{result.total}
              {running ? ' (서버가 차례로 분석하는 중)' : ' 완료'}
            </p>
            <div
              role="progressbar"
              aria-label="분석 진행"
              aria-valuemin={0}
              aria-valuemax={result.total}
              aria-valuenow={result.done}
              data-testid="schoolinfo-progress"
              style={{ height: 8, borderRadius: 4, background: 'var(--as-color-surface-muted, #f2f4f6)', overflow: 'hidden', margin: '8px 0 12px' }}
            >
              <div style={{ width: `${percent}%`, height: '100%', background: 'var(--as-color-primary, #3182f6)', transition: 'width 0.4s' }} />
            </div>
            <ul style={{ maxHeight: 320, overflowY: 'auto', margin: 0, paddingLeft: 18 }} data-testid="schoolinfo-files">
              {[...groups.entries()].map(([fileName, rows]) => (
                <li key={fileName} data-status={groupState(rows)}>
                  {fileName} — {groupLine(rows)}
                </li>
              ))}
            </ul>
            {error && <p role="alert" className={review.deleteError}>{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
