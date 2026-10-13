import { useId, useMemo, useState } from 'react'
import type { Branch } from '../model/types.ts'
import type { Remote } from '../model/useRemote.ts'
import { ErrorState, Loading, StaleError } from './StateMessage.tsx'

interface Props {
  branches: Remote<Branch[]>
  selectedId: string | null
  onSelect: (branchId: string) => void
}

/** 지점 목록. 지점을 고르면 그 지점 기준으로 케어 보드를 다시 불러온다. */
export function BranchPanel({ branches, selectedId, onSelect }: Props) {
  const id = useId()
  const [search, setSearch] = useState('')
  const all = branches.data
  const filtered = useMemo(() => (all ?? []).filter((branch) => branch.name.includes(search.trim())), [all, search])

  return (
    <nav className="sc-branches" aria-label="지점">
      <label htmlFor={`${id}-search`} className="sc-visually-hidden">
        지점 검색
      </label>
      <input
        id={`${id}-search`}
        className="sc-search"
        type="search"
        placeholder="지점 검색"
        value={search}
        disabled={all !== null && all.length === 0}
        onChange={(event) => setSearch(event.target.value)}
      />
      {branches.status === 'error' && !all && <ErrorState error={branches.error} onRetry={branches.reload} />}
      {branches.status === 'error' && all && <StaleError what="지점 목록" error={branches.error} onRetry={branches.reload} />}
      {!all && branches.status === 'loading' && <Loading />}
      {all && all.length === 0 && <p className="sc-hint">담당 지점이 없습니다.</p>}
      {all && all.length > 0 && filtered.length === 0 && <p className="sc-hint">검색한 지점이 없습니다.</p>}
      <ul className="sc-branches__list">
        {filtered.map((branch) => (
          <li key={branch.branchId}>
            <button
              type="button"
              className="sc-branch"
              aria-current={branch.branchId === selectedId ? 'true' : undefined}
              onClick={() => onSelect(branch.branchId)}
            >
              <span className="sc-branch__name">{branch.name}</span>
              <span className="sc-branch__count">학생 {branch.studentCount}명</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
