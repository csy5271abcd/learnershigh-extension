import type { EditorBlock } from './noteEditorModel.ts'

// A27-UX 탐구 노트 되돌리기·다시 하기 (편집기 단위). 블록 나누기·합치기·삭제·순서·유형 바꾸기와 글 입력을 함께 되돌린다.
// 글 입력은 잠시 멈출 때마다(기본 700ms) 한 단계로 묶고, 구조가 바뀌면(블록 수·순서·유형) 바로 한 단계로 남긴다.
// 서버 Revision 이력과는 별개다(저장된 버전은 '수정 이력'에서 본다). 한 화면 세션 안에서만 유지된다.
export interface NoteHistory {
  past: EditorBlock[][]
  future: EditorBlock[][]
  lastPushAt: number
}

export const emptyHistory = (): NoteHistory => ({ past: [], future: [], lastPushAt: 0 })
const LIMIT = 100

const shape = (blocks: EditorBlock[]) => blocks.map((block) => `${block.blockId}:${block.type}`).join('|')

/** 편집 한 번을 기록한다. previous = 바뀌기 전 블록 */
export function record(history: NoteHistory, previous: EditorBlock[], next: EditorBlock[], now: number, groupMs = 700): NoteHistory {
  if (previous === next) return history
  const structural = shape(previous) !== shape(next)
  if (!structural && now - history.lastPushAt < groupMs && history.past.length > 0) {
    // 같은 입력 묶음: 기록은 그대로, 다시 하기만 비운다
    return { ...history, future: [], lastPushAt: now }
  }
  return { past: [...history.past, previous].slice(-LIMIT), future: [], lastPushAt: now }
}

export function undo(history: NoteHistory, current: EditorBlock[]): { history: NoteHistory; blocks: EditorBlock[] } | null {
  const previous = history.past[history.past.length - 1]
  if (!previous) return null
  return { history: { past: history.past.slice(0, -1), future: [current, ...history.future], lastPushAt: 0 }, blocks: previous }
}

export function redo(history: NoteHistory, current: EditorBlock[]): { history: NoteHistory; blocks: EditorBlock[] } | null {
  const next = history.future[0]
  if (!next) return null
  return { history: { past: [...history.past, current], future: history.future.slice(1), lastPushAt: 0 }, blocks: next }
}
