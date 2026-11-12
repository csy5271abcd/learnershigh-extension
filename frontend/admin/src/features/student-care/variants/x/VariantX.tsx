// 학생 케어 X(docs/design/ops-redesign/plan-yxz.md): 원본 서비스(러너스하이 StudyLab 관리 콘솔) 스타일 일치형.
// 원본 "학생학습계획관리"와 같은 짜임: 왼쪽 학생 표(NO·반·학생명·상태) → 오른쪽 밑줄 탭. 색·글꼴은 원본 콘솔(Metronic 8 토큰, Spoqa Han Sans Neo)을 따른다.
// 최종 시안: 그림·기록·출결 칸은 X 전용 코드(xCharts·xVision·xEvidence·xAttendance·xSwitch)다. 다른 시안과 나누지 않는다.
// 출결·계획 제출은 탭 위에 늘 보이고, 탭마다 같은 짜임(최근 7일 그림 + 35일 또는 과목 그림)이다.
// 그림마다 '최근 7일 ↔ 최근 5주'를 바꿔 본다. 공부 A1↔A7, 입실 B6↔B7, 계획 C1↔C7 + 과목별 C6, 사진 D6 종류별 주간 건수 + 기록 전체 보기(근거 사진).
import { useMemo, useState, type ReactNode } from 'react'
import { SettingsDialog } from '../../components/SettingsDialog.tsx'
import { monthDay } from '../../model/format.ts'
import { careApi, useCareData } from '../shared/useCareData.ts'
import { TipHost } from '../z/Tip.tsx'
import { GROUP_LABEL } from '../z/zModel.ts'
import { supLoadingText, useSupervisorEvents, type SupEvent } from '../supervisor/supervisorClient.ts'
import type { NotationProps } from '../notation/kit.tsx'
import { AttendanceChips } from './xAttendance.tsx'
import { CareCounsel } from '../notation/CareCounsel.tsx'
import { VisionDayBars, VisionWeekBars } from './xVision.tsx'
import { ViewSwitch, type Period } from './xSwitch.tsx'
import { PlanPair, StartPair, StudyPair, SubjectPair } from './xCharts.tsx'
import { EvidenceLog, type VisionFocus } from './xEvidence.tsx'
import { XBranch } from './xBranch.tsx'
import '../../student-care.css'
import './xCharts.css'
import './x.css'

type Tab = 'study' | 'start' | 'plan' | 'vision' | 'counsel'
const TABS: [Tab, string][] = [['study', '공부 시간'], ['start', '입실 시각'], ['plan', '계획'], ['vision', '사진 관찰'], ['counsel', '상담 기록']]
const ORDER = { recheck: 0, check: 1, managed: 2, normal: 3, deferred: 4 } as const
// 빨강은 점검일이 된 학생에게만. 확인할 학생은 검정 글자(대부분이 확인할 학생이라 모두 빨강이면 경고 뜻이 사라진다)
// 서버 사유가 있는 지표의 탭은 글자색을 바꾼다(R02). 사진 관찰은 서버 판정이 없어 칠하지 않는다
const TAB_SIG: Partial<Record<Tab, string[]>> = { study: ['STUDY_DROP'], start: ['START_TIME_SHIFT'], plan: ['EXECUTION_GAP', 'SUBJECT_SHARE', 'PLAN_MISSING'] }
const absentOf = (r: { days: { attendance: string }[] }) => r.days.filter((d) => d.attendance === 'absent').length
const BADGE = { recheck: 'x-badge-danger', check: 'x-badge-ink', managed: 'x-badge-primary', normal: 'x-badge-success', deferred: 'x-badge-muted' } as const

/** 탭 안 그림 한 칸: 제목 + 그림. 탭마다 '최근 7일 · 35일(또는 과목)' 두 칸을 같은 짜임으로 둔다 */
function Fig({ t, children }: { t: string; children: ReactNode }) {
  return <section className="x-fig" aria-label={t}><h4>{t}</h4>{children}</section>
}
function Box({ children }: { children: ReactNode }) {
  return <div className="x-fig">{children}</div>
}

export function VariantX() {
  const data = useCareData('x')
  // 급한 순: 상태 → 사유 수 → 결석 일수 → 이름(가나다순만으로는 6일 결석한 학생이 아래로 밀린다)
  const rows = useMemo(() => [...(data.rows ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.signals.length - a.signals.length || absentOf(b) - absentOf(a) || a.student.studentName.localeCompare(b.student.studentName, 'ko')), [data.rows])
  const [view, setView] = useState<'student' | 'branch'>('student')
  const [reason, setReason] = useState('')
  const [focus, setFocus] = useState<VisionFocus | null>(null)
  const ids = useMemo(() => rows.map((r) => r.student.studentId), [rows])
  const sup = useSupervisorEvents(ids)
  const [picked, setPicked] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('study')
  // 일간·주간은 탭을 옮겨도 유지한다
  const [period, setPeriod] = useState<Period>('d')
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [, setDirty] = useState(false)
  const s = rows.find((r) => r.student.studentId === picked) ?? rows[0]
  // 상세는 목록과 함께 스크롤한다(고정하면 긴 탭의 아래가 가려진다). 상세 머리가 화면 위로 지나갔으면 고른 뒤 상세로 올린다
  const pick = (id: string) => { setPicked(id); setFocus(null); setTimeout(() => { const el = document.querySelector('.x-panel'); if (el && el.getBoundingClientRect().top < 60) el.scrollIntoView({ block: 'start' }) }, 0) }
  const shown = rows.filter((r) => `${r.student.studentName} ${r.student.className ?? ''}`.includes(query.trim()) && (!reason || r.signals.some((x) => x.label === reason)))
  // 거르기 목록: 서버 사유 이름과 인원
  const reasons = useMemo(() => { const m = new Map<string, number>(); for (const r of rows) for (const x of r.signals) m.set(x.label, (m.get(x.label) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]) }, [rows])
  const PAGE = 20, pages = Math.ceil(shown.length / PAGE)
  const [page, setPage] = useState(0)
  const pageAt = Math.min(page, Math.max(0, pages - 1))

  let panel: ReactNode = null
  if (s && !shown.includes(s)) panel = <section className="x-panel x-muted-panel"><p className="x-muted">검색 결과에 없는 학생입니다. 목록에서 학생을 고르세요.</p></section>
  else if (s) {
    const evAll = sup.status === 'ready' ? sup.byStudent : new Map<string, SupEvent[]>()
    const p: NotationProps = { s, rows, ev: evAll.get(s.student.studentId) ?? [], evAll, th: { drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate } }
    const vision = (node: ReactNode) => sup.status === 'ready' ? node : <p className={sup.status === 'error' ? 'x-error' : 'x-muted'} role={sup.status === 'error' ? 'alert' : 'status'}>{sup.status === 'error' ? '사진 관찰 서버에 연결하지 못했습니다' : supLoadingText(sup)}</p>
    const onPick = (dates: string[], kind: VisionFocus['kind'], label: string) => setFocus({ dates, kind, label })
    const pickedKey = focus ? `${focus.kind}:${focus.dates[0]}` : null
    const content: Record<Tab, ReactNode> = {
      study: <Box><ViewSwitch value={period} onChange={setPeriod} title="날짜별 공부 시간 · 같은 요일 평소와" titleW="주별 공부 시간 · 지난 4주 평균과" daily={<StudyPair {...p} period="d" />} weekly={<StudyPair {...p} period="w" />} /></Box>,
      start: <Box><ViewSwitch value={period} onChange={setPeriod} title="날짜별 입실 시각 · 같은 요일 평소와" titleW="주별 평균 입실 시각 · 평소와" daily={<StartPair {...p} period="d" />} weekly={<StartPair {...p} period="w" />} /></Box>,
      plan: <div className="x-pair"><Box><ViewSwitch value={period} onChange={setPeriod} title="날짜별 계획과 실제" titleW="주별 계획과 실제" daily={<PlanPair {...p} period="d" />} weekly={<PlanPair {...p} period="w" />} /></Box><Fig t="과목별 계획과 실제 · 최근 7일"><SubjectPair {...p} /></Fig></div>,
      vision: vision(<div className="x-stack"><Box><ViewSwitch value={period} onChange={(v) => { setPeriod(v); setFocus(null) }} title="날짜별 비몰입 건수" titleW="주별 비몰입 건수" daily={<VisionDayBars {...p} onPick={onPick} picked={pickedKey} />} weekly={<VisionWeekBars {...p} onPick={onPick} picked={pickedKey} />} /></Box><Fig t="비몰입 기록"><EvidenceLog s={s} ev={p.ev} period={period} focus={focus} onClear={() => setFocus(null)} /></Fig></div>),
      counsel: <CareCounsel s={s} version={data.version} prefix="x" onSaved={data.saved} onDirty={setDirty} className="x-counsel" />,
    }
    panel = (
      <section className="x-panel" aria-labelledby="x-name">
        <header className="x-panel-head">
          <h2 id="x-name">{s.student.studentName} <span>{s.student.className}</span></h2>
          {s.signals.length > 0 && <p>{s.signals.map((x) => x.label).join(' · ')}</p>}
        </header>
        <div className="x-att"><AttendanceChips s={s} /></div>
        <nav className="x-tabs" role="tablist" aria-label="학생 기록">
          {TABS.map(([k, l]) => { const hit = (TAB_SIG[k] ?? []).some((t) => s.signals.some((x) => x.type === t)); return <button key={k} type="button" role="tab" aria-selected={tab === k} className={hit ? 'x-tab-flag' : undefined} onClick={() => setTab(k)}>{l}</button> })}
        </nav>
        <div className="x-tab-body" role="tabpanel">{content[tab]}</div>
      </section>
    )
  }

  return (
    <TipHost>
      <div className="x-page">
        <header className="x-top">
          <div><h1>학생 케어 X</h1><p>학생관리 - 학생 케어</p></div>
          <div className="x-top-controls">
            <select aria-label="학습관" value={data.branchId ?? ''} disabled={!data.branches.data?.length} onChange={(e) => data.selectBranch(e.target.value)}>
              {data.branches.data?.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
            </select>
            {data.asOf && <span>기준일 {monthDay(data.asOf)}</span>}
            <button type="button" className="x-btn" disabled={!data.branchId} onClick={() => setSettingsOpen(true)}>관리 기준</button>
          </div>
          <p className="sc-visually-hidden" role="status" aria-live="polite">{data.status}</p>
        </header>
        <nav className="x-views" role="tablist" aria-label="보기">
          <button type="button" role="tab" aria-selected={view === 'student'} onClick={() => setView('student')}>학생별</button>
          <button type="button" role="tab" aria-selected={view === 'branch'} onClick={() => setView('branch')}>학습관별</button>
        </nav>
        {data.failed ? <div className="x-card" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="x-btn" onClick={data.failed.reload}>다시 시도</button></div>
          : !data.rows ? <p className="x-card" role="status">불러오는 중</p>
          : view === 'branch' ? <XBranch rows={rows} sup={sup} th={{ drop: data.studyDropPercent, shift: data.startShiftMinutes, rate: data.executionRate }} onStudent={(id) => { setView('student'); setReason(''); setQuery(''); pick(id) }} />
          : <div className="x-body">
            <section className="x-list" aria-label="학생 목록">
              <div className="x-list-tools">
                <input className="x-search" type="search" placeholder="검색" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} aria-label="학생 검색" />
                <select aria-label="관리 사유로 거르기" value={reason} onChange={(e) => { setReason(e.target.value); setPage(0) }}>
                  <option value="">관리 사유 전체 ({rows.length}명)</option>
                  {reasons.map(([l, n]) => <option key={l} value={l}>{l} ({n}명)</option>)}
                </select>
              </div>
              <table>
                <thead><tr><th>NO.</th><th>학생명</th><th>관리 사유</th></tr></thead>
                <tbody>
                  {shown.slice(pageAt * PAGE, pageAt * PAGE + PAGE).map((r, i) => <tr key={r.student.studentId} className={r === s ? 'x-on' : undefined} tabIndex={0} onClick={() => pick(r.student.studentId)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r.student.studentId) } }} aria-selected={r === s}>
                    <td>{pageAt * PAGE + i + 1}</td><td>{r.student.studentName}<span className="x-cls">{r.student.className}</span></td><td><span className={`x-badge ${BADGE[r.status]}`}>{r.signals.length ? r.signals.map((x) => x.label).join(' · ') : GROUP_LABEL[r.status]}</span></td>
                  </tr>)}
                </tbody>
              </table>
              {!shown.length && <p className="x-muted">{reason ? '이 사유의 학생이 없습니다' : '검색 결과 없음'}</p>}
              {/* 원본 콘솔처럼 쪽 나누기(20명씩). 목록이 길어 오른쪽 상세 아래가 비지 않게 */}
              {pages > 1 && <nav className="x-pager" aria-label="목록 쪽">{Array.from({ length: pages }, (_, k) => <button key={k} type="button" aria-current={k === pageAt ? 'page' : undefined} onClick={() => setPage(k)}>{k + 1}</button>)}</nav>}
            </section>
            {panel}
          </div>}
        {data.branchId && <SettingsDialog api={careApi} branchId={data.branchId} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => data.saved('관리 기준 저장')} />}
      </div>
    </TipHost>
  )
}

