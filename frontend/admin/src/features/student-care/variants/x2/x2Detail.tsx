// 시안 X′ 학생 겹창. 학생별 명단과 학습관별 화면이 같은 겹창을 쓴다.
// 짜임은 원래 관리 화면의 '학습계획 추가' 겹창: 어두운 머리 띠(이름·반·관리 사유, 닫기) + 흰 본문.
// 탭 셋: 학습관 생활(출결·계획 제출, 공부 시간, 계획과 실제, 과목별, 입실 시각) · 사진 관찰 · 상담.
import { useEffect, useRef, useState } from 'react'
import type { CareRow } from '../shared/useCareData.ts'
import { CareCounsel } from '../notation/CareCounsel.tsx'
import { AttendanceGrid } from './x2Attendance.tsx'
// 그림은 모두 같은 꼴(x2Target)
import { PlanFig, StartFig, StudyFig, SubjectFig, VisionFig } from './x2Target.tsx'
import { EvidenceLog, type VisionFocus } from './x2Evidence.tsx'
import { supLoadingText, type SupEvent, type SupState } from '../supervisor/supervisorClient.ts'
import { reasons } from '../z2/reasons.ts'
import { hm } from '../notation/kit.tsx'
import { absentDays, missingDays, startLate } from '../z/zModel.ts'
import { newbieOf, type Period } from './x2Model.ts'
import { ReportWithAttach } from './report/ReportWithAttach.tsx'

type Tab = 'life' | 'vision' | 'counsel' | 'report'
/** 안내 띠 값: 사유마다 같은 꼴의 짧은 한 마디(최근 7일 기준) */
function whyValue(s: CareRow, type: string, th: { shift: number; rate: number }): string | null {
  const wk = s.week
  if (type === 'CONSECUTIVE_ABSENCE') return `결석 ${absentDays(s)}일`
  if (type === 'PLAN_MISSING') return `미제출 ${missingDays(s)}일`
  if (type === 'STUDY_DROP' && wk.minutes !== null && wk.usualWeek) return `${hm(wk.minutes)} · 평소 ${hm(wk.usualWeek)}`
  if (type === 'EXECUTION_GAP' && wk.executionRate !== null) return `달성률 ${Math.floor(wk.executionRate)}%`
  if (type === 'START_TIME_SHIFT') { const l = startLate(s); return l === null ? null : l < th.shift ? '지금은 기준 아래' : `평소보다 ${hm(l)} 늦게` }
  return null
}
// 리포트 미리보기(임시, 2026-11-12): 이 학생의 학부모 리포트 생활 탭과 상담 첨부를 겹창 안에서 본다
const TABS: [Tab, string][] = [['life', '학습관 생활'], ['vision', '사진 관찰'], ['counsel', '상담'], ['report', '학부모 리포트']]
const LIFE_SIG = ['CONSECUTIVE_ABSENCE', 'PLAN_MISSING', 'STUDY_DROP', 'EXECUTION_GAP', 'SUBJECT_SHARE', 'START_TIME_SHIFT']
// 사유마다 볼 곳(학습관 생활 탭 안 그림)
const WHERE: Record<string, [string, string]> = { CONSECUTIVE_ABSENCE: ['x2-fig-att', '출결'], PLAN_MISSING: ['x2-fig-att', '계획 제출'], STUDY_DROP: ['x2-fig-study', '공부 시간'], EXECUTION_GAP: ['x2-fig-plan', '계획과 실제'], SUBJECT_SHARE: ['x2-fig-subject', '과목별'], START_TIME_SHIFT: ['x2-fig-start', '입실 시각'] }

interface Props {
  s: CareRow | null
  list: CareRow[]
  sup: SupState
  th: { drop: number; shift: number; rate: number }
  perHour: number
  version: number
  onSaved: (m: string) => void
  onMove: (r: CareRow) => void
  onClose: () => void
}

function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return <div className="x2-seg" role="group" aria-label="그림 기간">
    <button type="button" aria-pressed={value === 'd'} onClick={() => onChange('d')}>날짜별 · 최근 7일</button>
    <button type="button" aria-pressed={value === 'w'} onClick={() => onChange('w')}>주별 · 최근 5주</button>
  </div>
}

export function StudentDialog({ s, list, sup, th, perHour, version, onSaved, onMove, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [tab, setTab] = useState<Tab>('life')
  const [period, setPeriod] = useState<Period>('d')
  // 고른 막대는 학생마다 따로(다른 학생으로 옮기면 풀린다)
  const [focusRaw, setFocus] = useState<(VisionFocus & { key: string; sid: string }) | null>(null)
  const focus = focusRaw && focusRaw.sid === s?.student.studentId ? focusRaw : null
  const [dirty, setDirty] = useState(false)
  useEffect(() => { const d = ref.current; if (!d) return; if (s && !d.open) d.showModal(); if (!s && d.open) d.close() }, [s])
  const guard = (go: () => void) => { if (!dirty || window.confirm('저장하지 않은 상담 내용이 있습니다. 나갈까요?')) { setDirty(false); go() } }
  const i = s ? list.indexOf(s) : -1
  const ev: SupEvent[] = s && sup.status === 'ready' ? sup.byStudent.get(s.student.studentId) ?? [] : []
  const rs = s ? reasons(s, th) : []
  // 최근 7일에 입실한 날이 없어도 고른 기간 그대로 보인다(사용자: 굳이 5주로 바꿀 필요 없음)
  const lifePeriod: Period = period
  const lifeHit = !!s?.signals.some((x) => LIFE_SIG.includes(x.type))
  const go = (id: string) => { setTab('life'); setTimeout(() => { const el = document.getElementById(id); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true }) }, 0) }
  const need = s && (s.status === 'recheck' || s.status === 'check' || rs.length > 0)
  // 안내 띠: '!' + 사유마다 누를 수 있는 칸 하나(사유 이름 굵게 · 값 한 줄 · ›). 누르면 그 그림으로 간다
  const items = s ? [
    ...(s.status === 'recheck' ? [{ key: 'recheck', label: '확인 날짜', value: s.recheckDate ? `${Number(s.recheckDate.slice(5, 7))}/${Number(s.recheckDate.slice(8, 10))} 상담에서 정한 날` : '상담에서 정한 날', go: () => setTab('counsel') }] : []),
    ...s.signals.map((x, k) => { const w = WHERE[x.type]; return { key: x.type, label: x.label, value: whyValue(s, x.type, th) ?? rs[k]?.value ?? '', go: w ? () => go(w[0]) : undefined } }),
  ] : []
  const banner = s && need && items.length ? <section className="x2-alert" aria-label="확인 필요">
    <h3><span aria-hidden="true">!</span>확인 필요</h3>
    <ul>{items.map((x) => <li key={x.key}>{x.go
      ? <button type="button" onClick={x.go}><b>{x.label}</b>{x.value && <span>{x.value}</span>}<i aria-hidden="true">›</i></button>
      : <div><b>{x.label}</b>{x.value && <span>{x.value}</span>}</div>}</li>)}</ul>
  </section> : null

  return (
    <dialog ref={ref} className="x2d" aria-labelledby="x2d-name" onCancel={(e) => { e.preventDefault(); guard(onClose) }}>
      {s && <>
        <header className="x2d-head">
          <div className="x2d-who">
            <h2 id="x2d-name">{s.student.studentName}<span>{s.student.className}</span></h2>
          </div>
          <div className="x2d-nav">
            {list.length > 1 && <>
              <button type="button" disabled={i <= 0} onClick={() => guard(() => onMove(list[i - 1]))}>‹ 이전 학생</button>
              <span>{i + 1} / {list.length}</span>
              <button type="button" disabled={i < 0 || i >= list.length - 1} onClick={() => guard(() => onMove(list[i + 1]))}>다음 학생 ›</button>
            </>}
            <button type="button" className="x2d-close" aria-label="닫기" onClick={() => guard(onClose)}>✕</button>
          </div>
        </header>
        <nav className="x2d-tabs" role="tablist" aria-label="학생 기록">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={k === 'life' && lifeHit ? 'x2d-tab-flag' : undefined} onClick={() => setTab(k)}>{l}</button>)}
          {(tab === 'life' || tab === 'vision') && <PeriodSwitch value={period} onChange={(p) => { setPeriod(p); setFocus(null) }} />}
        </nav>
        <div className="x2d-body" role="tabpanel">
          {tab === 'life' && <div className="x2d-life">
            {banner}
            {(() => { const nb = newbieOf(s); if (!nb) return null
              const md2 = (x: string) => `${Number(x.slice(5, 7))}/${Number(x.slice(8, 10))}`
              return <section className="x2-alert x2-info" aria-label="새 학생">
                <h3><span aria-hidden="true">i</span>새 학생</h3>
                <ul>
                  <li><div><b>{nb.first ? `${md2(nb.first)} 첫 기록` : '아직 기록 없음'}</b>{nb.first && <span>{nb.days}일째</span>}</div></li>
                  <li><div><b>평소 비교</b><span>{nb.usualWeeks >= 1 ? `지난 ${nb.usualWeeks}주 기준` : '같은 요일 기록이 한 주 쌓이면'}</span></div></li>
                  <li><div><b>공부 시간 감소 판정</b><span>{nb.days >= 35 ? '가능' : `35일 기록이 쌓이면(${35 - nb.days}일 남음)`}</span></div></li>
                </ul>
              </section> })()}
            <AttendanceGrid s={s} />
                        <div className="x2d-stack">
              <StudyFig s={s} period={lifePeriod} th={th} />
              <PlanFig s={s} period={lifePeriod} th={th} />
              <StartFig s={s} period={lifePeriod} th={th} />
              <SubjectFig s={s} th={th} />
            </div>
          </div>}
          {tab === 'vision' && (sup.status !== 'ready'
            ? <p className={sup.status === 'error' ? 'x2-error' : 'x2-empty'} role={sup.status === 'error' ? 'alert' : 'status'}>{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : supLoadingText(sup)}</p>
            : <div className="x2d-vision">
              <VisionFig s={s} ev={ev} period={period} perHour={perHour} picked={focus?.key ?? null} onPick={(dates, label, key) => setFocus(focus?.key === key ? null : { dates, label, key, sid: s.student.studentId })} />
              <section className="x2f" aria-label="비몰입 기록">
                <header className="x2f-head"><h3>비몰입 기록</h3><p className="x2f-note">막대를 누르면 그 {period === 'd' ? '날' : '주'}의 기록만 봅니다</p></header>
                <EvidenceLog s={s} ev={ev} period={period} focus={focus} onClear={() => setFocus(null)} />
              </section>
            </div>)}
          {tab === 'report' && <ReportWithAttach key={s.student.studentId} s={s} ev={ev} asOf={s.days[s.days.length - 1].date} version={version} />}
          {tab === 'counsel' && <CareCounsel s={s} version={version} prefix="x2" onSaved={onSaved} onDirty={setDirty} className="x2d-counsel" />}
        </div>
      </>}
    </dialog>
  )
}






