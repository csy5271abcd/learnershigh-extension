import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import type { ApiError } from './api/apiClient.ts'
import { studentCareApi } from './api/studentCareApi.ts'
import { BranchPanel } from './components/BranchPanel.tsx'
import { CareBoardTab } from './components/CareBoardTab.tsx'
import { HistoryTab } from './components/HistoryTab.tsx'
import { SettingsTab } from './components/SettingsTab.tsx'
import { Empty } from './components/StateMessage.tsx'
import { SummaryTab } from './components/SummaryTab.tsx'
import { staleMessage, staysAtField } from './model/conflicts.ts'
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
  const [alert, setAlert] = useState('')
  const [alertFocus, setAlertFocus] = useState(0)
  const alertRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // 지점을 고르기 전에는 첫 지점을 보여준다.
  const branchId = selectedBranchId ?? branches.data?.[0]?.branchId ?? null
  const noBranches = branches.status === 'success' && branches.data.length === 0

  const board = useRemote(branchId, () => studentCareApi.board(branchId ?? ''), version)

  const changed = useCallback((outcome: Outcome | null) => {
    setVersion((value) => value + 1)
    setAlert('')
    if (outcome) setNotice(outcome.message)
  }, [])

  // 보던 상태가 서버와 달라졌다(409 / 재점검일 422): 보드 · 상세 · 기록 · 요약을 모두 다시 불러오고,
  // 다시 불러온 뒤 버튼이 사라져도 이유를 볼 수 있게 페이지 안내로 남긴다.
  const stale = useCallback((error: ApiError) => {
    setVersion((value) => value + 1)
    setNotice('')
    setAlert(staleMessage(error))
    // 재점검일 오류는 그 칸으로 Focus가 가고, 나머지는 안내로 옮긴다 (누른 버튼이 사라질 수 있으므로).
    if (!staysAtField(error)) setAlertFocus((value) => value + 1)
  }, [])

  const refresh = useCallback(() => setVersion((value) => value + 1), [])

  useLayoutEffect(() => {
    if (alertFocus > 0) alertRef.current?.focus()
  }, [alertFocus])

  /** 안내 / 알림 안으로 들어오기 직전에 Focus가 있던 곳. 닫으면 그곳으로 돌려준다. */
  const rememberFocus = (event: FocusEvent<HTMLElement>) => {
    const from = event.relatedTarget
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) returnFocus.current = from
  }

  const restoreFocus = () => {
    const visible = (element: HTMLElement | null) => element?.isConnected && !element.closest('[hidden]')
    const remembered = returnFocus.current
    returnFocus.current = null
    // 돌아갈 곳이 사라졌으면 상세 제목, 그것도 없으면 지금 탭.
    const heading = document.getElementById('sc-detail-name')
    const target = visible(remembered) ? remembered : visible(heading) ? heading : document.getElementById(tabId(tab))
    target?.focus()
  }

  const closeNotice = () => {
    restoreFocus()
    setNotice('')
  }

  const closeAlert = () => {
    restoreFocus()
    setAlert('')
  }

  const activate = (next: Tab) => {
    setTab(next)
    setVisited((previous) => (previous.has(next) ? previous : new Set(previous).add(next)))
  }

  const selectBranch = (next: string) => {
    if (next === branchId) return
    setSelectedBranchId(next)
    setStudentId(null)
    setNotice('')
    setAlert('')
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
              setAlert('')
            }}
            version={version}
            onChanged={changed}
            onStale={stale}
            onRefresh={refresh}
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
        <div className={notice ? 'sc-toast sc-toast--open' : 'sc-toast'} onFocus={rememberFocus}>
          <p className="sc-toast__text" role="status" aria-live="polite">
            {notice}
          </p>
          {notice && (
            <button type="button" className="sc-button sc-button--ghost" onClick={closeNotice}>
              닫기
            </button>
          )}
        </div>

        {alert && (
          <div
            ref={alertRef}
            className="sc-page-alert"
            role="alert"
            tabIndex={-1}
            aria-labelledby="sc-page-alert-text"
            onFocus={rememberFocus}
          >
            <p id="sc-page-alert-text" className="sc-page-alert__text">
              {alert}
            </p>
            <button type="button" className="sc-button sc-button--ghost" onClick={closeAlert}>
              닫기
            </button>
          </div>
        )}

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
            // 기록 / 요약 패널은 Focus 받을 요소가 없을 수 있어 패널 자체로 Tab 이동이 닿게 한다.
            tabIndex={item.id === 'history' || item.id === 'summary' ? 0 : undefined}
            hidden={tab !== item.id}
          >
            {panelContent(item.id)}
          </div>
        ))}
      </main>
    </div>
  )
}
