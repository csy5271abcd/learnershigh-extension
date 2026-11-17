import { useRef, useState } from 'react'
import { importFromSchoolInfo } from '../api/assessmentAdminApi.ts'
import type { SchoolInfoImportResult } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import review from '../review/review.module.css'

/** 학교 이름으로 학교알리미 평가계획서를 불러온다: 공시 파일을 받아 학년별 문서로 등록하고 서버 분석까지 한 번에. */
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
  return (
    <Modal
      wide
      title="학교알리미에서 불러오기"
      initialFocusRef={inputRef}
      onRequestClose={() => !pending && (result ? onDone(result) : onClose())}
      footer={
        result ? (
          <button type="button" className={review.buttonPrimary} onClick={() => onDone(result)} data-testid="schoolinfo-done">
            확인
          </button>
        ) : (
          <>
            <button type="button" className={review.buttonGhost} onClick={onClose} disabled={pending}>
              취소
            </button>
            <button type="button" className={review.buttonPrimary} onClick={submit} disabled={pending} aria-busy={pending} data-testid="schoolinfo-submit">
              {pending ? '불러오는 중… (1~2분)' : '불러오기'}
            </button>
          </>
        )
      }
    >
      <div className={review.dialogBody} data-testid="schoolinfo-dialog">
        {!result && (
          <div className={review.formStack}>
            <p className={review.muted}>학교알리미에 공시된 교과별 평가계획서를 받아 학년별 문서로 등록하고, 지필·수행 비율과 수행평가 항목·채점 기준을 읽어 둡니다. 이어서 검토에서 확인해 주세요.</p>
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
          <div data-testid="schoolinfo-result">
            <p>{result.schoolName ?? name} — 문서 {imported.length}개를 등록하고 분석했어요.</p>
            <ul>
              {result.files.map((f) => (
                <li key={f.fileName}>
                  {f.fileName} — {f.skipped ? `건너뜀 (${f.message})` : f.planId ? `${f.grade}학년 · ${f.analysisStatus === 'REVIEW_REQUIRED' || f.analysisStatus === 'PARTIAL' ? `과목 ${f.subjects ?? 0}개 읽음` : '평가 정보를 찾지 못함'}` : `실패 (${f.message})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}
