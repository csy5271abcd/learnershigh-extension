import { useMemo, useRef, useState } from 'react'
import { selectSchoolInfoSchool } from '../api/assessmentAdminApi.ts'
import type { SchoolInfoSchoolSelection } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import { reasonLabel } from '../model/schoolInfoSync.ts'
import review from '../review/review.module.css'
import slots from './planSlots.module.css'

// §38-13 (A27-UX 부록 F): 같은 이름의 학교가 여러 곳이면 지역·주소를 보고 하나를 고른다.
// 후보·지역은 서버가 학교알리미 학교 상세에서 읽은 값만 쓴다(지역 목록을 따로 두지 않음). 닫으면 자동 수집은 멈춘 채 그대로다.

export function SchoolInfoSchoolSelectModal({
  schoolId,
  jobId,
  selection,
  onClose,
  onSelected,
}: {
  schoolId: string
  jobId: string
  selection: SchoolInfoSchoolSelection
  onClose: () => void
  onSelected: () => void
}) {
  const regions = useMemo(
    () => Array.from(new Set(selection.candidates.map((c) => c.sido).filter((v): v is string => Boolean(v)))).sort(),
    [selection.candidates],
  )
  const [region, setRegion] = useState('')
  const [chosen, setChosen] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const visible = selection.candidates.filter((c) => !region || c.sido === region)
  const picked = selection.candidates.find((c) => c.candidateId === chosen && c.selectable) ?? null
  const anySelectable = selection.candidates.some((c) => c.selectable)

  const submit = () => {
    if (!picked) return
    setPending(true)
    setError(null)
    selectSchoolInfoSchool({ schoolId, jobId, candidateId: picked.candidateId, expectedVersion: selection.mappingVersion }).then(
      () => {
        setPending(false)
        onSelected()
      },
      (cause: unknown) => {
        setPending(false)
        setError(cause instanceof Error ? cause.message : '학교를 고르지 못했어요.')
      },
    )
  }

  return (
    <Modal
      wide
      title="학교 선택"
      initialFocusRef={selectRef}
      onRequestClose={() => !pending && onClose()}
      footer={
        <>
          <button type="button" className={review.buttonGhost} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button type="button" className={review.buttonPrimary} onClick={submit} disabled={!picked || pending} aria-busy={pending} data-testid="schoolinfo-select-confirm">
            {pending ? '확인 중…' : '이 학교로 확인'}
          </button>
        </>
      }
    >
      <div className={review.dialogBody} data-testid="schoolinfo-select-dialog">
        <div className={slots.modalStack}>
        <p className={review.muted}>
          학교알리미에 이름이 같은 학교가 {selection.candidates.length}곳 있어요.
          {selection.reason === 'MAPPING_CHANGED' ? ' 이전에 고른 학교의 이름·주소가 학교알리미에서 바뀌어 다시 골라야 해요.' : ''}
        </p>
        <label className={slots.selectField}>
          <span>지역(시·도)</span>
          <select ref={selectRef} className={review.select} value={region} onChange={(e) => setRegion(e.target.value)} data-testid="schoolinfo-select-region">
            <option value="">전체 {selection.candidates.length}곳</option>
            {regions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <ul className={slots.candidateList} role="radiogroup" aria-label="학교 후보" data-testid="schoolinfo-select-candidates">
          {visible.map((c) => (
            <li key={c.candidateId}>
              <label className={slots.candidate} data-disabled={!c.selectable || undefined}>
                <input
                  type="radio"
                  name="schoolinfo-candidate"
                  value={c.candidateId}
                  checked={chosen === c.candidateId}
                  disabled={!c.selectable}
                  onChange={() => setChosen(c.candidateId)}
                />
                <span className={slots.candidateText}>
                  <strong>{c.schoolName}</strong>
                  <span className={slots.historyMeta}>
                    {[c.sido, c.sigungu].filter(Boolean).join(' ') || '지역 확인 안 됨'} · {c.address ?? '주소 확인 안 됨'}
                  </span>
                  {!c.selectable && c.unselectableReason && <span className={slots.syncError}>고를 수 없음: {reasonLabel(c.unselectableReason)}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
        {!anySelectable && (
          <p className={slots.syncError} role="status" data-testid="schoolinfo-select-none">
            후보를 구별할 주소가 없어 고를 수 없어요.
          </p>
        )}
        {picked && (
          <p className={review.muted} data-testid="schoolinfo-select-summary">
            선택: {picked.schoolName} · {picked.address}
          </p>
        )}
        {error && (
          <p className={slots.syncError} role="alert">
            {error}
          </p>
        )}
        </div>
      </div>
    </Modal>
  )
}
