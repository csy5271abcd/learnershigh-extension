import type { AcademicTermQuery, SchoolAssessment } from '../api/types.ts'
import { isSameTerm } from './academicTerm.ts'
import { upcomingDeadlines, urgentDays, type UpcomingDeadline } from './schoolAssessmentView.ts'

// Assessment 홈(S24) 표시 규칙. 홈 전용 요약 API가 없어(MM-42) 기존 목록 응답에서만 계산한다. 숫자를 따로 저장하지 않는다.

/** 홈 제목. Mockup "김민지님, 이번 학기 수행평가"의 학생 이름은 §9-1 응답에 없어 쓰지 않는다 (MM-42). */
export function homeTitle(selectedTerm: AcademicTermQuery | undefined, currentTerm: AcademicTermQuery | undefined): string {
  if (!selectedTerm || (currentTerm && isSameTerm(selectedTerm, currentTerm))) return '이번 학기 수행평가'
  return `${selectedTerm.academicYear}학년도 ${selectedTerm.semester}학기 수행평가`
}

/**
 * 홈 알림 Popover 항목 (Mockup ST_Assessment-Home_03). 알림 계약·읽음 상태가 없어(MM-43)
 * "기준일부터 7일 안에 마감인 미완료 과제"를 그때그때 계산해 보여준다. 저장·발송·읽음 처리는 하지 않는다.
 */
export function deadlineAlerts(items: SchoolAssessment[], today: string): UpcomingDeadline[] {
  return upcomingDeadlines(items, today, items.length).filter((entry) => entry.days <= urgentDays)
}

/** AI 입력창·평가 기준 보기의 기본 대상 과제: 가장 가까운 마감 → 진행 중 → 첫 과제 */
export function defaultTargetAssessment(items: SchoolAssessment[], today: string): SchoolAssessment | undefined {
  return upcomingDeadlines(items, today, 1)[0]?.assessment ?? items.find((item) => item.status === 'IN_PROGRESS') ?? items[0]
}
