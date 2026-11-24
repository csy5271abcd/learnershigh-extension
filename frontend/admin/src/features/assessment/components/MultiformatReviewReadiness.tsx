import styles from '../styles/assessmentAdmin.module.css'

// HWP·HWPX 검토 확정 준비 상태 (점검표, Phase B 2026-11-11 갱신).
// 원문 대조는 관리자가 외부 한글 프로그램에서 하는 수동 확인이며, 이 화면이 자동으로 검증하지 않는다(명시적 확인 체크만 기록).
// 운영 인증 조건은 서버가 확정 요청 때 판단한다(실제 인증 없으면 거절).

type ReadinessState = 'met' | 'unmet' | 'blocked' | 'server'

interface ReadinessInput {
  documentFormat: 'HWP' | 'HWPX'
  fileSelected: boolean
  hashMatches: boolean
  subjectIdEntered: boolean
  fieldsChecked: number
  fieldsWithLocator: number
  analysisId: string | null
  attested: boolean
}

const label: Record<ReadinessState, string> = {
  met: '충족',
  unmet: '아직',
  blocked: '운영 인증 대기',
  server: '서버 확인',
}

function readinessItems(input: ReadinessInput): { key: string; text: string; state: ReadinessState; note?: string }[] {
  const allLocated = input.fieldsChecked > 0 && input.fieldsWithLocator === input.fieldsChecked
  return [
    { key: 'source', text: '검토할 원본 파일 확보(관리자 PC)', state: input.fileSelected ? 'met' : 'unmet' },
    { key: 'hash', text: '원본 SHA-256 = 서버 저장값', state: input.hashMatches ? 'met' : 'unmet' },
    { key: 'subject', text: '학업 과목 ID 연결(서버가 문서 슬롯 과목인지 확인)', state: input.subjectIdEntered ? 'met' : 'unmet' },
    { key: 'fields', text: '검토할 평가 항목 선택', state: input.fieldsChecked > 0 ? 'met' : 'unmet', note: input.fieldsChecked ? `${input.fieldsChecked}개` : undefined },
    { key: 'locator', text: '선택한 값마다 분석기가 기록한 문서 위치 있음', state: allLocated ? 'met' : 'unmet', note: input.fieldsChecked ? `${input.fieldsWithLocator}/${input.fieldsChecked}` : undefined },
    { key: 'manual', text: `관리자가 한글 프로그램에서 그 위치의 원문을 직접 대조`, state: input.attested ? 'met' : 'unmet', note: '화면이 자동 검증하지 않음 — 아래 확인 체크로 기록' },
    { key: 'attest', text: '관리자의 명시적 확인 행동', state: input.attested ? 'met' : 'unmet' },
    { key: 'store', text: '확정값의 근거 위치 저장', state: 'server', note: '필드별 구조 위치·과목 번호·원본 SHA를 함께 저장(D-1)' },
    { key: 'verified', text: '실제 관리자 인증(운영 확정 조건)', state: 'blocked', note: '미연결 — 인증이 연결되기 전에는 서버가 확정을 거절해요' },
    { key: 'analysis', text: '검토에 쓴 analysisId 보존', state: input.analysisId ? 'met' : 'unmet' },
    { key: 'auth', text: '검토 권한(평가계획서 운영 권한)', state: 'server', note: '확정 요청 때 서버가 확인' },
  ]
}

export function MultiformatReviewReadiness(props: ReadinessInput) {
  const items = readinessItems(props)
  return (
    <section className={styles.box} style={{ marginTop: 10 }} aria-label={`${props.documentFormat} 확정 준비 상태`} data-testid="multiformat-readiness">
      <span className={styles.label}>{props.documentFormat} 확정 준비 상태</span>
      <ul className={styles.listPlain}>
        {items.map((item) => (
          <li key={item.key} className={styles.listRow} style={{ justifyContent: 'flex-start', gap: 8 }} data-testid="readiness-item" data-key={item.key} data-state={item.state}>
            <span className={styles.badge} data-tone={item.state === 'met' ? 'success' : item.state === 'blocked' ? 'warning' : undefined}>
              {label[item.state]}
            </span>
            <span style={{ textAlign: 'left' }}>
              {item.text}
              {item.note && <span className={styles.cellSub}> · {item.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
