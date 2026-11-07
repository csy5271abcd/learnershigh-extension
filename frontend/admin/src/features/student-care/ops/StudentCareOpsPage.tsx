import { useEffect, useMemo, useState } from 'react'
import { httpStudentCareApi } from '../api/httpStudentCareApi.ts'
import { AllHistory } from '../components/AllHistory.tsx'
import { SettingsDialog } from '../components/SettingsDialog.tsx'
import { monthDay } from '../model/format.ts'
import { useRemote, loadFailure } from '../model/useRemote.ts'
import { buildOpsRoster, type OpsStudent } from './opsModel.ts'
import { OpsRoster } from './OpsRoster.tsx'
import { OpsDetail } from './OpsDetail.tsx'
import { OpsBranch } from './OpsBranch.tsx'
import '../student-care.css'
import './ops.css'

const api = httpStudentCareApi
const NARROW = '(max-width: 1279px)'

/** 사유 종류로 명부를 좁힌다. 판정을 바꾸지 않고 보여주는 학생만 고른다 */
const REASONS: { key: string; label: string; match: (s: OpsStudent) => boolean }[] = [
  { key: '', label: '전체 학생', match: () => true },
  { key: 'flagged', label: '상담 필요 · 확인일', match: (s) => s.status === 'check' || s.status === 'recheck' },
  { key: 'managed', label: '관리 중', match: (s) => s.status === 'managed' || s.status === 'recheck' },
  { key: 'CONSECUTIVE_ABSENCE', label: '사유: 결석', match: (s) => s.chips.some((c) => c.type === 'CONSECUTIVE_ABSENCE') },
  { key: 'STUDY_DROP', label: '사유: 학습 감소', match: (s) => s.chips.some((c) => c.type === 'STUDY_DROP') },
  { key: 'EXECUTION_GAP', label: '사유: 진행률', match: (s) => s.chips.some((c) => c.type === 'EXECUTION_GAP') },
  { key: 'START_TIME_SHIFT', label: '사유: 입실 늦어짐', match: (s) => s.chips.some((c) => c.type === 'START_TIME_SHIFT') },
  { key: 'SUBJECT_SHARE', label: '사유: 과목 비중', match: (s) => s.chips.some((c) => c.type === 'SUBJECT_SHARE') },
  { key: 'PLAN_MISSING', label: '사유: 계획 미제출', match: (s) => s.signals.some((x) => x.type === 'PLAN_MISSING') },
  { key: 'WEEKDAY_ABSENCE', label: '참고: 같은 요일 결석', match: (s) => s.weekdayAbsence !== null },
]

/** 학습관리 › 학생 케어 개선안(/student-care/ops). 기존 화면과 같은 API·판정·저장 기능을 쓰고 보여주는 방식만 바꾼다. */
export function StudentCareOpsPage() {
  const params = new URLSearchParams(window.location.search)
  const branches = useRemote('ops/branches', api.branches)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(params.get('branchId'))
  const [tab, setTab] = useState<'students' | 'branches' | 'history'>('students')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  // 좁은 화면은 명부와 상세를 한 번에 하나만 보여준다(상세가 명부 150행 아래로 밀려 오가는 거리가 길어지지 않도록)
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  const [detailOpen, setDetailOpen] = useState(false)
  useEffect(() => { const m = window.matchMedia(NARROW); const on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on) }, [])
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 학습관 집계 제외는 지점별로 페이지에 둔다(학습관 탭에서 학생을 열었다 돌아와도 유지, 지점을 바꾸면 그 지점 것만 보임)
  const [excludedByBranch, setExcludedByBranch] = useState<Record<string, Set<string>>>({})
  const branchId = branches.data?.some((b) => b.branchId === selectedBranch) ? selectedBranch : branches.data?.[0]?.branchId ?? null
  const branchName = branches.data?.find((b) => b.branchId === branchId)?.name ?? ''
  const board = useRemote(branchId && `ops/board/${branchId}`, () => api.board(branchId!), version)
  const metrics = useRemote(branchId && `ops/metrics/${branchId}`, () => api.metrics(branchId!), version)
  const settings = useRemote(branchId && `ops/settings/${branchId}`, () => api.settings(branchId!), version)
  const rows = useMemo(() => board.data && metrics.data ? buildOpsRoster(board.data, metrics.data) : null, [board.data, metrics.data])
  // 학습 시간 막대의 축은 검색과 관계없이 지점 전체 학생 기준으로 고정한다
  const axisMax = useMemo(() => rows ? Math.max(60, ...rows.map((r) => Math.max(r.week.minutes ?? 0, r.week.usualWeek ?? 0))) : 60, [rows])
  const reasonMatch = REASONS.find((x) => x.key === reason)?.match ?? (() => true)
  const shown = rows?.filter((r) => `${r.student.studentName} ${r.student.className ?? ''}`.includes(query.trim()) && reasonMatch(r)) ?? []
  const current = rows?.find((r) => r.student.studentId === selectedId) ?? rows?.find((r) => r.status !== 'normal' && r.status !== 'deferred') ?? rows?.[0] ?? null
  const saved = (message: string) => { setStatus(message); setVersion((v) => v + 1) }
  // 좁은 화면: 학생을 고르면 상세만 보이고 맨 위로, "명부로"를 누르면 명부로 돌아가 그 학생 행을 가운데에 둔다
  const select = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia(NARROW).matches) { setDetailOpen(true); requestAnimationFrame(() => window.scrollTo(0, 0)) }
  }
  const backToList = (id: string) => {
    setDetailOpen(false)
    requestAnimationFrame(() => document.querySelector(`[data-care-roster-row="${id}"]`)?.scrollIntoView({ block: 'center' }))
  }
  const openStudent = (id: string) => { setTab('students'); setQuery(''); setReason(''); select(id) }
  const failed = loadFailure(board) ? board : loadFailure(metrics) ? metrics : null
  const days = rows?.[0]?.days

  return (
    <div className="sc-page ops-page">
      <header className="sc-top">
        <h1 className="sc-top__title">학생 케어</h1>
        <div className="sc-top__controls">
          <label className="sc-visually-hidden" htmlFor="ops-branch">학습관</label>
          <select id="ops-branch" className="sc-select" value={branchId ?? ''} disabled={!branches.data?.length} onChange={(e) => { setSelectedBranch(e.target.value); setSelectedId(null); setQuery('') }}>
            {branches.data?.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
          </select>
          {board.data && <span className="sc-top__date">기준일 {monthDay(board.data.asOf)}</span>}
          <button type="button" className="sc-icon-button" aria-label="관리 기준 설정" title="관리 기준 설정" disabled={!branchId} onClick={() => setSettingsOpen(true)}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" /></svg>
          </button>
        </div>
        <p className="sc-top__status" role="status" aria-live="polite">{status}</p>
      </header>
      <div className="sc-tabbar">
        <div className="sc-tabs" role="tablist" aria-label="보기">
          {([['students', '학생별'], ['branches', '학습관별'], ['history', '관리 이력']] as const).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className="sc-tab" onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        {import.meta.env.DEV && import.meta.env.VITE_PARENT_REPORT_PREVIEW_ENABLED === 'true' && (
          <a className="sc-report-preview" href="/__preview/parent-report" target="_blank" rel="noopener noreferrer">학부모 리포트 미리보기 <span aria-hidden="true">↗</span></a>
        )}
      </div>

      {loadFailure(branches) ? <div className="sc-state" role="alert"><p>학습관을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={branches.reload}>다시 시도</button></div>
        : branches.data && branches.data.length === 0 ? <p className="sc-state">등록된 학습관이 없습니다.</p>
        : failed ? <div className="sc-state" role="alert"><p>학생 기록을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={failed.reload}>다시 시도</button></div>
        : !rows || !branchId ? <p className="sc-state" role="status">불러오는 중</p>
        : tab === 'history' ? <AllHistory key={branchId} api={api} branchId={branchId} version={version} onOpenStudent={openStudent} />
        : tab === 'branches' ? <OpsBranch key={branchId} rows={rows} branchName={branchName} studyDropPercent={settings.data?.studyDropPercent ?? 30} startShiftMinutes={settings.data?.startShiftMinutes ?? 60} excluded={excludedByBranch[branchId] ?? new Set()} onExcludedChange={(next) => setExcludedByBranch({ ...excludedByBranch, [branchId]: next })} onOpenStudent={openStudent} />
        : (
          <div className="ops-split">
            {!(narrow && detailOpen) && <section className="ops-list" aria-label="전체 학생">
              <div className="ops-list-head">
                <p><b>{rows.length}명</b> 중 상담 필요 <b className="ops-down">{rows.filter((r) => r.status === 'check').length}명</b> · 관리 중 {rows.filter((r) => r.status === 'managed' || r.status === 'recheck').length}명{days && <span className="ops-muted"> · 최근 7일 {days[0].date.slice(5).replace('-', '/')}–{days[6].date.slice(5).replace('-', '/')}</span>}</p>
                <span className="ops-list-tools">
                  <select className="sc-select" aria-label="사유로 좁히기" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((x) => <option key={x.key} value={x.key}>{x.label}{rows ? ` ${rows.filter(x.match).length}` : ''}</option>)}</select>
                  <input className="sc-input" aria-label="학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
                </span>
              </div>
              {shown.length ? <OpsRoster rows={shown} axisMax={axisMax} selectedId={current?.student.studentId ?? null} onSelect={select} /> : <p className="sc-state">조건에 맞는 학생이 없습니다.</p>}
            </section>}
            {current && (!narrow || detailOpen) && <OpsDetail key={current.student.studentId} api={api} s={current} version={version} startShiftMinutes={settings.data?.startShiftMinutes ?? 60} onSaved={saved} onBack={() => backToList(current.student.studentId)} />}
          </div>
        )}
      {branchId && <SettingsDialog api={api} branchId={branchId} open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={() => saved('관리 기준 저장')} />}
    </div>
  )
}
