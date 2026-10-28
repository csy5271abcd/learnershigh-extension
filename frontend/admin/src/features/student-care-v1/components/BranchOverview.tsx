import { studentCareApi } from '../api/studentCareApi.ts'
import type { Branch, CareBoard, SignalType } from '../model/types.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'

interface Props {
  branches: Branch[]
  version: number
  onOpenBranch: (branchId: string) => void
}

const SIGNAL_ORDER: SignalType[] = [
  'CONSECUTIVE_ABSENCE',
  'STUDY_DROP',
  'START_TIME_SHIFT',
  'EXECUTION_GAP',
  'SUBJECT_SHARE',
  'PLAN_MISSING',
]

/** 학습관별: 지점마다 특이사항 · 관리 중 · 기록 부족 학생 수와 특이사항 종류별 분포. 기존 board API를 지점마다 부른다. */
export function BranchOverview({ branches, version, onOpenBranch }: Props) {
  const key = branches.map((branch) => branch.branchId).join(',')
  const boards = useRemote(
    `branches-overview/${key}`,
    () => Promise.all(branches.map((branch) => studentCareApi.board(branch.branchId))),
    version,
  )

  if (loadFailure(boards)) {
    return (
      <div className="sc-state" role="alert">
        <p>불러오지 못했습니다</p>
        <button type="button" className="sc-button" onClick={boards.reload}>
          다시 시도
        </button>
      </div>
    )
  }
  const data = boards.data
  if (!data) return <p className="sc-state">불러오는 중</p>

  return (
    <ul className="sc-branches">
      {branches.map((branch, index) => (
        <BranchCard key={branch.branchId} branch={branch} board={data[index]} onOpen={() => onOpenBranch(branch.branchId)} />
      ))}
    </ul>
  )
}

function BranchCard({ branch, board, onOpen }: { branch: Branch; board: CareBoard; onOpen: () => void }) {
  const flagged = board.needsCheck.length
  const managing = board.inAdjustment.length
  const deferred = board.deferred.length
  const calm = Math.max(branch.studentCount - flagged - managing - deferred, 0)
  const counts = new Map<SignalType, { label: string; count: number }>()
  for (const card of [...board.needsCheck, ...board.inAdjustment]) {
    for (const signal of card.signals) {
      const current = counts.get(signal.type)
      counts.set(signal.type, { label: signal.label, count: (current?.count ?? 0) + 1 })
    }
  }
  const rows = SIGNAL_ORDER.flatMap((type) => {
    const row = counts.get(type)
    return row ? [{ type, ...row }] : []
  })
  const max = Math.max(...rows.map((row) => row.count), 1)
  const share = (value: number) => (branch.studentCount ? Math.round((value / branch.studentCount) * 100) : 0)

  return (
    <li className="sc-branch">
      <div className="sc-branch__head">
        <h3 className="sc-branch__name">{branch.name}</h3>
        <span className="sc-branch__total">학생 {branch.studentCount}명</span>
        <button type="button" className="sc-fold" onClick={onOpen}>
          학생별로 보기 →
        </button>
      </div>

      <dl className="sc-branch__stats">
        <div className="sc-branch__stat sc-branch__stat--flag">
          <dt>특이사항</dt>
          <dd>
            {flagged}명 <span>{share(flagged)}%</span>
          </dd>
        </div>
        <div className="sc-branch__stat">
          <dt>관리 중</dt>
          <dd>
            {managing}명 <span>{share(managing)}%</span>
          </dd>
        </div>
        <div className="sc-branch__stat">
          <dt>기록 부족</dt>
          <dd>
            {deferred}명 <span>{share(deferred)}%</span>
          </dd>
        </div>
        <div className="sc-branch__stat">
          <dt>특이사항 없음</dt>
          <dd>
            {calm}명 <span>{share(calm)}%</span>
          </dd>
        </div>
      </dl>

      <div className="sc-branch__mix" aria-hidden="true">
        <span className="sc-branch__seg sc-branch__seg--flag" style={{ flexGrow: flagged }} />
        <span className="sc-branch__seg sc-branch__seg--manage" style={{ flexGrow: managing }} />
        <span className="sc-branch__seg sc-branch__seg--defer" style={{ flexGrow: deferred }} />
        <span className="sc-branch__seg" style={{ flexGrow: calm }} />
      </div>

      <h4 className="sc-overview__group">특이사항 종류</h4>
      {rows.length === 0 ? (
        <p className="sc-metric__usual">특이사항 없음</p>
      ) : (
        <ul className="sc-branch__signals">
          {rows.map((row) => (
            <li key={row.type} className="sc-branch__signal">
              <span className="sc-branch__signal-label">{row.label}</span>
              <span className="sc-daily__track">
                <span className="sc-daily__bar sc-branch__signal-bar" style={{ width: `${(row.count / max) * 100}%` }} />
              </span>
              <span className="sc-branch__signal-count">{row.count}명</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
