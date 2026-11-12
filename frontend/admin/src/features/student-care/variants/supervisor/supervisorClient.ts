// 이미지 인식 감독관 API(runners_hi_vision_ai supervisor-api, packages/contracts/src/supervisor.ts)에서 학생별 비몰입 이벤트와 근거 사진을 읽는다.
// 판정(휴대폰 사용·엎드림·자리 비움, 지속 시간 기준)은 그 서버가 하고, 학생 케어는 날짜별로 모아 보여 주기만 한다.
// 개발 환경: vite 프록시 /supervisor-api → /api/supervisor, 감독관 토큰은 .env.local(SUPERVISOR_DEV_TOKEN). 화면에 로그인을 두지 않는다.
import { useEffect, useState } from 'react'

export type SupBehavior = 'ABSENCE' | 'LYING_DOWN' | 'PHONE_USAGE'
export const SUP_BEHAVIORS: SupBehavior[] = ['PHONE_USAGE', 'LYING_DOWN', 'ABSENCE']
// 감독관 계약(BEHAVIORS)에는 AMBIGUOUS(고개 숙임·손 미검출)도 있지만 단독으로 비몰입을 확정하지 않아 이벤트에 오지 않는다. 혹시 와도 아래에서 거른다(2026-11-12 계약 대조)
export const SUP_LABEL: Record<SupBehavior, string> = { PHONE_USAGE: '휴대폰 사용', LYING_DOWN: '엎드림', ABSENCE: '자리 비움' }
export type EvidenceType = 'START' | 'MIDDLE' | 'CONFIRMATION'
export const EVIDENCE_LABEL: Record<EvidenceType, string> = { START: '처음 보임', MIDDLE: '중간', CONFIRMATION: '비몰입 확정' }

export interface SupEvidence { selectionType: EvidenceType; imageRef: string; capturedAt: string | null; url: string }
export interface SupEvent { eventId: number; reason: SupBehavior; startedAt: string; confirmedAt: string; endedAt: string | null; images: SupEvidence[] }

/** 학생 케어 학생 ↔ 감독관 학생. 두 서비스가 공동 DB로 합쳐지기 전까지의 개발용 대응(시드와 같은 규칙) */
export const supervisorIdOf = (careStudentId: string) => 1000 + Number(careStudentId.replace(/\D/g, ''))
export const evidenceSrc = (url: string) => url.replace(/^\/api\/supervisor/, '/supervisor-api')

const KST = 9 * 60
const minutesKst = (iso: string) => { const t = new Date(iso).getTime() / 60000 + KST; return t }
/** 이벤트가 속한 학습일(한국 시각). 학습관은 자정을 넘겨 운영하므로 새벽 5시 전 이벤트는 전날 학습일로 센다(밤 11시 입실 학생의 0시 이후 비몰입이 다음 날로 넘어가지 않게) */
const DAY_START = 5 * 60
export const eventDate = (e: SupEvent) => new Date((minutesKst(e.startedAt) - DAY_START) * 60000).toISOString().slice(0, 10)
/** 하루 안의 시작 분(한국 시각, 0–1439) */
export const eventStartMinute = (e: SupEvent) => Math.floor(minutesKst(e.startedAt) % 1440)
/** 비몰입이 이어진 시간(초). 끝나지 않았으면 확정 시각까지 */
export const eventSeconds = (e: SupEvent) => Math.max(0, (new Date(e.endedAt ?? e.confirmedAt).getTime() - new Date(e.startedAt).getTime()) / 1000)

export type SupState = { status: 'loading'; done?: number; total?: number } | { status: 'error' } | { status: 'ready'; byStudent: Map<string, SupEvent[]> }

const cache = new Map<string, Promise<SupEvent[]>>()
function fetchEvents(careId: string): Promise<SupEvent[]> {
  let p = cache.get(careId)
  if (!p) {
    p = fetch(`/supervisor-api/students/${supervisorIdOf(careId)}/events?limit=200`, { headers: { Accept: 'application/json' } })
      .then(async (r) => { if (r.status === 404) return []; if (!r.ok) throw new Error(String(r.status)); return ((await r.json()) as { reason: string }[]).filter((e): e is SupEvent => (SUP_BEHAVIORS as string[]).includes(e.reason)) })
    p.catch(() => cache.delete(careId))
    cache.set(careId, p)
  }
  return p
}

/** 여러 학생의 이벤트를 한 번에(동시에 16개씩) 읽는다. 읽는 동안 몇 명째인지 알려 주고, 연동 실패는 빈 목록이 아니라 error 로 돌려준다 */
export function useSupervisorEvents(careIds: string[]): SupState {
  const key = careIds.join(',')
  const [state, setState] = useState<{ key: string; value: SupState }>({ key: '', value: { status: 'loading' } })
  useEffect(() => {
    let alive = true
    const ids = key ? key.split(',') : []
    const out = new Map<string, SupEvent[]>()
    let i = 0, failed = false
    let last = 0
    const worker = async () => {
      while (i < ids.length && !failed) {
        const id = ids[i++]
        try { out.set(id, await fetchEvents(id)) } catch { failed = true }
        // 10명마다 진행을 알린다(매번 그리면 느려진다)
        if (alive && !failed && out.size - last >= 10 && out.size < ids.length) { last = out.size; setState({ key, value: { status: 'loading', done: out.size, total: ids.length } }) }
      }
    }
    Promise.all(Array.from({ length: 16 }, worker)).then(() => { if (alive) setState({ key, value: failed ? { status: 'error' } : { status: 'ready', byStudent: out } }) })
    return () => { alive = false }
  }, [key])
  return state.key === key ? state.value : { status: 'loading' }
}

/** 읽는 중 안내 문구(몇 명째인지) */
export const supLoadingText = (sup: SupState) => `학생별 사진 관찰 기록을 불러오는 중${sup.status === 'loading' && sup.total ? ` (${sup.done ?? 0} / ${sup.total}명)` : ''}`
