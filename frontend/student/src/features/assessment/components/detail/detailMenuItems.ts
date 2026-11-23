import { growthRecordNewPath } from '../../routes/paths.ts'
import { BulbIcon, DownloadIcon, SlidersIcon, SproutIcon, TrashIcon } from '../AssessmentIcons.tsx'
import type { MoreMenuItem } from './DetailTopBar.tsx'

/** 학교 수행평가 상세 더보기 (Mockup SA-DETAIL-14). "성장 기록에 남기기"만 이 과제를 관련 활동으로 채운 작성 화면으로 이동한다. */
/**
 * A28-46: '휴지통으로 이동'은 본문 버튼과 같은 동작(소프트 삭제 · 노트·결과물·첨부·피드백 기록 보존 · 보관함 휴지통에서 복원).
 * onTrash 가 없으면(관리자 읽기 전용·시연 데이터) 실행하지 않고 그 이유만 알린다. 영구 삭제는 제공하지 않는다(보존 정책 미결정).
 */
export function schoolAssessmentMenuItems(assessmentId: string, onTrash?: () => void, trashUnavailable?: string): MoreMenuItem[] {
  return [
    { label: '평가 정보 수정', icon: SlidersIcon, reason: '평가 정보 수정은 수정 가능한 항목이 계약으로 정해진 뒤 제공돼요.' },
    { label: '심화 탐구로 이어가기', icon: BulbIcon, reason: '수행평가와 심화 탐구를 잇는 기능은 아직 지원하지 않아요.' },
    { label: '성장 기록에 남기기', icon: SproutIcon, to: growthRecordNewPath('SCHOOL_ASSESSMENT', assessmentId) },
    { label: '노트 내보내기', icon: DownloadIcon, reason: '노트 내보내기는 아직 지원하지 않아요.' },
    onTrash
      ? { label: '휴지통으로 이동', icon: TrashIcon, onSelect: onTrash, danger: true }
      : { label: '휴지통으로 이동', icon: TrashIcon, reason: trashUnavailable ?? '이 화면에서는 휴지통으로 옮길 수 없어요.', danger: true },
  ]
}
