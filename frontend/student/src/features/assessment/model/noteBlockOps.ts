import type { NoteBlockAttrs } from '../api/types.ts'
import {
  continuationType,
  convertBlock,
  convertibleTypes,
  createBlock,
  listBlockTypes,
  maxIndent,
  multilineBlockTypes,
  newBlockId,
  type BlockCommand,
  type EditorBlock,
} from './noteEditorModel.ts'

// 블록 편집 동작 (순수 함수). 화면은 결과 블록 목록과 다음 포커스 위치만 받는다.
// 기존 블록의 blockId는 바꾸지 않는다: 나누면 앞부분이 원래 ID를 갖고, 합치면 앞 블록 ID가 남는다 (§20 앵커 안정성).

export interface BlockEdit {
  blocks: EditorBlock[]
  focus?: { blockId: string; caret: 'start' | 'end' | number; slash?: boolean }
}

const indexOf = (blocks: EditorBlock[], blockId: string) => blocks.findIndex((block) => block.blockId === blockId)

/** Enter: 커서 앞은 이 블록에 남기고, 뒤는 새 블록(목록이면 같은 목록, 아니면 본문)으로 */
export function splitBlock(blocks: EditorBlock[], blockId: string, before: string, after: string): BlockEdit {
  const index = indexOf(blocks, blockId)
  if (index < 0) return { blocks }
  const current = blocks[index]
  const type = continuationType(current.type)
  const next = createBlock(type, after, listBlockTypes.has(type) && current.attrs?.indent ? { indent: current.attrs.indent } : undefined)
  const kept: EditorBlock = { ...current, text: before }
  // 안내 문구는 빈 칸 자리 표시라 나눈 뒤 새 줄에는 옮기지 않는다.
  return { blocks: [...blocks.slice(0, index), kept, next, ...blocks.slice(index + 1)], focus: { blockId: next.blockId, caret: 'start' } }
}

/** 글이 있는 블록 맨 앞에서 Enter: 위에 같은 종류(목록) 또는 본문 빈 블록을 넣고 커서는 원래 블록에 둔다 */
export function insertAbove(blocks: EditorBlock[], blockId: string): BlockEdit {
  const index = indexOf(blocks, blockId)
  if (index < 0) return { blocks }
  const current = blocks[index]
  const type = continuationType(current.type)
  const block = createBlock(type, '', listBlockTypes.has(type) && current.attrs?.indent ? { indent: current.attrs.indent } : undefined)
  return { blocks: [...blocks.slice(0, index), block, ...blocks.slice(index)], focus: { blockId, caret: 'start' } }
}

export function insertBelow(blocks: EditorBlock[], blockId: string | undefined, block: EditorBlock, slash = false): BlockEdit {
  const index = blockId ? indexOf(blocks, blockId) : blocks.length - 1
  const at = index < 0 ? blocks.length : index + 1
  return { blocks: [...blocks.slice(0, at), block, ...blocks.slice(at)], focus: { blockId: block.blockId, caret: 'end', slash } }
}

/**
 * 맨 앞에서 Backspace (본문 블록):
 * - 앞 블록이 글 블록이면 글을 이어 붙이고 이 블록을 지운다 (커서는 이어 붙인 자리).
 * - 앞 블록이 표·카드 같은 블록이면: 이 블록이 비어 있으면 지우고 앞 블록으로, 아니면 앞 블록으로 포커스만 옮긴다.
 */
export function mergeWithPrevious(blocks: EditorBlock[], blockId: string): BlockEdit {
  const index = indexOf(blocks, blockId)
  if (index <= 0) return { blocks }
  const current = blocks[index]
  const previous = blocks[index - 1]
  if (convertibleTypes.has(previous.type)) {
    const caret = previous.text.length
    const merged: EditorBlock = { ...previous, text: previous.text + current.text }
    return { blocks: [...blocks.slice(0, index - 1), merged, ...blocks.slice(index + 1)], focus: { blockId: previous.blockId, caret } }
  }
  if (current.text === '') return { blocks: blocks.filter((block) => block.blockId !== blockId), focus: { blockId: previous.blockId, caret: 'end' } }
  return { blocks, focus: { blockId: previous.blockId, caret: 'end' } }
}

/** 맨 끝에서 Delete: 다음 글 블록을 이어 붙인다 (다음이 표·카드면 그대로 둔다) */
export function mergeWithNext(blocks: EditorBlock[], blockId: string): BlockEdit {
  const index = indexOf(blocks, blockId)
  const next = blocks[index + 1]
  if (index < 0 || !next || !convertibleTypes.has(next.type) || multilineBlockTypes.has(next.type)) return { blocks }
  const current = blocks[index]
  const merged: EditorBlock = { ...current, text: current.text + next.text }
  return { blocks: [...blocks.slice(0, index), merged, ...blocks.slice(index + 2)], focus: { blockId, caret: current.text.length } }
}

/** 목록 들여쓰기 (Tab / Shift+Tab). 위 항목보다 두 단계 이상 깊어지지 않게 한다. */
export function indentBlock(blocks: EditorBlock[], blockId: string, delta: 1 | -1, caret: number): BlockEdit {
  const index = indexOf(blocks, blockId)
  const current = blocks[index]
  if (!current || !listBlockTypes.has(current.type)) return { blocks }
  const previous = blocks[index - 1]
  const ceiling = previous && listBlockTypes.has(previous.type) ? (previous.attrs?.indent ?? 0) + 1 : 0
  const indent = Math.max(0, Math.min(maxIndent, ceiling, (current.attrs?.indent ?? 0) + delta))
  if (indent === (current.attrs?.indent ?? 0)) return { blocks, focus: { blockId, caret } }
  const attrs: NoteBlockAttrs = { ...current.attrs, indent }
  if (indent === 0) delete attrs.indent
  const next: EditorBlock = { ...current, attrs }
  if (Object.keys(attrs).length === 0) delete next.attrs
  return { blocks: blocks.map((block) => (block.blockId === blockId ? next : block)), focus: { blockId, caret } }
}

export function convertInPlace(blocks: EditorBlock[], blockId: string, type: string, attrs?: EditorBlock['attrs']): BlockEdit {
  const index = indexOf(blocks, blockId)
  if (index < 0) return { blocks }
  const converted = convertBlock(blocks[index], type, attrs)
  if (converted === blocks[index]) return { blocks }
  return { blocks: blocks.map((block) => (block.blockId === blockId ? converted : block)), focus: { blockId, caret: 'end' } }
}

/**
 * "/" 명령 실행. 입력한 "/검색어"는 지우고 같은 블록(ID 유지)을 새 유형으로 바꾼다.
 * 구분선은 아래에 빈 본문을 붙여 바로 이어 쓰게 한다. 참고자료는 자료 고르기를 연다(`pickResource`).
 */
export function applyCommand(blocks: EditorBlock[], blockId: string, command: BlockCommand): BlockEdit & { pickResource?: boolean; pickExamSource?: boolean } {
  const index = indexOf(blocks, blockId)
  if (index < 0) return { blocks }
  const cleared: EditorBlock = { ...blocks[index], text: '' }
  const base = blocks.map((block) => (block.blockId === blockId ? cleared : block))
  if (command.id === 'resource') {
    return { blocks: base, focus: { blockId, caret: 'start' }, pickResource: true }
  }
  if (command.id === 'examSource') {
    return { blocks: base, focus: { blockId, caret: 'start' }, pickExamSource: true }
  }
  const converted = convertBlock(cleared, command.type, command.attrs ? structuredClone(command.attrs) : undefined)
  const withConverted = base.map((block) => (block.blockId === blockId ? converted : block))
  if (command.type === 'DIVIDER') {
    const after = createBlock('PARAGRAPH')
    return { blocks: [...withConverted.slice(0, index + 1), after, ...withConverted.slice(index + 1)], focus: { blockId: after.blockId, caret: 'start' } }
  }
  return { blocks: withConverted, focus: { blockId, caret: 'start' } }
}

export function duplicateBlock(blocks: EditorBlock[], blockId: string): BlockEdit {
  const index = indexOf(blocks, blockId)
  if (index < 0) return { blocks }
  const copy: EditorBlock = { ...structuredClone(blocks[index]), blockId: newBlockId() }
  return { blocks: [...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)], focus: { blockId: copy.blockId, caret: 'end' } }
}

/** 블록 삭제. 마지막 하나를 지우면 빈 본문 하나를 남겨 바로 다시 쓸 수 있게 한다. */
export function removeBlock(blocks: EditorBlock[], blockId: string, focus: 'previous' | 'next' | null): BlockEdit {
  const index = indexOf(blocks, blockId)
  if (index < 0) return { blocks }
  const rest = blocks.filter((block) => block.blockId !== blockId)
  if (rest.length === 0) {
    const blank = createBlock('PARAGRAPH')
    return { blocks: [blank], focus: { blockId: blank.blockId, caret: 'start' } }
  }
  const target = focus === 'next' ? (rest[index] ?? rest[index - 1]) : focus === 'previous' ? (rest[index - 1] ?? rest[0]) : undefined
  return { blocks: rest, focus: target ? { blockId: target.blockId, caret: focus === 'next' ? 'start' : 'end' } : undefined }
}

/**
 * 자료 카드를 노트에 넣는다 (자료 탭 "노트에 추가", "/참고자료").
 * `targetId`가 빈 글 블록이면 그 자리를 바꾸고(ID 유지), 아니면 그 아래(없으면 맨 끝)에 넣는다.
 */
export function placeResourceBlock(blocks: EditorBlock[], targetId: string | undefined, resourceBlock: EditorBlock): BlockEdit {
  const index = targetId ? indexOf(blocks, targetId) : -1
  const target = index >= 0 ? blocks[index] : undefined
  if (target && convertibleTypes.has(target.type) && target.text.trim() === '' && !target.attrs?.body) {
    const replaced: EditorBlock = { ...resourceBlock, blockId: target.blockId }
    return { blocks: blocks.map((block) => (block.blockId === target.blockId ? replaced : block)), focus: { blockId: target.blockId, caret: 'start' } }
  }
  const last = blocks[blocks.length - 1]
  if (!target && last && last.type === 'PARAGRAPH' && last.text === '' && !last.attrs) {
    const replaced: EditorBlock = { ...resourceBlock, blockId: last.blockId }
    return { blocks: [...blocks.slice(0, -1), replaced], focus: { blockId: last.blockId, caret: 'start' } }
  }
  const at = index >= 0 ? index + 1 : blocks.length
  return { blocks: [...blocks.slice(0, at), resourceBlock, ...blocks.slice(at)], focus: { blockId: resourceBlock.blockId, caret: 'start' } }
}
