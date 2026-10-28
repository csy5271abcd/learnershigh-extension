import { BookIcon, FileIcon, ImageIcon, LinkIcon, NoteIcon, PlayIcon } from '../AssessmentIcons.tsx'

// 자료 유형 아이콘 (Mockup RL-LIST-01: 도서·이미지·영상·링크·PDF). 모르는 유형은 문서 아이콘.
export function ResourceTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  if (type === 'BOOK') return <BookIcon size={size} />
  if (type === 'IMAGE') return <ImageIcon size={size} />
  if (type === 'VIDEO') return <PlayIcon size={size} />
  if (type === 'LINK' || type === 'ARTICLE') return <LinkIcon size={size} />
  if (type === 'PDF' || type === 'PAPER') return <FileIcon size={size} />
  return <NoteIcon size={size} />
}
