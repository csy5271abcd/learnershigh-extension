import { useState } from 'react'
import { SchoolInfoClassifyModal } from './SchoolInfoClassifyModal.tsx'
import { SchoolInfoSchoolSelectModal } from './SchoolInfoSchoolSelectModal.tsx'
import { coverageLabel, needsAttention, reasonLabel, yearStatusLabel } from '../model/schoolInfoSync.ts'
import type { SchoolInfoSyncState } from '../model/useSchoolInfoSync.ts'
import review from '../review/review.module.css'
import slots from './planSlots.module.css'

// §38-12 학교알리미 최근 3개 학년도 자동 확인 요약 (A27-UX 부록 E). 상태는 model/useSchoolInfoSync.ts.

/** 평가계획서 탭 상단 한 줄 요약: 학년도별 상태 · 18개 구간 중 등록 수 · 분류 확인 필요 원본 · 다시 확인. */
export function SchoolInfoSyncSummary({ sync, schoolId, onChanged }: { sync: SchoolInfoSyncState; schoolId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const { result, error, pending } = sync
  const running = pending || result?.state === 'RUNNING'
  const unresolved = result?.unresolvedFiles ?? []
  const selection = result?.schoolSelection?.required ? result.schoolSelection : null
  const reviewable = unresolved.some((f) => f.group === 'CLASSIFICATION' || f.group === 'SOURCE_VERIFICATION') || (result?.counts.slotLinks ?? 0) > 0
  return (
    <section className={slots.syncBar} aria-live="polite" data-testid="schoolinfo-sync" data-state={result?.state ?? (error ? 'ERROR' : 'PENDING')}>
      <div className={slots.syncLine}>
        <strong className={slots.syncTitle}>최근 3개 학년도 원본 자동 확인</strong>
        {result ? (
          <ul className={slots.syncYears}>
            {result.yearStatuses.map((year) => (
              <li
                key={year.academicYear}
                className={slots.syncYear}
                data-attention={needsAttention(year.status) || undefined}
                data-status={year.status}
                data-testid={`schoolinfo-sync-year-${year.academicYear}`}
                title={year.message ?? undefined}
              >
                {year.academicYear}: {yearStatusLabel(year.status)}
              </li>
            ))}
          </ul>
        ) : (
          <span className={review.muted}>{error ? '' : '학교알리미를 확인하는 중이에요…'}</span>
        )}
        {result && (
          <span className={slots.syncCoverage} data-testid="schoolinfo-sync-coverage">
            {coverageLabel(result)}
          </span>
        )}
        <span className={slots.syncActions}>
          {reviewable && (
            <button type="button" className={slots.textButton} onClick={() => setClassifying(true)} data-testid="schoolinfo-classify-open">
              원본 분류
            </button>
          )}
          {unresolved.length > 0 && (
            <button type="button" className={slots.textButton} aria-expanded={open} aria-controls="schoolinfo-sync-unresolved" onClick={() => setOpen((value) => !value)} data-testid="schoolinfo-sync-unresolved-toggle">
              분류 확인 필요 {unresolved.length}개
            </button>
          )}
          <button type="button" className={review.button} onClick={() => sync.retry(true)} disabled={running} data-testid="schoolinfo-sync-retry" title={running ? '확인이 끝나면 다시 확인할 수 있어요' : '확인 실패·기한이 지난 학년도만 다시 받아요'}>
            {running ? '확인 중…' : '다시 확인'}
          </button>
        </span>
      </div>
      {selection && (
        <p className={slots.syncLine} data-testid="schoolinfo-sync-selection">
          <span className={slots.syncYear} data-attention>
            {selection.reason === 'MAPPING_CHANGED' ? '고른 학교의 정보가 바뀌어 다시 골라야 해요' : selection.reason === 'TOO_MANY_CANDIDATES' ? '같은 이름의 학교가 너무 많아요 — 직접 등록해 주세요' : '같은 이름의 학교가 여러 곳 검색됐어요'}
          </span>
          {selection.candidates.length > 0 && (
            <button type="button" className={review.button} onClick={() => setSelecting(true)} disabled={running} data-testid="schoolinfo-select-open">
              학교 선택
            </button>
          )}
        </p>
      )}
      {result?.schoolSelection?.selected && !selection && (
        <p className={slots.historyMeta} data-testid="schoolinfo-sync-selected">
          학교알리미 학교: {result.schoolSelection.selected.schoolName} · {result.schoolSelection.selected.address ?? '주소 확인 안 됨'}
        </p>
      )}
      {error && (
        <p className={slots.syncError} role="alert" data-testid="schoolinfo-sync-error">
          학교알리미 자동 확인을 하지 못했어요. {error}
        </p>
      )}
      {open && unresolved.length > 0 && (
        <ul id="schoolinfo-sync-unresolved" className={slots.syncUnresolved} data-testid="schoolinfo-sync-unresolved">
          {unresolved.map((file, index) => (
            <li key={`${file.academicYear}-${file.sha256 ?? file.fileName}-${index}`}>
              <span className={slots.docName} title={file.fileName}>
                {file.fileName}
              </span>
              <span className={slots.historyMeta}>
                {file.academicYear}학년도 요청 · {yearStatusLabel(file.status) === file.status ? reasonLabel(file.status) : yearStatusLabel(file.status)}
                {file.reason ? ` · ${reasonLabel(file.reason)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      {selecting && selection && result && (
        <SchoolInfoSchoolSelectModal
          schoolId={schoolId}
          jobId={result.jobId}
          selection={selection}
          onClose={() => setSelecting(false)}
          onSelected={() => {
            setSelecting(false)
            sync.retry()
          }}
        />
      )}
      {classifying && (
        <SchoolInfoClassifyModal
          schoolId={schoolId}
          onClose={() => {
            setClassifying(false)
            sync.retry()
          }}
          onChanged={onChanged}
        />
      )}
    </section>
  )
}
