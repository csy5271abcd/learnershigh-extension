import type { NoteBlock } from '../api/types.ts'
import { formatFileSize } from './noteEditorModel.ts'

// A28-49 '노트 내보내기': 서버에 저장된 탐구 노트를 Markdown(.md) 한 파일로 만든다(브라우저 안에서만, 외부 전송 없음).
// - 제목 · 과목/평가 메타 · 본문 블록 · 첨부 파일 목록. 첨부 파일 자체는 넣지 않고 이름·크기·저장 여부만 적는다.
// - 모르는 블록 형식도 글을 버리지 않는다(text 그대로).

export interface NoteExportInput {
  assessmentTitle: string
  subjectName: string
  /** 화면에 보이는 평가 정보(라벨, 값). 값이 없으면 넣지 않는다 */
  meta: [string, string | null | undefined][]
  noteTitle: string | null
  revisionNumber: number | null
  savedAt: string | null
  blocks: NoteBlock[]
  exportedAt: Date
}

const escapeCell = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, ' ')

export function noteToMarkdown(input: NoteExportInput): string {
  const lines: string[] = []
  lines.push(`# ${input.assessmentTitle}`)
  lines.push('')
  lines.push(`- 과목: ${input.subjectName || '미지정'}`)
  for (const [label, value] of input.meta) if (value) lines.push(`- ${label}: ${value}`)
  if (input.revisionNumber) lines.push(`- 노트 버전: v${input.revisionNumber}${input.savedAt ? ` (${input.savedAt.slice(0, 16).replace('T', ' ')} 저장)` : ''}`)
  lines.push(`- 내보낸 시각: ${formatDate(input.exportedAt)}`)
  lines.push('')
  lines.push(`## ${input.noteTitle?.trim() || '탐구 노트'}`)
  lines.push('')
  const attachments: string[] = []
  let number = 0
  for (const block of input.blocks) {
    const attrs = block.attrs ?? {}
    const text = block.text ?? ''
    if (block.type !== 'NUMBERED') number = 0
    switch (block.type) {
      case 'HEADING': {
        const level = Math.min(3, Math.max(1, attrs.level ?? 2))
        lines.push(`${'#'.repeat(level + 2)} ${text}`)
        break
      }
      case 'BULLET':
        lines.push(`${'  '.repeat(attrs.indent ?? 0)}- ${text}`)
        continue
      case 'NUMBERED':
        number += 1
        lines.push(`${'  '.repeat(attrs.indent ?? 0)}${number}. ${text}`)
        continue
      case 'CHECKLIST':
        lines.push(`- [${attrs.checked ? 'x' : ' '}] ${text}`)
        continue
      case 'QUOTE':
        lines.push(text.split('\n').map((line) => `> ${line}`).join('\n'))
        break
      case 'CALLOUT':
        lines.push(`> ${attrs.emoji ?? '💡'} ${text}`)
        break
      case 'TOGGLE':
        lines.push(`**▸ ${text}**`)
        if (attrs.body) lines.push('', attrs.body)
        break
      case 'DIVIDER':
        lines.push('---')
        break
      case 'CODE':
        lines.push('```' + (attrs.language && attrs.language !== 'plain' ? attrs.language : ''), text, '```')
        break
      case 'MATH':
        lines.push('$$', text, '$$')
        break
      case 'TABLE':
      case 'CHART': {
        const rows = attrs.rows ?? []
        if (rows.length > 0) {
          const width = Math.max(...rows.map((row) => row.length))
          const pad = (row: string[]) => Array.from({ length: width }, (_, index) => escapeCell(row[index] ?? ''))
          lines.push(`| ${pad(rows[0]).join(' | ')} |`, `| ${Array.from({ length: width }, () => '---').join(' | ')} |`)
          for (const row of rows.slice(1)) lines.push(`| ${pad(row).join(' | ')} |`)
        } else if (text) lines.push(text)
        break
      }
      case 'IMAGE':
      case 'FILE': {
        const file = attrs.file
        if (file?.name) {
          const kind = block.type === 'IMAGE' ? '이미지' : file.mimeType === 'application/pdf' ? 'PDF' : '파일'
          const stored = file.attachmentId ? '서버에 저장됨' : '파일 미저장(이전 첨부)'
          lines.push(`[${kind} 첨부] ${file.name} (${formatFileSize(file.size)} · ${stored})`)
          attachments.push(`${file.name} · ${kind} · ${formatFileSize(file.size)} · ${stored}`)
        } else lines.push(`[${block.type === 'IMAGE' ? '이미지' : '파일'} 없음]`)
        if (text) lines.push(text)
        break
      }
      case 'LINK':
      case 'VIDEO':
        lines.push(attrs.url ? `[${text || attrs.url}](${attrs.url})` : text)
        break
      case 'MAP':
        lines.push(`📍 ${attrs.place || text || '장소'}${attrs.url ? ` (${attrs.url})` : ''}`)
        break
      case 'RESOURCE_LINK':
        lines.push(`📚 참고자료: ${attrs.resource?.title ?? text}${attrs.resource?.sourceUrl ? ` (${attrs.resource.sourceUrl})` : ''}`)
        break
      case 'EXAM_SOURCE':
        lines.push(`📄 대학별 기출: ${attrs.examSource?.label ?? text}`)
        break
      default:
        lines.push(text)
    }
    lines.push('')
  }
  if (input.blocks.length === 0) lines.push('(저장된 노트 내용이 없어요)', '')
  lines.push('## 첨부 파일')
  lines.push('')
  if (attachments.length === 0) lines.push('- 없음')
  else for (const line of attachments) lines.push(`- ${line}`)
  lines.push('')
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

/** 파일 이름에 쓸 수 없는 글자를 바꾼다 */
export function exportFileName(title: string, exportedAt: Date): string {
  const safe = title.replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 60) || '탐구노트'
  const day = `${exportedAt.getFullYear()}${String(exportedAt.getMonth() + 1).padStart(2, '0')}${String(exportedAt.getDate()).padStart(2, '0')}`
  return `${safe}_탐구노트_${day}.md`
}

function formatDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
