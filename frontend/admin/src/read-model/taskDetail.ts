import type { AdminTask, AdminTaskVersion, RevisionDiffBlock, TaskReview } from '../fixtures/types.ts'
import type { AdminState } from '../store/adminStore.ts'

/*
 * Task 상세 Read Model (Feedback Review LEFT · Admin Task Inspector가 같이 쓴다)
 * Version · 검토(Feedback) · 과정 자료는 같은 Canonical Entity를 조합할 뿐 복사본을 만들지 않는다.
 */

export interface VersionView {
  version: AdminTaskVersion
  label: string
  review: TaskReview | null
}

export interface TaskDetail {
  task: AdminTask
  versions: VersionView[]
  /** 지금 공용 Queue에서 검토를 기다리는 Version (없으면 null) */
  waitingVersionId: string | null
  /** 비교할 수 있는 Version 짝 (앞 Version → 뒤 Version) */
  pairs: { from: VersionView; to: VersionView }[]
}

export function buildTaskDetail(state: AdminState, taskId: string): TaskDetail | null {
  const task = state.tasks.find((item) => item.taskId === taskId)
  if (!task) return null
  const versions = (task.versions ?? []).map((version) => ({
    version,
    label: `V${version.number}`,
    review: state.reviews.find((item) => item.versionId === version.versionId) ?? null,
  }))
  const waiting = versions.find((item) => item.review && !item.review.delivery)
  const pairs = versions.flatMap((from, index) => versions.slice(index + 1).map((to) => ({ from, to })))
  return { task, versions, waitingVersionId: waiting?.version.versionId ?? null, pairs }
}

/** Student Fixture에 있는 Version 사이 내용 비교 (의미 단위 Block). 없으면 null */
export const fixtureDiff = (task: AdminTask, fromVersionId: string, toVersionId: string) =>
  task.revisionDiffs?.find((item) => item.fromVersionId === fromVersionId && item.toVersionId === toVersionId) ?? null

/**
 * 실제 Text 원본 두 개의 줄 단위 비교 (LCS). 원본이 Text일 때만 쓴다. (Office · PDF Binary는 비교하지 않는다)
 * 붙어 있는 삭제 + 추가 한 쌍은 "변경"으로 묶는다.
 */
export function lineDiff(beforeText: string, afterText: string): RevisionDiffBlock[] {
  const a = beforeText.split(/\r?\n/).filter((line) => line.trim() !== '')
  const b = afterText.split(/\r?\n/).filter((line) => line.trim() !== '')
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
  const raw: RevisionDiffBlock[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      raw.push({ kind: 'same', text: a[i] })
      i += 1
      j += 1
    } else if (j < b.length && (i >= a.length || table[i][j + 1] >= table[i + 1][j])) {
      raw.push({ kind: 'added', after: b[j] })
      j += 1
    } else {
      raw.push({ kind: 'removed', before: a[i] })
      i += 1
    }
  }
  const blocks: RevisionDiffBlock[] = []
  for (let index = 0; index < raw.length; index += 1) {
    const current = raw[index]
    const next = raw[index + 1]
    if (current.kind === 'removed' && next?.kind === 'added') {
      blocks.push({ kind: 'changed', before: current.before, after: next.after })
      index += 1
    } else if (current.kind === 'added' && next?.kind === 'removed') {
      blocks.push({ kind: 'changed', before: next.before, after: current.after })
      index += 1
    } else blocks.push(current)
  }
  return blocks
}

export const isTextBacked = (version: AdminTaskVersion) => Boolean(version.file && /\.(txt|md)$/i.test(version.fileName))
