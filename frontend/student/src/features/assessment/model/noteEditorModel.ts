import type { NoteBlock, NoteBlockAttrs, StudentResource } from '../api/types.ts'

// 탐구 노트 편집기 모델 (Editor 라이브러리와 무관한 순수 데이터 계층).
// - EditorBlock: 화면이 편집하는 블록 (UI ViewModel)
// - NoteBlock: §20 저장 형식. 계약 예시는 HEADING·PARAGRAPH뿐이라 나머지 type과 attrs는 Mock 임시 형식이다 (MM-33, OD-A05).
// 나중에 Tiptap·BlockNote 같은 Editor를 도입해도 이 변환 계층과 저장·Revision 흐름은 그대로 쓸 수 있게 둔다.

export type EditorBlockType = 'HEADING' | 'PARAGRAPH' | 'BULLET' | 'NUMBERED' | 'CHECKLIST' | 'QUOTE' | 'TABLE' | 'RESOURCE_LINK'

export interface EditorBlock {
  /** 블록이 처음 만들어질 때 한 번 정하고 바꾸지 않는다 (앵커·피드백 위치 안정성, §20) */
  blockId: string
  type: string
  text: string
  attrs?: NoteBlockAttrs
}

/** 계약에 있는 블록 (서버 저장 형식 확정) */
export const contractBlockTypes = new Set(['HEADING', 'PARAGRAPH'])

export const blockTypeOptions: { type: EditorBlockType; label: string; hint: string }[] = [
  { type: 'PARAGRAPH', label: '본문', hint: '일반 문단' },
  { type: 'HEADING', label: '소제목', hint: '이모지 소제목도 그대로 써요' },
  { type: 'BULLET', label: '글머리 목록', hint: '•' },
  { type: 'NUMBERED', label: '번호 목록', hint: '1.' },
  { type: 'CHECKLIST', label: '체크리스트', hint: '☐' },
  { type: 'QUOTE', label: '인용·메모', hint: '❝' },
  { type: 'TABLE', label: '표', hint: '행·열' },
]

/** 텍스트로 서로 바꿀 수 있는 유형 (표·링크 카드는 내용 손실이 있어 바꾸지 않는다) */
export const textBlockTypes = new Set<string>(['HEADING', 'PARAGRAPH', 'BULLET', 'NUMBERED', 'CHECKLIST', 'QUOTE'])

let blockSequence = 0
/** 새 블록 ID. 화면 세션 안에서 유일하고, 저장 후에도 그대로 쓴다. */
export function newBlockId(): string {
  blockSequence += 1
  return `block_${Date.now().toString(36)}_${blockSequence}`
}

export function createBlock(type: string, text = ''): EditorBlock {
  if (type === 'TABLE') return { blockId: newBlockId(), type, text: '', attrs: { rows: [['', ''], ['', '']] } }
  if (type === 'CHECKLIST') return { blockId: newBlockId(), type, text, attrs: { checked: false } }
  return { blockId: newBlockId(), type, text }
}

export function createResourceBlock(resource: StudentResource): EditorBlock {
  // 원문을 복사하지 않고 출처 메타데이터만 링크 카드로 남긴다 (§23 "링크 삽입은 원문 복제가 아니다").
  return {
    blockId: newBlockId(),
    type: 'RESOURCE_LINK',
    text: resource.title,
    attrs: {
      resource: {
        resourceId: resource.resourceId,
        title: resource.title,
        type: resource.type,
        sourceName: resource.sourceName,
        sourceUrl: resource.sourceUrl,
      },
    },
  }
}

/** 텍스트 유형 전환. 체크 상태처럼 없어지는 값은 지우고 글은 보존한다. */
export function convertBlock(block: EditorBlock, type: string): EditorBlock {
  if (!textBlockTypes.has(block.type) || !textBlockTypes.has(type)) return block
  return type === 'CHECKLIST'
    ? { blockId: block.blockId, type, text: block.text, attrs: { checked: false } }
    : { blockId: block.blockId, type, text: block.text }
}

export function fromNoteBlocks(blocks: NoteBlock[]): EditorBlock[] {
  return structuredClone(blocks)
}

/** 저장 형식으로 직렬화. 화면 상태를 그대로 넘기지 않고 복사해 이후 편집이 저장본을 바꾸지 않게 한다. */
export function toNoteBlocks(blocks: EditorBlock[]): NoteBlock[] {
  return blocks.map((block) => {
    const out: NoteBlock = { blockId: block.blockId, type: block.type, text: block.text }
    if (block.attrs) out.attrs = structuredClone(block.attrs)
    return out
  })
}

/** 템플릿 블록을 노트에 넣을 블록으로 바꾼다. 같은 템플릿을 두 번 넣어도 ID가 겹치지 않게 새 ID를 준다. */
export function blocksFromTemplate(templateBlocks: NoteBlock[]): EditorBlock[] {
  return templateBlocks.map((block) => ({ ...structuredClone(block), blockId: newBlockId() }))
}

export function isBlankNote(blocks: EditorBlock[]): boolean {
  return blocks.every((block) => block.type !== 'TABLE' && block.type !== 'RESOURCE_LINK' && block.text.trim() === '')
}

export function sameContent(a: { title: string; blocks: EditorBlock[] }, b: { title: string; blocks: EditorBlock[] }): boolean {
  return a.title === b.title && JSON.stringify(toNoteBlocks(a.blocks)) === JSON.stringify(toNoteBlocks(b.blocks))
}

export function hasProvisionalBlocks(blocks: EditorBlock[]): boolean {
  return blocks.some((block) => !contractBlockTypes.has(block.type))
}

export function moveBlock(blocks: EditorBlock[], index: number, delta: -1 | 1): EditorBlock[] {
  const target = index + delta
  if (target < 0 || target >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
