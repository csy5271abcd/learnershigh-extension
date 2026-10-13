import { useCallback, useState, type KeyboardEvent, type ReactNode } from 'react'
import { studentCareApi } from './api/studentCareApi.ts'
import { BranchPanel } from './components/BranchPanel.tsx'
import { CareBoardTab } from './components/CareBoardTab.tsx'
import { HistoryTab } from './components/HistoryTab.tsx'
import { SettingsTab } from './components/SettingsTab.tsx'
import { Empty } from './components/StateMessage.tsx'
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

const tabId = (tab: Tab) => `sc-tab-${tab}`
const panelId = (tab: Tab) => `sc-panel-${tab}`

/**
 * 콘솔 › 학습관리 › [지점]학생 케어 (docs/specs/wangyu/features/student-care.md).
 * 네 탭 패널은 처음 열 때 Mount되고 그 뒤에는 숨기기만 한다 — 입력 중인 사유 / 약속 / 메모 / 기준값이 탭을 옮겨도 남는다.
 */
export function StudentCarePage() {
  const branches = useRemote('branches', studentCareApi.branches)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')
  const [visited, setVisited] = useState<ReadonlySet<Tab>>(() => new Set<Tab>(['board']))
  const [studentId, setStudentId] = useState<string | null>(null)
  // 저장 / 결정 / 메모 / 기준값 변경이 있으면 올라간다. 보드 · 상세 · 기록 · 요약이 이 값으로 다시 불러온다.
  const [version, setVersion] = useState(0)
  const [historyFocus, setHistoryFocus] = useState(0)
  const [notice, setNotice] = useState('')

  // 지점을 고르기 전에는 첫 지점을 보여준다.
  const branchId = selectedBranchId ?? branches.data?.[0]?.branchId ?? null
  const noBranches = branches.status === 'success' && branches.data.length === 0

  const board = useRemote(branchId, () => studentCareApi.board(branchId ?? ''), version)

  const changed = useCallback((outcome: Outcome | null) => {
    setVersion((value) => value + 1)
    if (outcome) setNotice(outcome.message)
  }, [])

  const activate = (next: Tab) => {
    setTab(next)
    setVisited((previous) => (previous.has(next) ? previous : new Set(previous).add(next)))
  }

  const selectBranch = (next: string) => {
    if (next === branchId) return
    setSelectedBranchId(next)
    setStudentId(null)
    setNotice('')
  }

  const showHistory = () => {
    activate('history')
    setHistoryFocus((value) => value + 1)
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab)
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % TABS.length
        break
      case 'ArrowLeft':
        nextIndex = (index + TABS.length - 1) % TABS.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = TABS.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const next = TABS[nextIndex].id
    activate(next)
    document.getElementById(tabId(next))?.focus()
  }

  const panelContent = (item: Tab): ReactNode => {
    if (branchId === null || !visited.has(item)) return null
    switch (item) {
      case 'board':
        return (
          <CareBoardTab
            branchId={branchId}
            board={board}
            selectedStudentId={studentId}
            onSelectStudent={(next) => {
              setStudentId(next)
              setNotice('')
            }}
            version={version}
            onChanged={changed}
            onShowHistory={showHistory}
          />
        )
      case 'history':
        return <HistoryTab branchId={branchId} studentId={studentId} version={version} focusRequest={historyFocus} />
      case 'settings':
        return <SettingsTab key={branchId} branchId={branchId} onSaved={() => changed(null)} />
      case 'summary':
        return <SummaryTab branchId={branchId} version={version} />
    }
  }

  return (
    <div className="sc-page">
      <BranchPanel branches={branches} selectedId={branchId} onSelect={selectBranch} />
      <main className="sc-main">
        <div className="sc-tabs" role="tablist" aria-label="학생 케어" onKeyDown={onTabKeyDown}>
          {TABS.map((item) => (
            <button
              key={item.id}
              id={tabId(item.id)}
              type="button"
              role="tab"
              className="sc-tab"
              aria-selected={tab === item.id}
              aria-controls={panelId(item.id)}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => activate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Live region은 항상 있고 문구만 바뀐다 (처음부터 있어야 읽어준다). 닫기 버튼은 읽을 문구 밖에 둔다. */}
        <div className={notice ? 'sc-toast sc-toast--open' : 'sc-toast'}>
          <p className="sc-toast__text" role="status" aria-live="polite">
            {notice}
          </p>
          {notice && (
            <button type="button" className="sc-button sc-button--ghost" onClick={() => setNotice('')}>
              닫기
            </button>
          )}
        </div>

        {noBranches && (
          <Empty
            title="담당 지점이 없습니다"
            description="지점이 연결되면 이곳에서 지점별 학생 케어 보드를 볼 수 있습니다."
          />
        )}

        {TABS.map((item) => (
          <div
            key={item.id}
            id={panelId(item.id)}
            role="tabpanel"
            aria-labelledby={tabId(item.id)}
            className="sc-panel"
            hidden={tab !== item.id}
          >
            {panelContent(item.id)}
          </div>
        ))}
      </main>
    </div>
  )
}
