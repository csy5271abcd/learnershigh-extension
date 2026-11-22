import { OfficialSchoolPicker } from './OfficialSchoolPicker.tsx'
import { OfficialViewerModal } from './OfficialViewerModal.tsx'
import { useState } from 'react'
import { downloadOfficialFile } from '../../api/evaluationPlansApi.ts'
import type { StudentOfficialEnsure, StudentOfficialPlan } from '../../api/types.ts'
import { FileIcon } from '../AssessmentIcons.tsx'
import styles from './OfficialDocuments.module.css'

// A27-UX 부록 K: 학교알리미 공식 공개 원본 목록(홈·학교 평가 정보·수행평가 상세 공용).
// - 서버가 학생 학교의 칸(학적 칸 또는 A28-01 학교 공개 칸: 학교·학년도·학년·학기)으로 고른 원본만 온다. 한 칸에 여러 원본이면 모두 보인다.
// - 열기·내려받기에도 그 칸의 학년을 보낸다 — 서버가 같은 칸 규칙으로 다시 계산해 그 안의 원본만 준다.
// - 열기(PDF)·내려받기는 서버 경로로만 받는다(그 칸 원본인지 서버가 다시 확인, 저장 위치는 모름).
// - 원본은 학교가 공개한 원문이다. 관리자 확정 전의 분석 결과·채점기준은 여기에도 다른 화면에도 보이지 않는다.

type Doc = StudentOfficialPlan['documents'][number]

function sizeLabel(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

function monthLabel(month: number | null | undefined): string | null {
  if (month === 4) return '4월 공시'
  if (month === 9) return '9월 공시'
  return null
}

export function OfficialDocumentList({ slot, compact = false, limit }: { slot: StudentOfficialPlan; compact?: boolean; /** A28-07: 처음 보일 개수(나머지는 '전체 보기') */ limit?: number }) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = limit !== undefined && slot.documents.length > limit
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A28-06: 앱 안 Viewer 로 연 문서(PDF·HWP·HWPX 공통)
  const [viewing, setViewing] = useState<Doc | null>(null)
  const run = async (key: string, action: () => Promise<void>) => {
    if (busy) return
    setBusy(key)
    setError(null)
    try {
      await action()
    } catch {
      setError('원본을 열지 못했어요. 잠시 뒤 다시 시도해 주세요.')
    } finally {
      setBusy(null)
    }
  }
  const save = (blob: Blob, name: string) => {
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = name
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
  }
  return (
    <>
      <ul className={compact ? styles.listCompact : styles.list} data-testid="official-documents">
        {slot.documents.map((doc: Doc, index) => (
          <li key={doc.sourceDocumentId} className={styles.row} data-testid="official-document" data-format={doc.documentFormat} hidden={collapsible && !expanded && index >= (limit ?? 0)}>
            <FileIcon size={compact ? 14 : 15} />
            <span className={styles.name} title={doc.fileName}>
              {doc.fileName}
            </span>
            <span className={styles.meta}>
              {[doc.documentFormat, doc.provider === 'SCHOOLINFO' ? '학교알리미' : null, monthLabel(doc.disclosureMonth), compact ? null : sizeLabel(doc.sizeBytes)].filter(Boolean).join(' · ')}
            </span>
            <span className={styles.actions}>
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                onClick={() => setViewing(doc)}
                title={doc.documentFormat === 'PDF' ? '앱 안에서 원본 보기' : '앱 안에서 미리보기용 PDF로 보기(원본 아님)'}
                data-testid="official-document-open"
              >
                원본 보기
              </button>
              <button
                type="button"
                className={styles.action}
                disabled={busy !== null}
                aria-busy={busy === `d${doc.sourceDocumentId}`}
                onClick={() =>
                  run(`d${doc.sourceDocumentId}`, async () => {
                    save(await downloadOfficialFile(slot.academicYear, slot.semester, doc.sourceDocumentId, slot.grade), doc.fileName)
                  })
                }
                data-testid="official-document-download"
              >
                내려받기
              </button>
            </span>
          </li>
        ))}
      </ul>
      {collapsible && (
        <button type="button" className={styles.more} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} data-testid="official-documents-more">
          {expanded ? '접기' : `전체 ${slot.documents.length}개 보기`}
        </button>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {viewing && (
        <OfficialViewerModal
          key={`${slot.academicYear}|${slot.semester}|${slot.grade}|${viewing.sourceDocumentId}`}
          slot={slot}
          doc={viewing}
          onClose={() => setViewing(null)}
          onDownload={() => {
            const doc = viewing
            void run(`d${doc.sourceDocumentId}`, async () => save(await downloadOfficialFile(slot.academicYear, slot.semester, doc.sourceDocumentId, slot.grade), doc.fileName))
          }}
        />
      )}
    </>
  )
}

/** 자동 확보 상태 한 줄. READY·null 이면 아무것도 그리지 않는다 */
export function OfficialEnsureNotice({ ensure }: { ensure: StudentOfficialEnsure | null }) {
  if (!ensure) return null
  if (ensure.state === 'READY') return <OfficialViewSelectedNotice ensure={ensure} />
  const text =
    ensure.state === 'RUNNING'
      ? '학교알리미에서 우리 학교 공식 평가계획서 원본을 확인하고 있어요…'
      : (ensure.message ??
        (ensure.state === 'SCHOOL_CONFIRMATION_REQUIRED'
          ? '같은 이름의 학교가 있어요. 지역·주소를 골라 우리 학교 평가계획서 원본을 볼 수 있어요(선생님 확인 전).'
          : ensure.state === 'NO_CONTEXT'
            ? '최근 3개 학년도 학적 정보가 없어요.'
            : '학교알리미에서 자료를 가져오지 못했어요. 잠시 뒤 다시 들어와 주세요.'))
  return (
    <div>
      <p className={ensure.state === 'RUNNING' ? styles.notice : styles.warn} role="status" data-testid="official-ensure-status" data-state={ensure.state}>
        {text}
      </p>
      {/* 부록 O §38-16: 같은 이름 학교 — 학생이 지역·주소로 열람 학교를 고른다(학적·선생님 확인과 별개) */}
      <OfficialSchoolPicker ensure={ensure} />
    </div>
  )
}

/** 부록 O: 학생이 고른 학교(선생님 확인 전)의 원본을 보고 있을 때의 표시 */
export function OfficialViewSelectedNotice({ ensure }: { ensure: StudentOfficialEnsure | null }) {
  if (!ensure?.viewSelected || ensure.state !== 'READY') return null
  return (
    <div>
      <p className={styles.notice} role="status" data-testid="official-view-selected">
        내가 고른 학교의 공식 평가계획서 원본이에요(선생님 확인 전). 선생님이 정리한 평가 정보는 확정된 것만 보여요.
      </p>
      <OfficialSchoolPicker ensure={ensure} />
    </div>
  )
}
