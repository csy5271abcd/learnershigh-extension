// Z′ 학생 상세(겹창 안). 순서는 관리자가 묻는 순서다: 출결 → 공부가 줄었나·왜(결석/짧은 날) → 늦음이 이어지나 → 사진 근거 → 계획 → 상담.
// 최종 시안: 최근 7일을 평소와 겹쳐 보는 그림을 앞에 둔다(2차 표시법, variants/notation2).
// 공부 A1 평소·실제 나란히 막대, 입실 B6 최근 7일과 평소 꺾은선, 사진 D3 종류별 건수(평소·최근 7일) + 기록 전체 보기, 계획 C6 과목별 계획·실제 시간.
import { useState, type ReactNode } from 'react'
import type { CareData, CareRow } from '../shared/useCareData.ts'
import { supLoadingText, type SupEvent, type SupState } from '../supervisor/supervisorClient.ts'
import { AttendanceChips } from '../notation/AttendanceChips.tsx'
import { CareCounsel } from '../notation/CareCounsel.tsx'
import type { NotationProps } from '../notation/kit.tsx'
import { PlanSubjectPairs } from '../notation2/Plan.tsx'
import { VisionDayBars, VisionWeekBars } from '../notation2/Vision.tsx'
import { ViewSwitch, type Period } from '../final/ViewSwitch.tsx'
import { PlanPair, StartPair, StudyPair } from '../final/PairCharts.tsx'
import { EvidenceLog } from '../final/EvidenceLog.tsx'
import { recheckText, TIER_TITLE, tileFor } from '../z/zModel.ts'
import { reasons } from './reasons.ts'

interface Props { s: CareRow; rows: CareRow[]; sup: SupState; data: CareData; nav: ReactNode; onSaved: (m: string) => void; onDirty: (d: boolean) => void }

function Box({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return <section className={`z2-box${wide ? ' z2-wide' : ''}`} aria-label={title}><h3>{title}</h3>{children}</section>
}

export function DetailZ2({ s, rows, sup, data, nav, onSaved, onDirty }: Props) {
  // 상세 안 그림은 일간·주간을 함께 바꾼다
  const [period, setPeriod] = useState<Period>('d')
  const evAll = sup.status === 'ready' ? sup.byStudent : new Map<string, SupEvent[]>()
  const ev = evAll.get(s.student.studentId) ?? []
  const p: NotationProps = { s, rows, ev, evAll, th: { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate } }
  // 명부와 같은 말: 서버 사유 이름 + 그 값, 사진 관찰은 2일 이상인 종류만
  // 머리 줄은 서버 사유만(명부와 같은 말과 값). 사진 관찰 늘어남은 사진 관찰 칸 안에서 본다
  const said = reasons(s, { shift: data.startShiftMinutes, rate: data.executionRate }).map((x) => `${x.label}${x.value ? ` ${x.value}` : ''}`)
  const visionBody = sup.status === 'error' ? <p className="z-vg" role="alert">사진 관찰 서버에 연결하지 못했습니다</p> : sup.status === 'loading' ? <p role="status">{supLoadingText(sup)}</p> : null
  return (
    <article className="z-detail z2-detail" aria-labelledby="z-detail-name" data-care-detail-student={s.student.studentName}>
      {nav}
      <header className="z2-head">
        <h2 id="z-detail-name">{s.student.studentName} <span className="z-class">{s.student.className}</span></h2>
        <span className={`z-group z-group-${s.status}`}>{TIER_TITLE[tileFor(s, null).tier]}{recheckText(s) && ` · ${recheckText(s)}`}</span>
        {said.length > 0 && <p className="z2-reasons">{said.join(' · ')}</p>}
      </header>
      <Box title="출결 · 계획 제출" wide><AttendanceChips s={s} /></Box>
      <div className="z2-grid">
        <section className="z2-box"><ViewSwitch value={period} onChange={setPeriod} title="날짜별 공부 시간 · 같은 요일 평소와" titleW="주별 공부 시간 · 지난 4주 평균과" daily={<StudyPair {...p} period="d" />} weekly={<StudyPair {...p} period="w" />} /></section>
        <section className="z2-box"><ViewSwitch value={period} onChange={setPeriod} title="날짜별 입실 시각 · 같은 요일 평소와" titleW="주별 평균 입실 시각 · 평소와" daily={<StartPair {...p} period="d" />} weekly={<StartPair {...p} period="w" />} /></section>
      </div>
      <section className="z2-box z2-wide" aria-label="사진 관찰">{visionBody ?? <div className="z2-stack"><ViewSwitch value={period} onChange={setPeriod} title="사진 관찰 · 날짜별 비몰입 건수" titleW="사진 관찰 · 주별 비몰입 건수" daily={<VisionDayBars {...p} />} weekly={<VisionWeekBars {...p} />} /><EvidenceLog s={s} ev={ev} period={period} /></div>}</section>
      <div className="z2-grid">
        <section className="z2-box"><ViewSwitch value={period} onChange={setPeriod} title="날짜별 계획과 실제" titleW="주별 계획과 실제" daily={<PlanPair {...p} period="d" />} weekly={<PlanPair {...p} period="w" />} /></section>
        <Box title="과목별 계획과 실제 · 최근 7일"><PlanSubjectPairs {...p} /></Box>
      </div>
      <CareCounsel s={s} version={data.version} prefix="z2" onSaved={onSaved} onDirty={onDirty} className="z2-counsel" />
    </article>
  )
}
