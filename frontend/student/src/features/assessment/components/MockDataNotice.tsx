import { mockRuntimeInfo } from '../api/runtimeInfo.ts'
import { InfoIcon } from './AssessmentIcons.tsx'
import styles from './MockDataNotice.module.css'

// Mock 모드에서 항상 보이는 "서버에 저장되지 않음" 표시 (assessment-frontend-mock.md §8).
export function MockDataNotice() {
  const info = mockRuntimeInfo()
  if (!info) return null
  return (
    <p className={styles.notice}>
      <InfoIcon size={14} />
      <span>
        시연용 샘플 데이터예요. 일정과 배점은 실제 학교 정보가 아니고, 변경 내용은 서버에 저장되지 않아요.
        <span className={styles.meta}>
          {' '}
          (기준일 {info.asOfDate}
          {info.scenario ? ` · 시나리오: ${info.scenario}` : ''})
        </span>
      </span>
    </p>
  )
}
