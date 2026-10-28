import { useCallback, useEffect, useRef, useState } from 'react'
import { studentCareApi, diverseStudentCareApi } from './api/studentCareApi.ts'
import { httpStudentCareApi } from './api/httpStudentCareApi.ts'
import { AllHistory } from './components/AllHistory.tsx'
import { BranchWeekDashboard } from './components/weekly/BranchWeekDashboard.tsx'
import { StudentRosterOverview } from './components/weekly/StudentRosterOverview.tsx'
import { RosterStudies } from './components/weekly/RosterStudies.tsx'
import { StudentWorkspaceDialog } from './components/weekly/StudentWorkspaceDialog.tsx'
import type { CareDesignNumber } from './model/CareDesignContext.ts'
import { SettingsDialog } from './components/SettingsDialog.tsx'
import { StudentList } from './components/StudentList.tsx'
import { StudentPanel } from './components/StudentPanel.tsx'
import { monthDay } from './model/format.ts'
import { useRemote } from './model/useRemote.ts'
import './student-care.css'

/** 학습관리 › 학생 케어 (docs/specs/wangyu/features/student-care.md, docs/design/student-care-ux.md). */
export function StudentCarePage({ design = 2, displayVersion = design }: { design?: CareDesignNumber; displayVersion?: number }) {
  const preview = new URLSearchParams(window.location.search).get('preview') === '1'
  const live = design >= 5 && !preview
  const api = live ? httpStudentCareApi : design >= 5 ? diverseStudentCareApi : studentCareApi
  const branches = useRemote(live ? 'branches/live' : design >= 5 ? 'branches/diverse' : 'branches/preview', api.branches)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  // 저장 / 기준 변경이 있으면 올라간다. 목록 · 상세 · 이력이 이 값으로 다시 불러온다.
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<'students' | 'branches' | 'history'>('students')
  const [excludeWeekend, setExcludeWeekend] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  const branchId = branches.data?.some(branch => branch.branchId === selectedBranchId)
    ? selectedBranchId : branches.data?.[0]?.branchId ?? null
  const board = useRemote(branchId, () => api.board(branchId ?? ''), version)
  const reloadBranches = branches.reload
  const invalidBranch = useRef<string | null>(null)
  const recoverBranches = useCallback(() => {
    if (branchId === null || invalidBranch.current === branchId) return
    invalidBranch.current = branchId
    setSelectedBranchId(null)
    setStudentId(null)
    setWorkspaceOpen(false)
    reloadBranches()
  }, [branchId, reloadBranches])
  const missingBranch = board.status === 'error' && board.error.code === 'BRANCH_NOT_FOUND'
  useEffect(() => { if (missingBranch) recoverBranches() }, [missingBranch, recoverBranches])
  const asOf = board.data?.asOf
  const currentStudentId = studentId ?? board.data?.inAdjustment.find(student => student.recheckDue)?.studentId ?? board.data?.needsCheck[0]?.studentId ?? board.data?.students[0]?.studentId ?? null

  const refresh = useCallback(() => setVersion((value) => value + 1), [])
  const saved = useCallback((message: string) => {
    setStatus(message)
    setVersion((value) => value + 1)
  }, [])

  const selectStudent = (next: string) => {
    setStudentId(next)
    setStatus('')
    if (design === 4) { setWorkspaceOpen(true); return }
    if (window.matchMedia('(max-width: 899px)').matches) {
      requestAnimationFrame(() => document.getElementById('sc-panel')?.scrollIntoView({ block: 'start' }))
    }
  }

  return (
    <div className="sc-page">
      <header className="sc-top">
        <h1 className="sc-top__title">학생 케어 {displayVersion}</h1>
        <span className="sc-preview-tag" title={live ? '서버 API에서 조회하며 상담과 설정은 DB에 저장됩니다. 현재 로컬 서버의 학습 원본은 예시 데이터입니다.' : '미리보기용 예시 데이터입니다. 변경 사항은 새로고침하면 초기화됩니다.'}>{live ? branchId?.startsWith('demo_') ? 'API 연결 · 로컬 DB 예시' : 'API 연결 · 로컬 예시 원본' : '예시 데이터'}</span>
        <div className="sc-top__controls">
          <label className="sc-visually-hidden" htmlFor="sc-branch">
            학습관
          </label>
          <select
            id="sc-branch"
            className="sc-select"
            value={branchId ?? ''}
            disabled={!branches.data || branches.data.length === 0}
            onChange={(event) => {
              setSelectedBranchId(event.target.value)
              setStudentId(null)
              setStatus('')
              setWorkspaceOpen(false)
            }}
          >
            {branches.data?.map((branch) => (
              <option key={branch.branchId} value={branch.branchId}>
                {branch.name}
              </option>
            ))}
          </select>
          {asOf && <span className="sc-top__date">기준일 {monthDay(asOf)}</span>}
          <button
            type="button"
            className="sc-icon-button"
            aria-label="관리 기준 설정"
            title="관리 기준 설정"
            disabled={branchId === null}
            onClick={() => setSettingsOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"
              />
            </svg>
          </button>
        </div>
        <p className="sc-top__status" role="status" aria-live="polite">
          {status}
        </p>
      </header>

      <div className="sc-tabs" role="tablist" aria-label="보기">
        <button type="button" role="tab" aria-selected={tab === 'students'} className="sc-tab" onClick={() => setTab('students')}>
          학생별
        </button>
        <button type="button" role="tab" aria-selected={tab === 'branches'} className="sc-tab" onClick={() => setTab('branches')}>
          학습관별
        </button>
        <button type="button" role="tab" aria-selected={tab === 'history'} className="sc-tab" onClick={() => setTab('history')}>
          관리 이력
        </button>
      </div>

      {branches.status === 'error' ? (
        <div className="sc-state" role="alert">
          <p>불러오지 못했습니다</p>
          <button type="button" className="sc-button" onClick={branches.reload}>
            다시 시도
          </button>
        </div>
      ) : branches.status === 'success' && branches.data.length === 0 ? (
        <p className="sc-state">지점 없음</p>
      ) : tab === 'branches' ? (
        branchId && (
          <BranchWeekDashboard api={api} key={branchId} branchId={branchId} version={version} onMissingBranch={recoverBranches} onOpenStudent={(id) => {
            setTab('students')
            selectStudent(id)
          }} />
        )
      ) : tab === 'history' ? (
        branchId && (
          <AllHistory key={branchId} api={api}
            branchId={branchId}
            version={version}
            onOpenStudent={(id) => {
              setTab('students')
              selectStudent(id)
            }}
          />
        )
      ) : design >= 5 && branchId ? (
        <RosterStudies api={api} key={branchId} selectedId={studentId} branchId={branchId} version={version} design={design as 5|6|7} onSaved={saved}/>
      ) : design === 4 && branchId ? (
        <><StudentRosterOverview key={branchId} branchId={branchId} version={version} onOpenStudent={selectStudent}/>
        {workspaceOpen&&currentStudentId&&<StudentWorkspaceDialog onClose={()=>setWorkspaceOpen(false)}>
          <StudentPanel key={`${branchId}/${currentStudentId}`} branchId={branchId} studentId={currentStudentId} version={version} onSaved={saved} onStale={refresh} excludeWeekend={excludeWeekend} onExcludeWeekendChange={setExcludeWeekend}/>
        </StudentWorkspaceDialog>}</>
      ) : (
        <div className="sc-body">
          <StudentList board={board} selectedId={currentStudentId} onSelect={selectStudent} />
          <div id="sc-panel" className="sc-panel">
            {branchId && currentStudentId ? (
              <StudentPanel
                key={`${branchId}/${currentStudentId}`}
                branchId={branchId}
                studentId={currentStudentId}
                version={version}
                onSaved={saved}
                onStale={refresh}
                excludeWeekend={excludeWeekend}
                onExcludeWeekendChange={setExcludeWeekend}
              />
            ) : (
              <p className="sc-state sc-state--center">학생을 선택하세요</p>
            )}
          </div>
        </div>
      )}

      {branchId && (
        <SettingsDialog api={api}
          branchId={branchId}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => saved('관리 기준 저장')}
        />
      )}
    </div>
  )
}
