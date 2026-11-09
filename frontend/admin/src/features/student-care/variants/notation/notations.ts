// 표시법 20종 목록(항목 4개 × 5). 보고서와 시안 Y·X·Z′가 같은 목록을 쓴다.
import type { ComponentType } from 'react'
import type { NotationProps } from './kit.tsx'
import { StudyCumulative, StudyPeerScatter, StudyUnitHistogram, StudyWaterfall, StudyWeekStacks } from './StudyNotations.tsx'
import { StartParallel, StartQuantileLadder, StartRunChart, StartTimetable, StartWeekdayLanes } from './StartNotations.tsx'
import { PlanAreaTiles, PlanFlow, PlanMirror, PlanRadar, PlanShadow } from './PlanNotations.tsx'
import { VisionBubbles, VisionFilm, VisionHours, VisionPictograms, VisionStackedArea } from './VisionNotations.tsx'

export interface Notation { id: string; name: string; C: ComponentType<NotationProps> }
export const NOTATIONS: { key: string; title: string; items: Notation[] }[] = [
  { key: 'study', title: '공부 시간', items: [
    { id: 'S1', name: '폭포', C: StudyWaterfall },
    { id: 'S2', name: '학습관 산점도', C: StudyPeerScatter },
    { id: 'S3', name: '개인 분포 쌓기', C: StudyUnitHistogram },
    { id: 'S4', name: '주별 쌓기 기둥', C: StudyWeekStacks },
    { id: 'S5', name: '누적 계단', C: StudyCumulative },
  ] },
  { key: 'start', title: '입실 시각', items: [
    { id: 'T1', name: '하루 시간표', C: StartTimetable },
    { id: 'T2', name: '요일 줄 눈금', C: StartWeekdayLanes },
    { id: 'T3', name: '평행 축', C: StartParallel },
    { id: 'T4', name: '이어진 늦음 받침', C: StartRunChart },
    { id: 'T5', name: '이른 순 사다리', C: StartQuantileLadder },
  ] },
  { key: 'plan', title: '전체 계획 대비', items: [
    { id: 'P1', name: '과목 흐름', C: PlanFlow },
    { id: 'P2', name: '계획 넓이 안의 실제', C: PlanAreaTiles },
    { id: 'P3', name: '과목 방사형', C: PlanRadar },
    { id: 'P4', name: '계획 그림자', C: PlanShadow },
    { id: 'P5', name: '계획·실제 마주 보기', C: PlanMirror },
  ] },
  { key: 'vision', title: '사진 관찰', items: [
    { id: 'V1', name: '사건 필름', C: VisionFilm },
    { id: 'V2', name: '그림 쌓기', C: VisionPictograms },
    { id: 'V3', name: '크기 원 격자', C: VisionBubbles },
    { id: 'V4', name: '시간대 겹침', C: VisionHours },
    { id: 'V5', name: '종류별 쌓인 면', C: VisionStackedArea },
  ] },
]
