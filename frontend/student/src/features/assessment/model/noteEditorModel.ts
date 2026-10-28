import type { NoteBlock, NoteBlockAttrs, StudentResource } from '../api/types.ts'

// 탐구 노트 편집기 모델 (Editor 라이브러리와 무관한 순수 데이터 계층).
// - EditorBlock: 화면이 편집하는 블록 (UI ViewModel)
// - NoteBlock: §20 저장 형식. 계약 예시는 HEADING·PARAGRAPH뿐이라 나머지 type과 attrs는 Mock 임시 형식이다 (MM-33, OD-A05, P-22).
// 나중에 Tiptap·BlockNote 같은 Editor를 도입해도 이 변환 계층과 저장·Revision 흐름은 그대로 쓸 수 있게 둔다.
// 모르는 type·attrs는 지우지 않고 그대로 보존한다 (저장 형식이 정해지기 전 다른 화면이 만든 블록 포함).

export type EditorBlockType =
  | 'HEADING'
  | 'PARAGRAPH'
  | 'BULLET'
  | 'NUMBERED'
  | 'CHECKLIST'
  | 'QUOTE'
  | 'TOGGLE'
  | 'CALLOUT'
  | 'CODE'
  | 'MATH'
  | 'DIVIDER'
  | 'TABLE'
  | 'RESOURCE_LINK'
  | 'EXAM_SOURCE'
  | 'LINK'
  | 'IMAGE'
  | 'FILE'
  | 'VIDEO'
  | 'MAP'
  | 'CHART'

export interface EditorBlock {
  /** 블록이 처음 만들어질 때 한 번 정하고 바꾸지 않는다 (앵커·피드백 위치 안정성, §20) */
  blockId: string
  type: string
  text: string
  attrs?: NoteBlockAttrs
}

/** 계약에 있는 블록 (서버 저장 형식 확정) */
export const contractBlockTypes = new Set(['HEADING', 'PARAGRAPH'])

/** 글을 입력하는 블록. Enter·Backspace·화살표로 블록 사이를 오간다. */
export const textBlockTypes = new Set<string>(['HEADING', 'PARAGRAPH', 'BULLET', 'NUMBERED', 'CHECKLIST', 'QUOTE', 'TOGGLE', 'CALLOUT'])

/** 여러 줄을 그대로 쓰는 블록 (Enter = 줄바꿈, Ctrl+Enter = 아래에 새 블록) */
export const multilineBlockTypes = new Set<string>(['CODE', 'MATH'])

/** 들여쓰기(Tab)가 되는 목록 */
export const listBlockTypes = new Set<string>(['BULLET', 'NUMBERED', 'CHECKLIST'])

export const maxIndent = 4

/** 글 블록끼리는 유형을 바꿔도 글이 그대로 남는다 */
export const convertibleTypes = new Set<string>([...textBlockTypes, ...multilineBlockTypes])

export type BlockCommandGroup = '기본' | '목록' | '강조' | '미디어' | '자료' | '데이터'

export interface BlockCommand {
  id: string
  label: string
  description: string
  /** 메뉴 아이콘 글자 */
  icon: string
  group: BlockCommandGroup
  /** "/" 검색어 (한글·영문) */
  keywords: string[]
  type: EditorBlockType
  attrs?: NoteBlockAttrs
}

// "/" 명령 목록 (Notion 방식). 모든 명령은 실제 블록을 만들거나 자료를 연결한다.
export const blockCommands: BlockCommand[] = [
  { id: 'text', label: '텍스트', description: '일반 문단', icon: 'T', group: '기본', keywords: ['본문', '텍스트', '문단', 'text', 'p'], type: 'PARAGRAPH' },
  { id: 'h1', label: '제목 1', description: '큰 제목', icon: 'H1', group: '기본', keywords: ['제목1', '제목', 'h1', 'heading'], type: 'HEADING', attrs: { level: 1 } },
  { id: 'h2', label: '제목 2', description: '중간 제목 (소제목)', icon: 'H2', group: '기본', keywords: ['제목2', '소제목', 'h2', 'heading'], type: 'HEADING', attrs: { level: 2 } },
  { id: 'h3', label: '제목 3', description: '작은 제목', icon: 'H3', group: '기본', keywords: ['제목3', 'h3', 'heading'], type: 'HEADING', attrs: { level: 3 } },
  { id: 'bullet', label: '글머리 목록', description: '• 순서 없는 목록', icon: '•', group: '목록', keywords: ['글머리', '목록', '불릿', 'bullet', 'list', 'ul'], type: 'BULLET' },
  { id: 'numbered', label: '번호 목록', description: '1. 순서 있는 목록', icon: '1.', group: '목록', keywords: ['번호', '목록', 'numbered', 'ol'], type: 'NUMBERED' },
  { id: 'checklist', label: '체크리스트', description: '할 일 확인', icon: '☐', group: '목록', keywords: ['체크', '할일', '할 일', 'todo', 'check'], type: 'CHECKLIST' },
  { id: 'toggle', label: '토글', description: '접고 펼치는 내용', icon: '▸', group: '목록', keywords: ['토글', '접기', 'toggle'], type: 'TOGGLE' },
  { id: 'quote', label: '인용', description: '인용·메모', icon: '❝', group: '강조', keywords: ['인용', '메모', 'quote'], type: 'QUOTE' },
  { id: 'callout', label: '이모지 강조', description: '이모지와 함께 눈에 띄게', icon: '💡', group: '강조', keywords: ['이모지', '강조', '콜아웃', 'emoji', 'callout'], type: 'CALLOUT', attrs: { emoji: '💡' } },
  { id: 'divider', label: '구분선', description: '내용 나누기', icon: '—', group: '강조', keywords: ['구분선', '선', 'divider', 'hr'], type: 'DIVIDER' },
  { id: 'code', label: '코드', description: '고정폭 글꼴, 언어 표시', icon: '</>', group: '강조', keywords: ['코드', 'code'], type: 'CODE', attrs: { language: 'plain' } },
  { id: 'math', label: '수식', description: 'LaTeX 원문 (렌더러 미연결)', icon: '∑', group: '강조', keywords: ['수식', '수학', 'math', 'latex', 'tex'], type: 'MATH' },
  { id: 'table', label: '표', description: '행·열 추가·삭제', icon: '⊞', group: '데이터', keywords: ['표', 'table'], type: 'TABLE' },
  { id: 'chart', label: '차트', description: '표 값으로 막대 그래프 미리보기', icon: '📊', group: '데이터', keywords: ['차트', '그래프', 'chart', 'graph'], type: 'CHART' },
  { id: 'resource', label: '참고자료', description: '자료함 자료를 출처 카드로 연결', icon: '📚', group: '자료', keywords: ['참고자료', '자료', '자료함', '출처', 'resource'], type: 'RESOURCE_LINK' },
  { id: 'link', label: '링크', description: '웹 주소 카드', icon: '🔗', group: '자료', keywords: ['링크', '주소', 'url', 'link', '북마크'], type: 'LINK' },
  { id: 'image', label: '이미지', description: '이 화면에서만 미리보기 (서버 저장 안 됨)', icon: '🖼', group: '미디어', keywords: ['이미지', '사진', '그림', 'image', 'img'], type: 'IMAGE' },
  { id: 'file', label: '파일', description: '파일 정보만 기록 (서버 저장 안 됨)', icon: '📎', group: '미디어', keywords: ['파일', '첨부', 'file'], type: 'FILE' },
  { id: 'pdf', label: 'PDF', description: 'PDF 정보 기록·이 화면에서 미리보기', icon: '📄', group: '미디어', keywords: ['pdf', '문서'], type: 'FILE', attrs: { file: { name: '', size: 0, mimeType: 'application/pdf' } } },
  // 대학 기출 PDF는 기존 PDF 블록 뒤에 둔다 ("/pdf" Enter가 기존 PDF 블록을 고르게, 2026-10-28 회귀 수정)
  {
    id: 'examSource',
    label: '대학 기출 PDF',
    description: 'SNU·KAIST 기출 PDF 쪽을 출처 카드로 연결',
    icon: '🏛',
    group: '자료',
    keywords: ['참고자료', '기출', '대학', '대학별', '서울대', 'snu', 'kaist', '카이스트', '면접', 'pdf', '출처', 'exam'],
    type: 'EXAM_SOURCE',
  },
  { id: 'video', label: '동영상', description: 'YouTube는 삽입, 그 밖은 링크 카드', icon: '▶', group: '미디어', keywords: ['동영상', '영상', '유튜브', 'video', 'youtube'], type: 'VIDEO' },
  { id: 'map', label: '지도·장소', description: '장소 카드 (지도 API 미연결)', icon: '📍', group: '미디어', keywords: ['지도', '장소', '위치', 'map', 'place'], type: 'MAP' },
]

export function filterCommands(query: string): BlockCommand[] {
  const needle = query.trim().toLocaleLowerCase('ko').replace(/\s+/g, '')
  if (!needle) return blockCommands
  return blockCommands.filter((command) =>
    [command.label, ...command.keywords].some((text) => text.toLocaleLowerCase('ko').replace(/\s+/g, '').includes(needle)),
  )
}

let blockSequence = 0
/** 새 블록 ID. 화면 세션 안에서 유일하고, 저장 후에도 그대로 쓴다. */
export function newBlockId(): string {
  blockSequence += 1
  return `block_${Date.now().toString(36)}_${blockSequence}`
}

function defaultAttrs(type: string): NoteBlockAttrs | undefined {
  switch (type) {
    case 'TABLE':
      return { rows: [['', ''], ['', '']] }
    case 'CHART':
      return { rows: [['항목', '값'], ['', ''], ['', '']] }
    case 'CHECKLIST':
      return { checked: false }
    case 'CALLOUT':
      return { emoji: '💡' }
    case 'CODE':
      return { language: 'plain' }
    default:
      return undefined
  }
}

export function createBlock(type: string, text = '', attrs?: NoteBlockAttrs): EditorBlock {
  const merged = { ...defaultAttrs(type), ...attrs }
  return Object.keys(merged).length > 0 ? { blockId: newBlockId(), type, text, attrs: merged } : { blockId: newBlockId(), type, text }
}

/** 대학 기출 PDF 출처 카드 (P-25 PROPOSED, Mock 임시 형식). 원문 없이 문서 ID·쪽 범위만 남긴다. */
export function createExamSourceBlock(source: NonNullable<NoteBlockAttrs['examSource']>, title: string): EditorBlock {
  const { documentId, questionId, pageStart, pageEnd, label } = source
  return { blockId: newBlockId(), type: 'EXAM_SOURCE', text: title, attrs: { examSource: { documentId, questionId, pageStart, pageEnd, label } } }
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

/**
 * 같은 블록(ID 유지)을 다른 유형으로 바꾼다. 글 블록끼리는 글을 보존하고, 들여쓰기는 목록끼리만 남긴다.
 * 빈 블록은 표·미디어 같은 다른 유형으로도 바꿀 수 있다 ("/" 명령). 글이 있는 블록은 내용을 잃는 전환을 하지 않는다.
 */
export function convertBlock(block: EditorBlock, type: string, attrs?: NoteBlockAttrs): EditorBlock {
  const textual = convertibleTypes.has(block.type) && convertibleTypes.has(type)
  if (!textual && block.text.trim() !== '') return block
  const kept: NoteBlockAttrs = {}
  if (listBlockTypes.has(type) && block.attrs?.indent) kept.indent = block.attrs.indent
  if (block.attrs?.placeholder && textBlockTypes.has(type)) kept.placeholder = block.attrs.placeholder
  const merged = { ...defaultAttrs(type), ...kept, ...attrs }
  const next: EditorBlock = { blockId: block.blockId, type, text: textual ? block.text : '' }
  if (Object.keys(merged).length > 0) next.attrs = merged
  return next
}

/** Enter로 나눌 때 새 블록 유형: 목록은 이어서, 나머지는 본문 */
export function continuationType(type: string): string {
  return listBlockTypes.has(type) ? type : 'PARAGRAPH'
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

/** 학생이 아직 아무것도 쓰지 않은 노트 (빈 글 블록만 있음). 표·카드·미디어 블록이 있으면 비어 있지 않다. */
export function isBlankNote(blocks: EditorBlock[]): boolean {
  return blocks.every(
    (block) =>
      (textBlockTypes.has(block.type) || multilineBlockTypes.has(block.type)) &&
      block.text.trim() === '' &&
      !block.attrs?.body?.trim() &&
      !block.attrs?.placeholder,
  )
}

/** 빈 노트의 시작 블록: 바로 입력할 수 있는 빈 본문 하나 */
export function blankNoteBlocks(): EditorBlock[] {
  return [createBlock('PARAGRAPH')]
}

export function sameContent(a: { title: string; blocks: EditorBlock[] }, b: { title: string; blocks: EditorBlock[] }): boolean {
  return a.title === b.title && JSON.stringify(toNoteBlocks(a.blocks)) === JSON.stringify(toNoteBlocks(b.blocks))
}

/** 계약 밖 형식(유형 또는 attrs)이 들어 있는지. 저장은 되지만 Mock 임시 형식이라는 안내에 쓴다 */
export function hasProvisionalBlocks(blocks: EditorBlock[]): boolean {
  return blocks.some((block) => !contractBlockTypes.has(block.type) || (block.attrs !== undefined && Object.keys(block.attrs).length > 0))
}

export function moveBlock(blocks: EditorBlock[], index: number, delta: -1 | 1): EditorBlock[] {
  const target = index + delta
  if (target < 0 || target >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** 번호 목록 번호: 같은 들여쓰기의 연속 NUMBERED끼리 센다. 더 깊은 들여쓰기 항목은 건너뛰고, 얕은 블록을 만나면 다시 1부터. */
export function listNumbers(blocks: Pick<NoteBlock, 'type' | 'attrs'>[]): number[] {
  return blocks.map((block, index) => {
    if (block.type !== 'NUMBERED') return 0
    const indent = block.attrs?.indent ?? 0
    let count = 1
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const previous = blocks[cursor]
      const previousIndent = listBlockTypes.has(previous.type) ? (previous.attrs?.indent ?? 0) : -1
      if (previousIndent > indent) continue
      if (previousIndent === indent && previous.type === 'NUMBERED') count += 1
      else break
    }
    return count
  })
}

export function headingLevel(block: Pick<NoteBlock, 'attrs'>): 1 | 2 | 3 {
  return block.attrs?.level ?? 2
}

// ---- 블록별 표시 규칙 (편집기·읽기 전용 화면 공통) ----

export const codeLanguages: { value: string; label: string }[] = [
  { value: 'plain', label: '일반 텍스트' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
]

export const calloutEmojis = ['💡', '📌', '⚠️', '✅', '❓', '🔍', '📚', '🌱']

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function urlHost(value: string): string {
  try {
    return new URL(value).host
  } catch {
    return value
  }
}

/**
 * 안전하게 삽입할 수 있는 동영상 (YouTube만). 영상 ID 형식을 확인한 뒤 youtube-nocookie 주소로 바꾼다.
 * 다른 주소는 iframe으로 넣지 않고 링크 카드로 보여준다.
 */
export function youtubeEmbedUrl(value: string): string | null {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\.|^m\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else {
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)
      id = match?.[1] ?? null
    }
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
}

/** 수식 원문 검사 (렌더러가 없어 괄호 짝·환경 짝만 확인한다). 문제가 없으면 null */
export function mathSyntaxError(source: string): string | null {
  if (source.trim() === '') return null
  let depth = 0
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '\\') {
      index += 1
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth < 0) return '닫는 중괄호 } 가 여는 중괄호보다 많아요.'
  }
  if (depth > 0) return '여는 중괄호 { 가 닫히지 않았어요.'
  const begins = source.match(/\\begin\{[^}]*\}/g)?.length ?? 0
  const ends = source.match(/\\end\{[^}]*\}/g)?.length ?? 0
  if (begins !== ends) return '\\begin 과 \\end 의 개수가 달라요.'
  return null
}

export interface ChartDatum {
  label: string
  value: number
}

/** 차트 표(첫 행 머리글, 1열 항목, 2열 값)를 막대 데이터로 읽는다. 숫자가 아닌 값은 따로 알려준다. */
export function chartData(rows: string[][] | undefined): { data: ChartDatum[]; invalid: string[] } {
  const body = (rows ?? []).slice(1)
  const data: ChartDatum[] = []
  const invalid: string[] = []
  for (const row of body) {
    const label = (row[0] ?? '').trim()
    const raw = (row[1] ?? '').trim().replace(/,/g, '')
    if (!label && !raw) continue
    const value = Number(raw)
    if (raw === '' || !Number.isFinite(value)) invalid.push(label || '(이름 없음)')
    else data.push({ label: label || '(이름 없음)', value })
  }
  return { data, invalid }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/** 블록 이름 (읽기 이름·메뉴) */
export function blockLabel(block: Pick<NoteBlock, 'type' | 'attrs'>): string {
  if (block.type === 'HEADING') return `제목 ${headingLevel(block)}`
  if (block.type === 'FILE' && block.attrs?.file?.mimeType === 'application/pdf') return 'PDF'
  const command = blockCommands.find((item) => item.type === block.type)
  if (command) return command.label
  return '블록'
}
