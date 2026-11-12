// Z′ 학생 상세(겹창 안). 묻는 순서: 왜 관리 대상인가(서버 사유마다 그 값을 만든 그림 하나, 크게) → 사진 → 상담.
// 사유가 아닌 지표는 접어 둔다(필요할 때 펼침). 그림·사진·출결 칸은 Z′ 전용 코드(zCharts·zPhotos·zAttendance).
import { useState, type ReactNode } from 'react'
import type { CareData, CareRow } from '../shared/useCareData.ts'
import { supLoadingText, type SupEvent, type SupState } from '../supervisor/supervisorClient.ts'
import { CareCounsel } from '../notation/CareCounsel.tsx'
import { recheckText, TIER_TITLE, tileFor } from '../z/zModel.ts'
import { reasons } from './reasons.ts'
import { DayFill, DayStart, SubjectFill, WeekDays, WeekFill, WeekStart } from './zCharts.tsx'
import { ZAttendance } from './zAttendance.tsx'
import { ZPhotos } from './zPhotos.tsx'

interface Props { s: CareRow; rows: CareRow[]; sup: SupState; data: CareData; nav: ReactNode; onSaved: (m: string) => void; onDirty: (d: boolean) => void }
type Th = { drop: number; shift: number; rate: number }
type P = 'd' | 'w'

// 지표 하나 = 그림 하나. 사유 종류(서버 type)마다 어떤 그림이 그 값을 보여 주는지
// 일간(최근 7일, 날짜별) ↔ 주간(최근 5주, 주별). 과목별은 최근 7일만 뜻이 있어 기간과 무관
const METRICS: { key: string; types: string[]; title: (p: P) => string; body: (s: CareRow, th: Th, p: P) => ReactNode }[] = [
  { key: 'absent', types: ['CONSECUTIVE_ABSENCE', 'WEEKDAY_ABSENCE'], title: (p) => p === 'd' ? '날짜별 출결 · 최근 7일' : '주별 결석 일수 · 최근 5주', body: (s, _th, p) => p === 'd' ? <ZAttendance s={s} only="att" /> : <WeekDays s={s} pick={(d) => d.attendance === 'absent'} unitWord="결석" /> },
  { key: 'missing', types: ['PLAN_MISSING'], title: (p) => p === 'd' ? '날짜별 계획 제출 · 최근 7일' : '주별 계획 미제출 일수 · 최근 5주', body: (s, _th, p) => p === 'd' ? <ZAttendance s={s} only="sub" /> : <WeekDays s={s} pick={(d) => d.submission === 'missing'} unitWord="계획 미제출" /> },
  { key: 'study', types: ['STUDY_DROP'], title: (p) => p === 'd' ? '날짜별 공부 시간 · 같은 요일 평소와' : '주별 공부 시간 · 지난 4주 평균과', body: (s, th, p) => p === 'd' ? <DayFill s={s} kind="study" th={th} /> : <WeekFill s={s} kind="study" th={th} /> },
  { key: 'start', types: ['START_TIME_SHIFT'], title: (p) => p === 'd' ? '날짜별 입실 시각 · 같은 요일 평소와' : '주별 평균 입실 시각 · 평소와', body: (s, th, p) => p === 'd' ? <DayStart s={s} th={th} /> : <WeekStart s={s} th={th} /> },
  { key: 'plan', types: ['EXECUTION_GAP'], title: (p) => p === 'd' ? '날짜별 계획과 실제' : '주별 계획과 실제', body: (s, th, p) => p === 'd' ? <DayFill s={s} kind="plan" th={th} /> : <WeekFill s={s} kind="plan" th={th} /> },
  { key: 'subject', types: ['EXECUTION_GAP', 'SUBJECT_SHARE'], title: () => '과목별 계획과 실제 · 최근 7일', body: (s, th) => <SubjectFill s={s} th={th} /> },
]

export function DetailZ2({ s, sup, data, nav, onSaved, onDirty }: Props) {
  const th: Th = { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate }
  // 기간은 화면 안의 그림이 함께 바꾼다(S14)
  const [period, setPeriod] = useState<P>('d')
  const seg = <div className="zz-seg" role="group" aria-label="기간"><button type="button" aria-pressed={period === 'd'} onClick={() => setPeriod('d')}>일간</button><button type="button" aria-pressed={period === 'w'} onClick={() => setPeriod('w')}>주간</button></div>
  const ev: SupEvent[] = sup.status === 'ready' ? sup.byStudent.get(s.student.studentId) ?? [] : []
  const said = reasons(s, th)
  // 사유 카드: 서버 사유 순서대로, 사유 이름 + 값을 제목에 두고 그 아래 그 값을 만든 그림(아직 다른 카드에 안 나온 것만)
  const used = new Set<string>()
  const cards = s.signals.map((x, i) => {
    const parts = METRICS.filter((m) => m.types.includes(x.type) && !used.has(m.key))
    parts.forEach((m) => used.add(m.key))
    return { key: `${x.type}-${i}`, label: x.label, value: said[i]?.value ?? '', parts }
  }).filter((c) => c.parts.length)
  // 일간 보기에서 출결·계획 제출은 맨 위 칸과 같아 다른 지표에서 되풀이하지 않는다
  const rest = METRICS.filter((m) => !used.has(m.key) && !(period === 'd' && (m.key === 'absent' || m.key === 'missing')))
  // 그림 하나짜리 카드는 둘씩 나란히, 짝이 없는 마지막 하나는 한 줄을 다 쓴다(빈 반쪽을 남기지 않는다)
  const singles = cards.filter((c) => c.parts.length === 1)
  const lastOdd = singles.length % 2 ? singles[singles.length - 1].key : ''
  const vision = sup.status === 'error' ? <p className="zz-note" role="alert">사진 관찰 서버에 연결하지 못했습니다</p> : sup.status === 'loading' ? <p className="zz-note" role="status">{supLoadingText(sup)}</p> : <ZPhotos s={s} ev={ev} />
  return (
    <article className="z-detail z2-detail zz" aria-labelledby="z-detail-name" data-care-detail-student={s.student.studentName}>
      {nav}
      <header className="z2-head">
        <h2 id="z-detail-name">{s.student.studentName} <span className="z-class">{s.student.className}</span></h2>
        <span className={`z-group z-group-${s.status}`}>{TIER_TITLE[tileFor(s, null).tier]}{recheckText(s) && ` · ${recheckText(s)}`}</span>
      </header>
      <section className="z2-box" aria-label="출결과 계획 제출 · 최근 7일"><ZAttendance s={s} /></section>
      {cards.length > 0 && <div className="zz-reasons">{cards.map((c) => <section key={c.key} className={`z2-box zz-card${c.parts.length > 1 || c.key === lastOdd ? ' zz-span' : ''}`} aria-label={c.label}>
        <header className="zz-card-head"><h3><b>{c.label}</b>{c.value && <span>{c.value}</span>}</h3>{seg}</header>
        <div className={`zz-parts${c.parts.length > 1 ? ' zz-two' : ''}`}>{c.parts.map((m) => <div key={m.key} className="zz-part"><p className="zz-sub">{m.title(period)}</p>{m.body(s, th, period)}</div>)}</div>
      </section>)}</div>}
      <section className="z2-box" aria-label="사진 관찰"><h3>사진 관찰</h3>{vision}</section>
      {rest.length > 0 && <details className="z2-box zz-more" open={!cards.length || undefined}>
        <summary>{cards.length ? `다른 지표 ${rest.length}개` : `지표 ${rest.length}개`}</summary>
        <div className="zz-rest-head">{seg}</div>
        <div className="zz-rest">{rest.map((m) => <section key={m.key} aria-label={m.title(period)}><h4>{m.title(period)}</h4>{m.body(s, th, period)}</section>)}</div>
      </details>}
      <CareCounsel s={s} version={data.version} prefix="z2" onSaved={onSaved} onDirty={onDirty} className="z2-counsel" />
    </article>
  )
}
