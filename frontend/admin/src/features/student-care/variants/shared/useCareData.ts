// 시안 A–D가 함께 쓰는 데이터 불러오기. 기존 학생 케어 API(board·metrics·settings)만 쓰고 판정은 서버 신호를 그대로 쓴다.
import { useMemo, useState } from 'react'
import { httpStudentCareApi } from '../../api/httpStudentCareApi.ts'
import { useRemote, loadFailure } from '../../model/useRemote.ts'
import { buildOpsRoster, type OpsStudent } from './model.ts'
import { visionDay, type VisionDay } from './visionExample.ts'

export const careApi = httpStudentCareApi

export interface CareRow extends OpsStudent {
  /** 최근 7일 비전 관찰(예시). 날짜 순서는 days와 같다 */
  vision: VisionDay[]
}

export function useCareData(prefix: string) {
  const params = new URLSearchParams(window.location.search)
  const branches = useRemote(`${prefix}/branches`, careApi.branches)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(params.get('branchId'))
  const [version, setVersion] = useState(0)
  const [status, setStatus] = useState('')
  const branchId = branches.data?.some((b) => b.branchId === selectedBranch) ? selectedBranch : branches.data?.[0]?.branchId ?? null
  const branchName = branches.data?.find((b) => b.branchId === branchId)?.name ?? ''
  const board = useRemote(branchId && `${prefix}/board/${branchId}`, () => careApi.board(branchId!), version)
  const metrics = useRemote(branchId && `${prefix}/metrics/${branchId}`, () => careApi.metrics(branchId!), version)
  const settings = useRemote(branchId && `${prefix}/settings/${branchId}`, () => careApi.settings(branchId!), version)
  const rows = useMemo<CareRow[] | null>(() => board.data && metrics.data
    ? buildOpsRoster(board.data, metrics.data).map((r) => ({ ...r, vision: r.days.map((d) => visionDay(r.student.studentId, d.date, d.minutes, d.start)) }))
    : null, [board.data, metrics.data])
  // 저장 성공 뒤 board·metrics·settings를 다시 불러 서버의 관리 상태와 다음 확인일을 보인다(화면 전용 상태를 만들지 않음)
  const saved = (message: string) => { setStatus(message); setVersion((v) => v + 1) }
  const failed = loadFailure(board) ? board : loadFailure(metrics) ? metrics : null
  return {
    branches, branchId, branchName, selectBranch: setSelectedBranch, board, metrics, settings, rows, version, saved, status, failed,
    asOf: board.data?.asOf ?? null,
    studyDropPercent: settings.data?.studyDropPercent ?? 30,
    startShiftMinutes: settings.data?.startShiftMinutes ?? 60,
    executionRate: settings.data?.executionRatePercent ?? 70,
    thresholds: { minValidDays: Math.min(7, settings.data?.minValidDays ?? 3), absenceDays: settings.data?.absenceDays ?? 3, planMissingDays: settings.data?.planMissingDays ?? 3, studyDropPercent: settings.data?.studyDropPercent ?? 30, startShiftMinutes: settings.data?.startShiftMinutes ?? 60 },
  }
}
export type CareData = ReturnType<typeof useCareData>

/** 사유 종류로 학생을 좁힌다. 판정은 바꾸지 않고 보여줄 학생만 고른다 */
export const REASONS: { key: string; label: string; match: (s: OpsStudent) => boolean }[] = [
  { key: '', label: '전체', match: () => true },
  { key: 'flagged', label: '상담 필요 · 확인일', match: (s) => s.status === 'check' || s.status === 'recheck' },
  { key: 'managed', label: '관리 중', match: (s) => s.status === 'managed' || s.status === 'recheck' },
  { key: 'CONSECUTIVE_ABSENCE', label: '결석', match: (s) => s.signals.some((x) => x.type === 'CONSECUTIVE_ABSENCE') },
  { key: 'STUDY_DROP', label: '학습 감소', match: (s) => s.signals.some((x) => x.type === 'STUDY_DROP') },
  { key: 'EXECUTION_GAP', label: '진행률', match: (s) => s.signals.some((x) => x.type === 'EXECUTION_GAP') },
  { key: 'START_TIME_SHIFT', label: '입실 늦어짐', match: (s) => s.signals.some((x) => x.type === 'START_TIME_SHIFT') },
  { key: 'SUBJECT_SHARE', label: '과목 비중', match: (s) => s.signals.some((x) => x.type === 'SUBJECT_SHARE') },
  { key: 'PLAN_MISSING', label: '계획 미제출', match: (s) => s.signals.some((x) => x.type === 'PLAN_MISSING') },
  { key: 'WEEKDAY_ABSENCE', label: '같은 요일 결석(참고)', match: (s) => s.weekdayAbsence !== null },
]

export const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`

export const matchReason = (key: string) => REASONS.find((x) => x.key === key)?.match ?? (() => true)
export const matchQuery = (q: string) => (r: OpsStudent) => `${r.student.studentName} ${r.student.className ?? ''}`.includes(q.trim())
