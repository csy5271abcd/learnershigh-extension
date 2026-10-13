import type { ComponentType } from 'react'
import {
  BlogIcon,
  DiagnosisIcon,
  DiaryIcon,
  LibraryIcon,
  MentorIcon,
  PerformanceTaskIcon,
  PlanIcon,
  ReportIcon,
  RewardIcon,
  RewardPenaltyIcon,
  SchoolActivityIcon,
  StatisticsIcon,
  TimerIcon,
} from './NavigationIcons.tsx'

export type StudentNavigationItemId =
  | 'timer'
  | 'plan'
  | 'library'
  | 'diary'
  | 'report'
  | 'statistics'
  | 'rewardPenalty'
  | 'performanceTask'
  | 'diagnosis'
  | 'blog'
  | 'reward'
  | 'mentor'
  | 'schoolActivity'

export interface StudentNavigationItem {
  id: StudentNavigationItemId
  label: string
  icon: ComponentType<{ className?: string }>
  /** Extension 신규 메뉴는 아이콘 옆에 Label을 함께 표시한다. */
  extension?: boolean
}

// 순서: 기존 LearnersHigh Student Header의 실제 아이콘 순서
// (references/existing-runners-high/screens/student/** 각 화면의 Active 위치로 확인)
// - 전국통계는 별도 아이콘이 없고 통계 아이콘 아래 화면이다.
// - "blog" 아이콘은 대응하는 Reference 화면이 없어 아이콘 표기 그대로 이름을 쓴다.
// 실제 기존 Route / URL은 확인 전이므로 연결하지 않는다.
export const studentNavigationItems: StudentNavigationItem[] = [
  { id: 'timer', label: '학습 타이머', icon: TimerIcon },
  { id: 'plan', label: '학습 계획', icon: PlanIcon },
  { id: 'library', label: '라이브러리', icon: LibraryIcon },
  { id: 'diary', label: '다이어리', icon: DiaryIcon },
  { id: 'report', label: '리포트', icon: ReportIcon },
  { id: 'statistics', label: '통계', icon: StatisticsIcon },
  { id: 'rewardPenalty', label: '상벌점', icon: RewardPenaltyIcon },
  { id: 'performanceTask', label: '수행평가', icon: PerformanceTaskIcon },
  { id: 'diagnosis', label: '진단', icon: DiagnosisIcon },
  { id: 'blog', label: 'blog', icon: BlogIcon },
  { id: 'reward', label: '리워드', icon: RewardIcon },
  { id: 'mentor', label: 'Mentor', icon: MentorIcon, extension: true },
  { id: 'schoolActivity', label: 'School Activity', icon: SchoolActivityIcon, extension: true },
]
