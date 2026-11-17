import type { ReactNode } from 'react'
import { AlertIcon, InfoIcon } from '../components/canonicalUi.ts'
import styles from './ai.module.css'
import type { AiField, EvidenceCheck } from './aiApi.ts'
import type { AiRunState, ProviderState } from './useAiRun.ts'

// AI 분석 화면 공통 조각 (요청 ⑨). 미연결·실패를 성공처럼 보이지 않게 상태를 글자로 분명히 적는다.

export function ProviderBanner({ provider, onRetry }: { provider: ProviderState; onRetry: () => void }) {
  if (provider.kind === 'loading') return <p className={styles.banner}>AI 연결 상태를 확인하는 중…</p>
  if (provider.kind === 'error') {
    return (
      <p className={styles.banner} data-tone="danger" role="alert" data-testid="ai-provider-state">
        <AlertIcon size={14} /> 미연결 · {provider.error.message} ({provider.error.code})
        <button type="button" className={styles.linkButton} onClick={onRetry}>
          다시 확인
        </button>
      </p>
    )
  }
  const { status } = provider
  if (!status.configured) {
    return (
      <p className={styles.banner} data-tone="warning" data-testid="ai-provider-state">
        <AlertIcon size={14} /> 미연결 · 서버에 AI Provider가 설정되지 않았어요 (assessment.ai.provider, API Key). 분석을 요청하면 실패로 표시돼요. 결과를 만들어 보여주지 않아요.
      </p>
    )
  }
  return (
    <p className={styles.banner} data-tone="ok" data-testid="ai-provider-state">
      <InfoIcon size={14} /> 연결됨 · {status.provider} {status.model ?? ''} · OCR {status.ocrSupported ? '지원' : '미지원(이미지형 PDF 분석 불가)'} · AI 결과는 관리자 검토 전 공개되지 않아요
    </p>
  )
}

const stateLabel: Record<AiRunState<unknown>['kind'], string> = {
  idle: '분석 전',
  running: '분석 요청 처리 중',
  review: '분석 완료 · 관리자 검토 필요',
  confirmed: '관리자 확인 완료',
  failed: '분석 실패',
}

export function RunStatus<T>({ state, onRetry }: { state: AiRunState<T>; onRetry?: () => void }) {
  return (
    <div className={styles.runStatus} data-state={state.kind} role="status" aria-live="polite" data-testid="ai-run-state">
      <span className={styles.stateDot} aria-hidden="true" />
      <strong>{stateLabel[state.kind]}</strong>
      {state.kind === 'running' && <span className={styles.muted}>서버에서 텍스트 추출과 AI 분석을 한 번에 처리해요. 수십 초 이상 걸릴 수 있어요.</span>}
      {state.kind === 'failed' && (
        <>
          <span className={styles.muted}>
            {state.error.message} ({state.error.code})
          </span>
          {onRetry && (
            <button type="button" className={styles.linkButton} onClick={onRetry}>
              다시 분석
            </button>
          )}
        </>
      )}
      {(state.kind === 'review' || state.kind === 'confirmed') && (
        <span className={styles.muted}>
          {state.analysis.provider} {state.analysis.model ?? ''} · 원본 SHA-256 {state.analysis.source.sha256.slice(0, 12)}…
          {state.analysis.source.pageCount > 0 ? ` · ${state.analysis.source.pageCount}쪽(글자 있는 쪽 ${state.analysis.source.textPageCount})` : ` · ${state.analysis.source.characterCount.toLocaleString()}자`}
        </span>
      )}
    </div>
  )
}

export function Warnings({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className={styles.warnings} aria-label="검토 경고">
      {items.map((item) => (
        <li key={item}>
          <AlertIcon size={13} /> {item}
        </li>
      ))}
    </ul>
  )
}

/** 값 하나 + 근거(쪽·대조 결과). 원문에 없으면 "원문에 없음"으로 두고 0이나 빈 값으로 바꾸지 않는다 */
export function FieldRow({
  label,
  field,
  check,
  edited,
  onEdit,
  onShowPage,
  readOnly,
}: {
  label: string
  field: AiField
  check: EvidenceCheck | undefined
  edited: string | undefined
  onEdit: (value: string) => void
  onShowPage: (page: number) => void
  readOnly: boolean
}) {
  const value = edited ?? field.value
  return (
    <div className={styles.fieldRow}>
      <span className={styles.fieldLabel}>{label}</span>
      {field.found || edited !== undefined ? (
        <input className={styles.fieldInput} value={value} aria-label={`${label} 값`} readOnly={readOnly} onChange={(event) => onEdit(event.target.value)} />
      ) : (
        <span className={styles.notFound}>
          원문에 없음
          {!readOnly && (
            <button type="button" className={styles.linkButton} onClick={() => onEdit('')}>
              직접 입력
            </button>
          )}
        </span>
      )}
      <span className={styles.evidence}>
        {field.found && field.pdfPage > 0 && (
          <button type="button" className={styles.pageButton} onClick={() => onShowPage(field.pdfPage)} title={field.evidenceQuote || undefined}>
            PDF p.{field.pdfPage}
            {field.printedPage ? ` (인쇄 ${field.printedPage}쪽)` : ''}
          </button>
        )}
        {check && <EvidenceBadge check={check} />}
        {edited !== undefined && <span className={styles.editedTag}>관리자 수정</span>}
      </span>
    </div>
  )
}

export function EvidenceBadge({ check }: { check: EvidenceCheck }) {
  return (
    <span className={styles.badge} data-tone={check.verified ? 'ok' : 'warning'} title={check.reason ?? undefined}>
      {check.verified ? '근거 확인' : '근거 확인 필요'}
    </span>
  )
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}
