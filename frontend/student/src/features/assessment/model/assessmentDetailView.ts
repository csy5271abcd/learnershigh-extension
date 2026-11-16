import type { ArtifactVersion } from '../api/types.ts'

// 수행평가 상세의 표시 규칙 (Business State가 아닌 표시용 파생 값).

const extensionLabels: Record<string, string> = {
  hwp: 'HWP',
  hwpx: 'HWPX',
  pdf: 'PDF',
  doc: 'DOC',
  docx: 'DOCX',
  ppt: 'PPT',
  pptx: 'PPTX',
  xlsx: 'XLSX',
  png: '이미지',
  jpg: '이미지',
  jpeg: '이미지',
}

/** 파일명 확장자 표기. 파일 유형 판단(보안)은 서버가 한다 (§48). */
export function fileTypeLabel(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return extensionLabels[extension] ?? (extension ? extension.toUpperCase() : '파일')
}

export function formatBytes(bytes: number): string {
  if (bytes < 100 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** `2026-10-13T19:44:00+09:00` → `10. 13. 오후 7:44` (표시 Timezone은 데이터의 Offset 그대로) */
export function formatDateTime(iso: string): string {
  const [date, time] = iso.split('T')
  const [, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return `${month}. ${day}. ${formatClock(hours, minutes)}`
}

function formatClock(hours: number, minutes: number): string {
  const period = hours < 12 ? '오전' : '오후'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${period} ${hour12}:${String(minutes).padStart(2, '0')}`
}

/** 기준일과 같은 날이면 `오늘 오후 3:12`, 아니면 `10. 14. 오후 9:40` */
export function formatRelativeDateTime(iso: string, today: string): string {
  const [date, time] = iso.split('T')
  if (date !== today) return formatDateTime(iso)
  const [hours, minutes] = time.split(':').map(Number)
  return `오늘 ${formatClock(hours, minutes)}`
}

export function latestVersion(versions: ArtifactVersion[]): ArtifactVersion | undefined {
  return versions.reduce<ArtifactVersion | undefined>(
    (max, version) => (!max || version.versionNumber > max.versionNumber ? version : max),
    undefined,
  )
}

/** 같은 Snapshot(노트 Revision + 파일 버전 집합)인지. 대기 중 동일 범위 중복 요청 방지에 쓴다 (feedback §4). */
export function isSameSnapshot(
  a: { noteRevisionId: string; artifactVersionIds: string[] },
  b: { noteRevisionId: string; artifactVersionIds: string[] },
): boolean {
  if (a.noteRevisionId !== b.noteRevisionId || a.artifactVersionIds.length !== b.artifactVersionIds.length) return false
  const ids = new Set(a.artifactVersionIds)
  return b.artifactVersionIds.every((id) => ids.has(id))
}
