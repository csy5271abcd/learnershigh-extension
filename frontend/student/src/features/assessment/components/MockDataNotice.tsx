import { mockRuntimeInfo } from '../api/runtimeInfo.ts'
import { InfoIcon } from './AssessmentIcons.tsx'
import styles from './MockDataNotice.module.css'

// Mock 모드에서 항상 보이는 "서버에 저장되지 않음" 표시 (assessment-frontend-mock.md §8).
export function MockDataNotice() {
  const info = mockRuntimeInfo()
  if (!info) {
    // http 개발 서버: 수행평가는 실제 Backend에 저장되지만 인증·학업 정보(학교·과목) 원천은 개발용 Mock이다(OD-A04).
    // 서버 응답의 source 값과 관계없이 실제 기존 LearnersHigh 연동으로 표시하지 않는다. Production에는 표시하지 않는다.
    // A27-UX: 개발용 인증·계정 ID 문구는 사용자 화면에 보이지 않는다(개발자 확인은 ?devPanel=1 패널·로그).
    return null
  }
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
