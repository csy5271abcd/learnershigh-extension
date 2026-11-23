import { enrichmentPath, growthRecordNewPath } from '../../routes/paths.ts'
import { BulbIcon, DownloadIcon, SlidersIcon, SproutIcon, TrashIcon } from '../AssessmentIcons.tsx'
import type { MoreMenuItem } from './DetailTopBar.tsx'

export interface SchoolAssessmentMenuActions {
  /** 평가 정보 수정 창 열기 */
  onEdit?: () => void
  /** 노트 내보내기(.md) */
  onExport?: () => void
  /** 휴지통으로 이동(소프트 삭제, 복원 가능) */
  onTrash?: () => void
  /** 영구 삭제 확인 창 열기 */
  onDelete?: () => void
  /** 실행할 수 없을 때 이유(관리자 읽기 전용·시연 데이터) */
  unavailable?: string
}

/**
 * 학교 수행평가 상세 더보기 (Mockup SA-DETAIL-14).
 * A28-49: 모든 항목이 실제로 동작한다 — 평가 정보 수정(본문과 같은 수정 창) · 심화 탐구로 이어가기(심화 탐구 첫 화면) ·
 * 성장 기록에 남기기 · 노트 내보내기(Markdown 파일) · 휴지통으로 이동(A28-46, 복원 가능) · 삭제(영구, 확인 창).
 * 동작 함수가 없으면(관리자 읽기 전용·시연 데이터) 실행하지 않고 그 이유만 알린다.
 */
export function schoolAssessmentMenuItems(assessmentId: string, actions: SchoolAssessmentMenuActions = {}): MoreMenuItem[] {
  const reason = actions.unavailable ?? '이 화면에서는 사용할 수 없어요.'
  const item = (label: string, icon: MoreMenuItem['icon'], run: (() => void) | undefined, danger = false): MoreMenuItem =>
    run ? { label, icon, onSelect: run, danger } : { label, icon, reason, danger }
  return [
    item('평가 정보 수정', SlidersIcon, actions.onEdit),
    { label: '심화 탐구로 이어가기', icon: BulbIcon, to: enrichmentPath },
    { label: '성장 기록에 남기기', icon: SproutIcon, to: growthRecordNewPath('SCHOOL_ASSESSMENT', assessmentId) },
    item('노트 내보내기', DownloadIcon, actions.onExport),
    item('휴지통으로 이동', TrashIcon, actions.onTrash, true),
    item('삭제', TrashIcon, actions.onDelete, true),
  ]
}
