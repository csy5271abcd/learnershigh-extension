import { growthRecordNewPath } from '../../routes/paths.ts'
import { BulbIcon, DownloadIcon, SlidersIcon, SproutIcon, TrashIcon } from '../AssessmentIcons.tsx'
import type { MoreMenuItem } from './DetailTopBar.tsx'

/** 학교 수행평가 상세 더보기 (Mockup SA-DETAIL-14). "성장 기록에 남기기"만 이 과제를 관련 활동으로 채운 작성 화면으로 이동한다. */
export function schoolAssessmentMenuItems(assessmentId: string): MoreMenuItem[] {
  return [
    { label: '평가 정보 수정', icon: SlidersIcon, reason: '평가 정보 수정은 수정 가능한 항목이 계약으로 정해진 뒤 제공돼요.' },
    { label: '심화 탐구로 이어가기', icon: BulbIcon, reason: '수행평가와 심화 탐구를 잇는 기능은 아직 지원하지 않아요.' },
    { label: '성장 기록에 남기기', icon: SproutIcon, to: growthRecordNewPath('SCHOOL_ASSESSMENT', assessmentId) },
    { label: '노트 내보내기', icon: DownloadIcon, reason: '노트 내보내기는 아직 지원하지 않아요.' },
    { label: '삭제', icon: TrashIcon, reason: '삭제·휴지통 정책이 확정되기 전이라 아직 삭제할 수 없어요.', danger: true },
  ]
}
