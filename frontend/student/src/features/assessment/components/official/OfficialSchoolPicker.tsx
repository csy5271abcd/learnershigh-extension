import { useEffect, useState } from 'react'
import { clearOfficialViewHttp, getOfficialViewHttp, selectOfficialViewHttp } from '../../api/http/evaluationPlansHttp.ts'
import { isAdminReadOnlyHttpView } from '../../api/http/assessmentHttpClient.ts'
import type { StudentOfficialEnsure, StudentOfficialView } from '../../api/types.ts'
import { restartOfficialEnsure } from '../../model/useOfficialEnsure.ts'
import { Modal } from '../Modal.tsx'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './OfficialSchoolPicker.module.css'

// A27-UX 부록 O §38-16: 학적 학교에 같은 이름 학교가 여럿이고 선생님이 아직 학교를 확인하지 않았으면,
// 학생이 지역·주소를 골라 그 학교의 '공식 공개 평가계획서 원본'만 볼 수 있다.
// - 학적(학교·학년도·학년·학기)·선생님 매핑·확정된 평가 정보는 바뀌지 않는다(서버가 보장).
// - 후보는 서버가 검증한 것만, 학교알리미 ID 는 받지 않는다. 바꾸기·철회 가능.
// - 관리자 '학생 화면 보기'(읽기 전용)에서는 고르기 버튼을 보이지 않는다.

const UNSELECTABLE: Record<string, string> = {
  ADDRESS_MISSING: '주소가 없어 고를 수 없어요',
  ADDRESS_DUPLICATE: '같은 주소 학교가 있어 고를 수 없어요',
}

export function OfficialSchoolPicker({ ensure }: { ensure: StudentOfficialEnsure | null }) {
  const [open, setOpen] = useState(false)
  const needed = ensure?.state === 'SCHOOL_CONFIRMATION_REQUIRED' || ensure?.viewSelected === true
  if (!needed || isAdminReadOnlyHttpView()) return null
  return (
    <>
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)} data-testid="official-school-picker-open">
        {ensure?.viewSelected ? '고른 학교 바꾸기' : '지역·주소로 우리 학교 고르기'}
      </button>
      {open && <PickerModal onClose={() => setOpen(false)} />}
    </>
  )
}

function PickerModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<StudentOfficialView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer = 0
    const load = () =>
      getOfficialViewHttp().then(
        (value) => {
          if (cancelled) return
          setView(value)
          setError(null)
          // 후보를 확인하는 중이면 잠시 뒤 다시 읽는다
          if (value.state === 'RUNNING') timer = window.setTimeout(load, 2000)
        },
        (cause: Error) => {
          if (!cancelled) setError(cause.message)
        },
      )
    void load()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [attempt])

  const apply = (action: () => Promise<StudentOfficialView>) => {
    setPending(true)
    setError(null)
    action().then(
      (value) => {
        setPending(false)
        setView(value)
        restartOfficialEnsure()
        onClose()
      },
      (cause: Error) => {
        setPending(false)
        setError(cause.message)
        setAttempt((value) => value + 1)
      },
    )
  }

  const version = view?.selection?.version ?? 0
  const selectable = (view?.candidates ?? []).filter((candidate) => candidate.selectable)

  return (
    <Modal
      title="우리 학교 고르기"
      description="같은 이름의 학교가 있어요. 지역과 주소를 보고 우리 학교를 고르면 그 학교의 공식 평가계획서 원본을 볼 수 있어요."
      onRequestClose={onClose}
      footer={
        <>
          {view?.selection && (
            <button type="button" className={formStyles.ghostButton} disabled={pending} onClick={() => apply(() => clearOfficialViewHttp(version))} data-testid="official-school-picker-clear">
              고른 학교 지우기
            </button>
          )}
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={pending}>
            취소
          </button>
          <button
            type="button"
            className={formStyles.primaryButton}
            disabled={!chosen || pending}
            aria-busy={pending}
            onClick={() => chosen && apply(() => selectOfficialViewHttp(chosen, version))}
            data-testid="official-school-picker-confirm"
          >
            {pending ? '저장하는 중…' : '이 학교 평가계획서 보기'}
          </button>
        </>
      }
    >
      <div data-testid="official-school-picker">
        <p className={styles.note}>
          고른 학교는 선생님이 확인하기 전까지 &lsquo;학생이 고른 학교&rsquo;로 표시돼요. 내 학적(학교·학년·학기)과 선생님이 확정한 평가 정보는 바뀌지 않아요.
        </p>
        {error && (
          <p className={formStyles.formError} role="alert" data-testid="official-school-picker-error">
            {error}
          </p>
        )}
        {!view && !error && <p className={styles.note}>학교 목록을 불러오는 중이에요…</p>}
        {view?.state === 'RUNNING' && <p className={styles.note}>학교알리미에서 같은 이름 학교를 확인하고 있어요…</p>}
        {view && (view.state === 'ADMIN_CONFIRMED' || view.state === 'NOT_REQUIRED') && (
          <p className={styles.note}>선생님이 이미 학교를 확인했거나 같은 이름 학교가 없어요. 고를 필요가 없어요.</p>
        )}
        {view && view.message && view.state === 'UNAVAILABLE' && <p className={formStyles.formError}>{view.message}</p>}
        {view?.selection && (
          <p className={styles.current} data-testid="official-school-picker-current">
            지금 고른 학교: {view.selection.schoolName} · {[view.selection.sido, view.selection.sigungu].filter(Boolean).join(' ')} · {view.selection.address}
          </p>
        )}
        {view && view.candidates.length > 0 && (
          <fieldset className={styles.list}>
            <legend className={styles.legend}>{view.schoolName ?? '학교'} 후보</legend>
            {view.candidates.map((candidate) => (
              <label key={candidate.candidateId} className={styles.option} data-disabled={!candidate.selectable || undefined} data-testid="official-school-picker-option">
                <input
                  type="radio"
                  name="official-school"
                  value={candidate.candidateId}
                  disabled={!candidate.selectable || pending}
                  checked={chosen === candidate.candidateId}
                  onChange={() => setChosen(candidate.candidateId)}
                />
                <span className={styles.optionText}>
                  <strong>{[candidate.sido, candidate.sigungu].filter(Boolean).join(' ') || '지역 정보 없음'}</strong>
                  <span>
                    {candidate.schoolName} · {candidate.address ?? '주소 없음'}
                  </span>
                  {!candidate.selectable && <span className={styles.disabledReason}>{UNSELECTABLE[candidate.unselectableReason ?? ''] ?? '고를 수 없어요'}</span>}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {view && view.state === 'SELECT_REQUIRED' && selectable.length === 0 && <p className={styles.note}>고를 수 있는 학교가 없어요.</p>}
      </div>
    </Modal>
  )
}
