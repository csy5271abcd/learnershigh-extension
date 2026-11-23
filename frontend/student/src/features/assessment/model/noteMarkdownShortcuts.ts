import type { EditorBlock } from './noteEditorModel.ts'

// A27-UX 탐구 노트 Markdown 단축 입력. 빈 본문(PARAGRAPH) 맨 앞에 표시를 쓰고 띄어쓰기하면 블록 유형을 바꾼다(Notion과 같은 방식).
//   "# " 제목 1 · "## " 제목 2 · "### " 제목 3 · "- " / "* " 글머리 · "1. " 번호 · "[] " / "[ ] " 체크리스트 · "> " 인용 · "---" 구분선
// 블록 ID는 그대로 둔다(앵커 안정성). 표시 뒤에 이미 쓴 글은 남긴다. 한글 조합 중에는 호출하지 않는다(호출 측).
const rules: { prefix: string; type: string; attrs?: EditorBlock['attrs'] }[] = [
  { prefix: '### ', type: 'HEADING', attrs: { level: 3 } },
  { prefix: '## ', type: 'HEADING', attrs: { level: 2 } },
  { prefix: '# ', type: 'HEADING', attrs: { level: 1 } },
  { prefix: '- ', type: 'BULLET' },
  { prefix: '* ', type: 'BULLET' },
  { prefix: '1. ', type: 'NUMBERED' },
  { prefix: '[ ] ', type: 'CHECKLIST', attrs: { checked: false } },
  { prefix: '[] ', type: 'CHECKLIST', attrs: { checked: false } },
  { prefix: '> ', type: 'QUOTE' },
]

/** 바뀐 블록, 단축 입력이 아니면 null. previous = 바꾸기 전 글, next = 방금 입력한 글 */
export function applyMarkdownShortcut(block: EditorBlock, previous: string, next: string): EditorBlock | null {
  if (block.type !== 'PARAGRAPH') return null
  // 표시를 '처음' 완성한 순간만 바꾼다(붙여넣기·중간 편집으로 우연히 맞는 경우 제외: 이전 글은 표시의 앞부분이어야 한다)
  if (next === '---' && previous === '--') return { ...block, type: 'DIVIDER', text: '', attrs: undefined }
  for (const rule of rules) {
    if (!next.startsWith(rule.prefix)) continue
    const typedPrefix = rule.prefix.trimEnd()
    if (previous !== typedPrefix && previous !== `${typedPrefix}${next.slice(rule.prefix.length)}`) continue
    return { ...block, type: rule.type, text: next.slice(rule.prefix.length), attrs: rule.attrs ? { ...rule.attrs } : undefined }
  }
  return null
}
