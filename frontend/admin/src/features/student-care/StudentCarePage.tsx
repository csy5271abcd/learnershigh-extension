import { useCallback, useState, type KeyboardEvent } from 'react'
import { studentCareApi } from './api/studentCareApi.ts'
import { BranchPanel } from './components/BranchPanel.tsx'
import { CareBoardTab } from './components/CareBoardTab.tsx'
import { HistoryTab } from './components/HistoryTab.tsx'
import { SettingsTab } from './components/SettingsTab.tsx'
import { SummaryTab } from './components/SummaryTab.tsx'
import type { Outcome } from './model/outcome.ts'
import { useRemote } from './model/useRemote.ts'
import './student-care.css'

type Tab = 'board' | 'history' | 'settings' | 'summary'

const TABS: { id: Tab; label: string }[] = [
  { id: 'board', label: '케어 보드' },
  { id: 'history', label: '학생 기록' },
  { id: 'settings', label: '기준값' },
  { id: 'summary', label: '지점 요약' },
]

/** 콘솔 › 학습관리 › [지점]학생 케어 (docs/specs/wangyu/features/student-care.md). */
export function StudentCarePage() {
  const branches = useRemote('branches', studentCareApi.branches)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  // 지점을 고르기 전에는 첫 지점을 보여준다.
  const branchId = selectedBranchId ?? branches.data?.[0]?.branchId ?? null

  const board = useRemote(branchId, () => studentCareApi.board(branchId ?? ''))
  const reloadBoard = board.reload

  const changed = useCallback(
    (outcome: Outcome | null) => {
      setVersion((value) => value + 1)
      reloadBoard()
      if (outcome) {
        setNotice(outcome.message)
        if (!outcome.keepSelection) setStudentId(null)
      }
    },
    [reloadBoard],
  )

  const selectBranch = (next: string) => {
    if (next === branchId) return
    setSelectedBranchId(next)
    setStudentId(null)
    setNotice(null)
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const index = TABS.findIndex((item) => item.id === tab)
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setTab(next.id)
    document.getElementById(`sc-tab-${next.id}`)?.focus()
  }

  return (
    <div className="sc-page">
      <BranchPanel branches={branches} selectedId={branchId} onSelect={selectBranch} />
      <main className="sc-main">
        <div className="sc-tabs" role="tablist" aria-label="학생 케어" onKeyDown={onTabKeyDown}>
          {TABS.map((item) => (
            <button
              key={item.id}
              id={`sc-tab-${item.id}`}
              type="button"
              role="tab"
              className="sc-tab"
              aria-selected={tab === item.id}
              aria-controls={`sc-panel-${item.id}`}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="sc-toast" role="status">
            <span>{notice}</span>
            <button type="button" className="sc-button sc-button--ghost" onClick={() => setNotice(null)}>
              닫기
            </button>
          </div>
        )}

        <div id={`sc-panel-${tab}`} role="tabpanel" aria-labelledby={`sc-tab-${tab}`} className="sc-panel">
          {branchId === null ? null : tab === 'board' ? (
            <CareBoardTab
              branchId={branchId}
              board={board}
              selectedStudentId={studentId}
              onSelectStudent={(next) => {
                setStudentId(next)
                setNotice(null)
              }}
              version={version}
              onChanged={changed}
            />
          ) : tab === 'history' ? (
            <HistoryTab branchId={branchId} studentId={studentId} />
          ) : tab === 'settings' ? (
            <SettingsTab key={branchId} branchId={branchId} onSaved={() => changed(null)} />
          ) : (
            <SummaryTab branchId={branchId} version={version} />
          )}
        </div>
      </main>
    </div>
  )
}
