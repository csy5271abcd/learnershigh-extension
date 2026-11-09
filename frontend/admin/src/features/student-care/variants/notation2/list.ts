// 표시법 2차 20종 목록(항목 4개 × 5). 비교 화면(/student-care/notation)과 보고서가 같은 목록을 쓴다.
import type { ComponentType } from 'react'
import type { NotationProps } from '../notation/kit.tsx'
import { StudyBars35, StudyLine35, StudyOverlapBars, StudyPeerHistogram, StudyWeekRows } from './Study.tsx'
import { StartDots7, StartHistogram, StartLateWeeks, StartLine35, StartWeekdayRange } from './Start.tsx'
import { PlanComposition, PlanPairBars, PlanRateLine, PlanScatter, PlanSubjectRate } from './Plan.tsx'
import { VisionCards, VisionHourBars, VisionShareLine, VisionTypeRows, VisionWeekVsUsual } from './Vision.tsx'

export interface Notation { id: string; name: string; C: ComponentType<NotationProps> }
export const NOTATIONS: { key: string; title: string; items: Notation[] }[] = [
  { key: 'study', title: '공부 시간', items: [
    { id: 'A1', name: '겹친 막대(최근 7일)', C: StudyOverlapBars },
    { id: 'A2', name: '35일 막대 + 평소 하루 선', C: StudyBars35 },
    { id: 'A3', name: '주 합계 가로 막대(5주)', C: StudyWeekRows },
    { id: 'A4', name: '35일 꺾은선', C: StudyLine35 },
    { id: 'A5', name: '학습관 분포 속 위치', C: StudyPeerHistogram },
  ] },
  { key: 'start', title: '입실 시각', items: [
    { id: 'B1', name: '날짜별 시각 점(최근 7일)', C: StartDots7 },
    { id: 'B2', name: '35일 입실 꺾은선', C: StartLine35 },
    { id: 'B3', name: '요일별 범위 막대', C: StartWeekdayRange },
    { id: 'B4', name: '입실 시각 분포 막대', C: StartHistogram },
    { id: 'B5', name: '주별 늦은 날 수', C: StartLateWeeks },
  ] },
  { key: 'plan', title: '전체 계획 대비', items: [
    { id: 'C1', name: '계획·실제 묶은 막대(최근 7일)', C: PlanPairBars },
    { id: 'C2', name: '35일 계획 대비 꺾은선', C: PlanRateLine },
    { id: 'C3', name: '과목별 계획 대비 가로 막대', C: PlanSubjectRate },
    { id: 'C4', name: '계획·실제 산점도(35일)', C: PlanScatter },
    { id: 'C5', name: '과목 구성 두 줄', C: PlanComposition },
  ] },
  { key: 'vision', title: '사진 관찰', items: [
    { id: 'D1', name: '근거 사진 카드', C: VisionCards },
    { id: 'D2', name: '종류별 작은 막대 줄(35일)', C: VisionTypeRows },
    { id: 'D3', name: '종류별 최근 7일과 평소', C: VisionWeekVsUsual },
    { id: 'D4', name: '시간대 막대', C: VisionHourBars },
    { id: 'D5', name: '공부 시간 대비 비몰입 비율', C: VisionShareLine },
  ] },
]
