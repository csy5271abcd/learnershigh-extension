// Z안 학생 상세 그림(plan-z.md 4장 "학생 상세" 열).
// 최근 7일·30일은 지표가 줄, 날짜가 열인 표다. 정확값은 data-tip(마우스·초점).
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { md } from '../shared/useCareData.ts'
import type { OpsDay } from '../../ops/opsModel.ts'
import { dayLabel, dur, timeOfDay } from './zModel.ts'
import { STUDY_FACTORS, type ManagementReason, type StudyFactor } from './vision/visionContract.ts'
import { FACTOR_LABEL, REASON_LABEL, pctOf, type VisionStudent } from './vision/visionModel.ts'
import { evidenceSrc, reasonOf, useEvidence } from './vision/careEvidence.ts'

const ATT = { present: '입실', absent: '결석', off: '예정 없음', unknown: '기록 없음' } as const
const SUB = { submitted: '제출', missing: '미제출', off: '예정 없음', unknown: '기록 없음' } as const

interface BoardProps { s: CareRow; dropPercent: number; shift: number; rateThreshold: number; showRate: boolean }
type Lv = 'bad' | 'warn' | 'ok'
export type BoardRange = 7 | 30

/**
 * 최근 7일·30일 표. 지표가 줄, 날짜가 열이다.
 * 출결·계획 제출은 날짜마다 상태 하나라 글자 칸(평소는 흐리게, 결석·미제출만 빨강). 30일에서는 글자 없이 색만 남긴다.
 * 공부 시간·입실 시각·계획 대비 달성은 양이라 그림으로만 보이고, 정확값은 마우스·초점으로 본다(F15).
 *   공부 시간: 세로 막대(실제) + 가로 눈금(같은 요일 평소). 막대가 눈금에 못 미친 만큼이 줄어든 만큼이다.
 *   입실 시각: 위가 이른 시각인 세로 축의 점(실제)과 눈금(평소), 둘을 잇는 줄기. 아래로 내려간 길이가 늦은 만큼이다.
 *   전체 계획 대비: 세로 막대(실제) + 줄 전체를 가로지르는 선(그날 계획 100%). 계획보다 더 하면 선 위로 올라간다. 과목별 계획은 아래 과목 카드가 맡는다.
 * 색은 서버 기준을 넘었는지만 뜻한다. 평소 값은 최근 7일에만 있어, 그 전 날들은 색 없이 그린다.
 */
export function WeekBoard({ s, dropPercent, shift, rateThreshold, showRate, range }: BoardProps & { range: BoardRange }) {
  const days = range === 7 ? s.days : s.history35.slice(-range)
  const wide = range > 7, w = s.week
  const lvOf = (bad: boolean, warn: boolean): Lv => bad ? 'bad' : warn ? 'warn' : 'ok'
  const maxMin = Math.max(60, ...days.flatMap((d) => [d.minutes ?? 0, d.usualMinutes ?? 0]))
  const starts = days.flatMap((d) => [d.start, d.usualStart].filter((v): v is number => v !== null))
  const lo = starts.length ? Math.min(...starts) - 15 : 0, hi = starts.length ? Math.max(...starts) + 15 : 1
  const y = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  const pct = (v: number, max: number) => `${Math.min(100, (v / max) * 100)}%`
  const rates = days.flatMap((d) => (d.planned ?? 0) > 0 && d.actual !== null ? [(d.actual / d.planned!) * 100] : [])
  const maxRate = Math.min(200, Math.max(125, ...rates))
  const none = (d: OpsDay, text: string) => <span className="z-wk-none" tabIndex={0} data-tip={text} aria-label={text}>{wide || d.attendance !== 'present' ? '' : '—'}</span>
  const chip = (bad: boolean, ok: boolean, word: string, tip: string) =>
    <span className={`z-wk-chip${bad ? ' z-wk-chip-bad' : ok ? '' : ' z-wk-chip-none'}`} tabIndex={0} data-tip={tip} aria-label={tip}>{wide ? '' : word}</span>
  const rows: { title: string; note?: string; kind: string; goal?: boolean; render: (d: OpsDay) => ReactNode }[] = [
    { title: '출결', kind: 'chip', render: (d) => chip(d.attendance === 'absent', d.attendance === 'present', ATT[d.attendance], `${dayLabel(d)} ${ATT[d.attendance]}`) },
    { title: '계획 제출', kind: 'chip', render: (d) => chip(d.submission === 'missing', d.submission === 'submitted', SUB[d.submission], `${dayLabel(d)} 계획 ${SUB[d.submission]}`) },
    { title: '공부 시간', kind: 'plot', note: !wide && w.minutes !== null && w.usualWeek ? `평소의 ${Math.round((w.minutes / w.usualWeek) * 100)}%` : undefined, render: (d) => {
      if (d.minutes === null) return none(d, `${dayLabel(d)} ${ATT[d.attendance]}`)
      const r = d.usualMinutes ? (d.minutes / d.usualMinutes) * 100 : null
      const lv = r === null ? 'ok' : lvOf(100 - r >= dropPercent, 100 - r >= dropPercent / 2)
      const tip = `${dayLabel(d)} · 공부 ${dur(d.minutes)}${d.usualMinutes ? ` · 같은 요일 평소 ${dur(d.usualMinutes)} (${Math.round(r!)}%)` : ''}`
      return <span className={`z-wk-plot z-wk-${lv}`} tabIndex={0} data-tip={tip} aria-label={tip}>
        <i className="z-wk-bar" style={{ height: pct(d.minutes, maxMin) }} />
        {d.usualMinutes !== null && <i className="z-wk-mark" style={{ bottom: pct(d.usualMinutes, maxMin) }} />}
      </span>
    } },
    { title: '입실 시각', kind: 'plot', render: (d) => {
      if (d.start === null) return none(d, `${dayLabel(d)} ${ATT[d.attendance]}`)
      const late = d.usualStart === null ? null : d.start - d.usualStart
      const lv = late === null ? 'ok' : lvOf(late >= shift, late >= shift / 2)
      const tip = `${dayLabel(d)} · 입실 ${timeOfDay(d.start)}${late !== null ? ` · 같은 요일 평소 ${timeOfDay(d.usualStart!)} (${Math.abs(late) < 5 ? '평소대로' : late > 0 ? `${dur(late)} 늦음` : `${dur(-late)} 이름`})` : ''}`
      return <span className={`z-wk-plot z-wk-${lv}`} tabIndex={0} data-tip={tip} aria-label={tip}>
        {d.usualStart !== null && <>
          <i className="z-wk-stem" style={{ top: y(Math.min(d.start, d.usualStart)), height: `${(Math.abs(d.start - d.usualStart) / (hi - lo)) * 100}%` }} />
          <i className="z-wk-mark" style={{ top: y(d.usualStart) }} />
        </>}
        <i className="z-wk-dot" style={{ top: y(d.start) }} />
      </span>
    } },
    { title: '전체 계획 대비', kind: 'plot', goal: true, note: !wide && showRate && w.executionRate !== null ? `이번 주 ${Math.round(w.executionRate)}%` : undefined, render: (d) => {
      const has = (d.planned ?? 0) > 0
      if (!has || d.actual === null) return none(d, `${dayLabel(d)} · ${d.attendance !== 'present' ? ATT[d.attendance] : has ? '기록 없음' : '계획 없음'}`)
      const r = (d.actual / d.planned!) * 100
      const tip = `${dayLabel(d)} · 계획 ${dur(d.planned)} · 실제 ${dur(d.actual)} (${Math.round(r)}%)`
      return <span className={`z-wk-plot z-wk-${lvOf(r < rateThreshold, r < (rateThreshold + 100) / 2)}`} tabIndex={0} data-tip={tip} aria-label={tip}>
        <i className="z-wk-bar" style={{ height: pct(r, maxRate) }} />
      </span>
    } },
  ]
  return (
    <div className={`z-wk${wide ? ' z-wk-wide' : ''}`} role="table" aria-label={`${s.student.studentName} 최근 ${range}일`} style={{ '--n': days.length } as CSSProperties}>
      <div className="z-wk-row z-wk-head" role="row"><span role="columnheader" />{days.map((d, i) => {
        const day = Number(d.date.slice(8, 10))
        return <span key={d.date} role="columnheader" className={`${d.attendance === 'absent' ? 'z-wk-absent-h' : ''}${wide && (d.dow === '월') ? ' z-wk-mon' : ''}`}>
          {wide ? <b>{i === 0 || day === 1 ? md(d.date) : day}</b> : <><b>{md(d.date)}</b> {d.dow}</>}
        </span>
      })}</div>
      {rows.map((row) => (
        <div key={row.title} className={`z-wk-row z-wk-${row.kind}-row`} role="row">
          <span role="rowheader" className="z-wk-label"><b>{row.title}</b>{row.note && <small>{row.note}</small>}</span>
          {row.goal && <i className="z-wk-goal" aria-hidden style={{ bottom: `calc(8px + ${(100 / maxRate) * 56}px)` }} />}
          {days.map((d) => <span key={d.date} role="cell" className={wide && d.dow === '월' ? 'z-wk-mon' : undefined}>{row.render(d)}</span>)}
        </div>
      ))}
    </div>
  )
}

/** 기준과 비교하는 막대: 막대 = 지금 값, 세로 눈금 = 비교 기준. 기준 이름은 차이가 가장 큰 줄 하나에만 직접 쓴다 */
interface BulletRow { key: string; label: string; value: number | null; mark: number | null; flag: boolean; tip: string; note?: string }
function Bullets({ rows, markName, max }: { rows: BulletRow[]; markName: string; max: number }) {
  const lead = [...rows].filter((r) => r.value !== null && r.mark !== null).sort((a, b) => Math.abs(b.value! - b.mark!) - Math.abs(a.value! - a.mark!))[0]
  const pos = (v: number) => `${Math.min(100, (v / max) * 100)}%`
  return (
    <ul className="z-bullets">
      {rows.map((r) => (
        <li key={r.key} className={r.flag ? 'z-bl-flag' : undefined} tabIndex={0} data-tip={r.tip} aria-label={r.tip}>
          <span className="z-bl-label">{r.label}</span>
          {r.note ? <span className="z-bl-note">{r.note}</span> : <span className="z-bl-track">
            {r.value !== null && <span className="z-bl-bar" style={{ width: pos(r.value) }} />}
            {r.mark !== null && <span className="z-bl-mark" style={{ left: pos(r.mark) }}>{r === lead && <em>{markName}</em>}</span>}
          </span>}
          <span className="z-bl-val">{r.note ? '' : r.value === null ? '—' : `${Math.round(r.value)}%`}</span>
        </li>
      ))}
    </ul>
  )
}

export function SubjectBullets({ s }: { s: CareRow }) {
  const flagged = s.signals.find((x) => x.type === 'SUBJECT_SHARE')?.summary.split(' ')[0]
  if (!s.subjects.length) return <p className="z-empty">최근 7일 과목 기록 없음</p>
  const max = Math.max(20, Math.ceil(Math.max(...s.subjects.flatMap((x) => [x.plannedShare ?? 0, x.actualShare ?? 0])) / 10) * 10)
  return <Bullets markName="계획" max={max} rows={s.subjects.map((x) => ({
    key: x.name, label: x.name, value: x.actualShare, mark: x.plannedShare, flag: x.name === flagged,
    tip: `${x.name} · 실제 ${x.actualShare === null ? '—' : `${x.actualShare.toFixed(1)}%`} (${dur(x.actualMinutes)}) · 계획 ${x.plannedShare === null ? '—' : `${x.plannedShare.toFixed(1)}%`} (${dur(x.plannedMinutes)})`,
  }))} />
}

const FACTOR_REASON: Partial<Record<StudyFactor, ManagementReason>> = { person_visible: 'absence_observed', phone_interaction: 'phone_interaction_observed', desk_resting: 'desk_resting_observed' }

/**
 * 사진 관찰 7일: 날짜 7칸(관리 사유가 나온 날 빨강) → 누른 날의 근거 사진과 그날 사진 관찰 문장(서버 문구 그대로) → 다섯 관찰의 7일 합산 비율.
 * 사진은 사진 관찰 서비스가 저장하고 학생 케어 API(§65-11)가 내준다. 사유는 같은 촬영의 보고 장면에서 읽는다. 사진이 있는 날만 누를 수 있고, 사진을 누르면 카드 안에서 크게 본다(팝업 아님).
 */
export function VisionWeekView({ s, v }: { s: CareRow; v: VisionStudent }) {
  const flagged = new Set(v.reasonDays.map((r) => r.reason))
  const ev = useEvidence(s.student.branchId, s.student.studentId, s.days[0].date, s.days[s.days.length - 1].date)
  const items = ev.status === 'ready' ? ev.items : []
  const withPhotos = s.days.filter((d) => items.some((x) => x.serviceDate === d.date && reasonOf(v, x.captureId))).map((d) => d.date)
  const [picked, setPicked] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const date = picked ?? withPhotos[withPhotos.length - 1] ?? null
  const dayIndex = date ? s.days.findIndex((d) => d.date === date) : -1
  const photos = items.filter((x) => x.serviceDate === date).flatMap((x) => { const reason = reasonOf(v, x.captureId); return reason ? [{ ...x, reason }] : [] })
  const summary = dayIndex >= 0 ? v.days[dayIndex]?.doc?.summary : v.latest?.doc?.summary
  return (
    <div className="z-vw">
      <div className="z-vw-days" role="group" aria-label="날짜별 사진 관찰 관리 사유">
        {s.days.map((d, i) => {
          const day = v.days[i], has = withPhotos.includes(d.date)
          const tip = `${dayLabel(d)} · ${!day?.doc ? '보고 없음' : day.reasons.length ? day.reasons.map((r) => REASON_LABEL[r]).join(', ') : day.doc.facts.quality === 'sufficient' ? '관리 사유 없음' : '판단 보류'}${has ? ' · 눌러서 사진 보기' : ''}`
          const cls = `z-vw-day${!day?.doc ? ' z-vw-none' : day.reasons.length ? ' z-vw-flag' : ''}${date === d.date ? ' z-vw-on' : ''}`
          return has
            ? <button key={d.date} type="button" className={cls} aria-pressed={date === d.date} data-tip={tip} aria-label={tip} onClick={() => { setPicked(d.date); setZoom(null) }}><b>{d.dow}</b></button>
            : <span key={d.date} tabIndex={0} data-tip={tip} aria-label={tip} className={cls}><b>{d.dow}</b></span>
        })}
      </div>
      {ev.status === 'error' && <p className="z-vg" role="alert">사진을 불러오지 못했습니다</p>}
      {date && photos.length > 0 && <div className="z-vw-photos" aria-label={`${md(date)} 근거 사진`}>
        {photos.map((x) => {
          const at = new Date(x.capturedAt), mins = (at.getUTCHours() + 9) % 24 * 60 + at.getUTCMinutes()
          const caption = `${REASON_LABEL[x.reason]} · ${timeOfDay(mins)}`
          return <button key={x.evidenceId} type="button" className={`z-vw-photo${zoom === x.evidenceId ? ' z-vw-photo-big' : ''}`} aria-pressed={zoom === x.evidenceId} aria-label={`${caption} 사진 ${zoom === x.evidenceId ? '작게' : '크게'} 보기`} onClick={() => setZoom(zoom === x.evidenceId ? null : x.evidenceId)}>
            <img src={evidenceSrc(s.student.branchId, s.student.studentId, x.evidenceId)} alt={`${md(date)} ${caption}`} loading="lazy" />
            <span>{caption}</span>
          </button>
        })}
      </div>}
      {summary && <p className="z-vw-summary">{date ? `${md(date)} ` : ''}{summary}</p>}
      <Bullets markName="" max={100} rows={STUDY_FACTORS.map((f) => {
        const t = v.totals[f], reason = FACTOR_REASON[f]
        return { key: f, label: FACTOR_LABEL[f], value: t.value === null ? null : t.value * 100, mark: null, flag: !!reason && flagged.has(reason),
          note: t.denominator ? undefined : '사진 없음', tip: `${FACTOR_LABEL[f]} · 7일 사진 ${t.denominator}장 중 ${t.numerator}장 (${pctOf(t)})` }
      })} />
    </div>
  )
}

/**
 * 최근 5주 출결·계획 제출. 월요일 시작 주를 한 줄씩 쌓아 같은 요일 반복이 세로로 보인다.
 * 칸은 최근 7일 표와 같은 글자 칸이다(평소는 흐리게, 결석·미제출만 빨강). 최근 7일은 테두리로 묶는다.
 */
export function AttendanceWeeks({ s }: { s: CareRow }) {
  const order = ['월', '화', '수', '목', '금', '토', '일']
  const days = s.history35
  const recent = new Set(s.days.map((d) => d.date))
  const cells: (OpsDay | null)[] = [...Array(order.indexOf(days[0].dow)).fill(null), ...days]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const chip = (d: OpsDay | null, bad: boolean, ok: boolean, word: string, tip: string) => !d ? <span /> :
    <span className={`z-wk-chip${bad ? ' z-wk-chip-bad' : ok ? '' : ' z-wk-chip-none'}${recent.has(d.date) ? ' z-wk-chip-recent' : ''}`} tabIndex={0} data-tip={tip} aria-label={tip}>{word}</span>
  return (
    <div className="z-aw" role="table" aria-label="최근 5주 출결과 계획 제출">
      <div className="z-aw-row z-aw-head" role="row"><span />{order.map((d) => <span key={d} role="columnheader">{d}</span>)}</div>
      {weeks.map((wk, i) => {
        const first = wk.find(Boolean)!
        return (
          <div key={first.date} className="z-aw-week" role="rowgroup">
            <div className="z-aw-row z-aw-dates" role="row"><span role="rowheader">{i === weeks.length - 1 ? '이번 주' : `${md(first.date)} 주`}</span>{wk.map((d, j) => <span key={j} role="columnheader">{d ? Number(d.date.slice(8, 10)) : ''}</span>)}</div>
            <div className="z-aw-row" role="row"><span role="rowheader">출결</span>{wk.map((d, j) => <span key={j} role="cell">{d && chip(d, d.attendance === 'absent', d.attendance === 'present', ATT[d.attendance], `${dayLabel(d)} ${ATT[d.attendance]}`)}</span>)}</div>
            <div className="z-aw-row" role="row"><span role="rowheader">계획 제출</span>{wk.map((d, j) => <span key={j} role="cell">{d && chip(d, d.submission === 'missing', d.submission === 'submitted', SUB[d.submission], `${dayLabel(d)} 계획 ${SUB[d.submission]}`)}</span>)}</div>
          </div>
        )
      })}
    </div>
  )
}
