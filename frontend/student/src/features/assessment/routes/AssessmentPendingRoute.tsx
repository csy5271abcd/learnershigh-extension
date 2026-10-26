import { Link } from 'react-router'
import { EmptyState } from '../components/StateViews.tsx'
import styles from './AssessmentPendingRoute.module.css'
import { schoolAssessmentsPath } from './paths.ts'

// 이번 범위에서 구현하지 않은 Assessment 메뉴 (홈·심화 탐구·피드백·자료함·성장 기록·보관함·꿀팁).
// 계약·Spec이 있는 기능도 화면을 만들기 전에는 가짜 데이터를 보여주지 않는다.
export function AssessmentPendingRoute({ title }: { title: string }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <EmptyState
        title="이 메뉴는 아직 준비 중이에요"
        description="학교 수행평가 화면부터 순서대로 연결하고 있어요."
        action={
          <Link className={styles.link} to={schoolAssessmentsPath}>
            학교 수행평가로 가기
          </Link>
        }
      />
    </main>
  )
}
