import type { ReactNode } from 'react'
import { goBack, navigate } from '../../../app/adminLocation.ts'
import { activeScenarioLabel, adminDevAuthLabel, isAdminMockDataSource, mockAsOfDate } from '../api/assessmentAdminApi.ts'
import type { PublishState } from '../api/types.ts'
import { publishLabels, statusLabels } from '../model/adminFormat.ts'
import type { Remote } from '../model/useRemote.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { ChevronLeftIcon, EmptyState, ErrorState, EyeIcon, InfoIcon, LoadingRows, SearchIcon } from './canonicalUi.ts'

/** Mock 모드에서 항상 보이는 "서버 저장 아님" 표시 (assessment-frontend-mock.md §8) */
export function MockNotice() {
  if (!isAdminMockDataSource) {
    // http 개발 서버: 데이터는 실제 Backend에 저장되지만 인증·학교·학생·학업 정보 원천은 개발용 Mock이다. Production에는 표시하지 않는다.
    const auth = import.meta.env.DEV ? adminDevAuthLabel() : null
    return auth ? (
      <p className={styles.mockNotice} data-testid="dev-http-notice" title="실제 관리자 인증·지점 권한·학교·학생 정보 연동 전이에요 (API-OD-A01).">
        <InfoIcon size={13} />
        개발 서버 · 실제 Backend 저장 · {auth} · 학교·학생·학업 정보는 개발용 Mock
      </p>
    ) : null
  }
  const scenario = activeScenarioLabel()
  return (
    <p className={styles.mockNotice} title={`학생 기록과 콘텐츠는 Student 앱과 같은 원본에서 시작하지만 변경 내용은 서버에 저장되지 않고 새로고침하면 처음으로 돌아가요. (기준일 ${mockAsOfDate})`}>
      <InfoIcon size={13} />
      시연 데이터 · 서버 저장 안 됨 (기준일 {mockAsOfDate}
      {scenario ? ` · ${scenario}` : ''})
    </p>
  )
}

/** 조회 상태별 화면. Loading / Error는 같은 모양, Success만 호출 측이 그린다 */
export function RemoteView<T>({ state, label, onRetry, children }: { state: Remote<T>; label: string; onRetry: () => void; children: (data: T) => ReactNode }) {
  if (state.status === 'loading') return <LoadingRows label={`${label} 불러오는 중`} />
  if (state.status === 'error') {
    if (state.error.status === 403) return <EmptyState title="볼 수 있는 권한이 없어요" description={`${state.error.message} (${state.error.code})`} />
    if (state.error.status === 404) return <EmptyState title="찾을 수 없어요" description={`${state.error.message} (${state.error.code})`} />
    return <ErrorState title={`${label}을(를) 불러오지 못했어요`} error={state.error} onRetry={onRetry} />
  }
  return <>{children(state.data)}</>
}

export function DetailHead({ trail, title, backTo, children }: { trail: string; title: string; backTo?: string; children?: ReactNode }) {
  return (
    <div className={styles.detailHead}>
      <button
        type="button"
        className={styles.backButton}
        aria-label="뒤로"
        onClick={() => {
          if (backTo) navigate(backTo)
          else goBack()
        }}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <div className={styles.detailHeadText}>
        <p className={styles.breadcrumb}>{trail}</p>
        <h2 className={styles.detailTitle}>{title}</h2>
      </div>
      {children && <div className={styles.detailHeadEnd}>{children}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.badge}>
      <span className={styles.dot} data-status={status} aria-hidden="true" />
      {statusLabels[status] ?? status}
    </span>
  )
}

export function PublishBadge({ state }: { state: PublishState }) {
  return (
    <span className={styles.badge} data-tone={state === 'PUBLISHED' ? 'success' : undefined}>
      {publishLabels[state]}
    </span>
  )
}

export function ReadOnlyMark() {
  return (
    <span className={styles.readOnly}>
      <EyeIcon size={14} /> 읽기 전용
    </span>
  )
}

export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return (
    <label className={styles.search}>
      <SearchIcon size={16} />
      <input type="search" value={value} placeholder={placeholder} aria-label={label} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

/** Filter·검색 결과가 비었을 때와 데이터 자체가 없을 때를 구분한다 (frontend-admin §16) */
export function ListEmpty({ filtered, title, onReset }: { filtered: boolean; title: string; onReset?: () => void }) {
  return filtered ? (
    <EmptyState
      title="조건에 맞는 항목이 없어요"
      description="검색어나 필터를 바꿔 보세요."
      action={
        onReset && (
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            조건 초기화
          </button>
        )
      }
    />
  ) : (
    <EmptyState title={title} />
  )
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className={styles.fieldError} role="alert">
      {message}
    </p>
  ) : null
}
