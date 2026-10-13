import type { CaseMaterial, CaseMaterialRole } from './types.ts'

// Activity Case 과정 자료 / 결과물 표시 규칙.
// 미리보기 / 다운로드 가능 여부는 role(초안 / 최종본 등)이 아니라 자료에 실제 Resource가 있는지로만 정한다.

/** 과정 자료 종류 이름 (ActivityCase-01 Mockup) */
export const caseMaterialRoleLabel: Record<CaseMaterialRole, string> = {
  evidence: '자료',
  draft: '초안',
  feedback: '피드백',
  revision: '피드백 반영',
  final: '최종본',
}

/** 화면 / 다운로드에 쓰는 이름: 원본 파일 이름이 있으면 그 이름, 없으면 자료 이름 */
export const caseMaterialName = (item: CaseMaterial) => item.fileName ?? item.title

export const canPreviewCaseMaterial = (item: CaseMaterial) => Boolean(item.preview)

export const canDownloadCaseMaterial = (item: CaseMaterial) => Boolean(item.original)

/** 자료 정보만 있는 경우의 안내 */
export function caseMaterialUnavailableText(item: CaseMaterial): string | undefined {
  const preview = canPreviewCaseMaterial(item)
  const download = canDownloadCaseMaterial(item)
  if (preview && !download) return '다운로드 준비 중'
  if (!preview && !download) return '자료 정보만 볼 수 있어요'
  return undefined
}
