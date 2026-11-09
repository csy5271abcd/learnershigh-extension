// 학생 케어 근거 사진 조회(api-contract.md §65-11). 사진 저장은 사진 관찰 서비스, 조회는 학생 케어 API가 맡는다.
// 관리 사유는 같은 captureId를 가진 사진 관찰 보고 장면에서 읽는다(reasonOf).
import { useEffect, useState } from 'react'
import type { ManagementReason } from './visionContract.ts'
import type { VisionStudent } from './visionModel.ts'

export interface EvidenceItem { evidenceId: string; serviceDate: string; captureId: string; capturedAt: string }

/** captureId → 그 사진이 속한 보고 장면의 관리 사유 */
export function reasonOf(v: VisionStudent, captureId: string): ManagementReason | null {
  for (const d of v.days) for (const e of d.doc?.facts.episodes ?? []) if (e.captureIds.includes(captureId)) return e.reason
  return null
}
export type EvidenceState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: EvidenceItem[] }

const base = '/api/admin/student-care/students'
export const evidenceSrc = (branchId: string, studentId: string, evidenceId: string) =>
  `${base}/${encodeURIComponent(studentId)}/vision-evidence/${encodeURIComponent(evidenceId)}/content?branchId=${encodeURIComponent(branchId)}`

export function useEvidence(branchId: string, studentId: string, from: string, to: string): EvidenceState {
  const key = `${branchId}|${studentId}|${from}|${to}`
  const [state, setState] = useState<{ key: string; value: EvidenceState }>({ key: '', value: { status: 'loading' } })
  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`${base}/${encodeURIComponent(studentId)}/vision-evidence?branchId=${encodeURIComponent(branchId)}&from=${from}&to=${to}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then(async (r) => { if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as { items: EvidenceItem[] } })
      .then((body) => setState({ key, value: { status: 'ready', items: body.items } }))
      .catch((e) => { if ((e as Error).name !== 'AbortError') setState({ key, value: { status: 'error' } }) })
    return () => ctrl.abort()
  }, [branchId, studentId, from, to, key])
  return state.key === key ? state.value : { status: 'loading' }
}
