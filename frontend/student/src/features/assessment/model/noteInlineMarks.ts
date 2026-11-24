// A27-UX(계정 B) 탐구 노트 인라인 서식 (굵게·기울임·밑줄·링크).
// 저장 형식: 블록 `text`는 지금처럼 순수 문자열로 두고, 서식은 `attrs.marks`에 글자 범위로만 더한다.
//   { type: 'bold' | 'italic' | 'underline' | 'link', start, end, href? }  (start 포함 · end 미포함, UTF-16 위치 = textarea 위치)
// - 기존 노트(서식 없음)는 그대로 읽히고, 서식을 모르는 화면(이전 Revision·관리자 열람 등)은 순수 글을 그대로 보여 준다 → 기존 데이터 손실 없음.
// - Backend는 블록 객체(attrs 포함)를 그대로 보존한다(§20, OD-A05 전 임시 형식). 서식 Schema 확정은 Editor 결정(OD-A05)에서 다시 본다.
// - 링크는 http(s) 주소만 저장한다. 값을 만들거나 바꾸지 않는다.

export type MarkType = 'bold' | 'italic' | 'underline' | 'link'
export interface InlineMark {
  type: MarkType
  start: number
  end: number
  href?: string
}

const markTypes: MarkType[] = ['bold', 'italic', 'underline', 'link']

export function safeHref(value: string): string | null {
  const text = value.trim()
  if (!text) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** 저장값을 믿지 않고 모양·범위를 다시 맞춘다. 같은 종류(같은 주소)의 겹치거나 붙은 범위는 합친다 */
export function normalizeMarks(raw: unknown, length: number): InlineMark[] {
  if (!Array.isArray(raw)) return []
  const valid: InlineMark[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { type, start, end, href } = item as Record<string, unknown>
    if (!markTypes.includes(type as MarkType) || typeof start !== 'number' || typeof end !== 'number') continue
    const from = Math.max(0, Math.min(length, Math.floor(start)))
    const to = Math.max(0, Math.min(length, Math.floor(end)))
    if (to <= from) continue
    if (type === 'link') {
      const safe = typeof href === 'string' ? safeHref(href) : null
      if (!safe) continue
      valid.push({ type, start: from, end: to, href: safe })
    } else valid.push({ type: type as MarkType, start: from, end: to })
  }
  valid.sort((a, b) => a.type.localeCompare(b.type) || (a.href ?? '').localeCompare(b.href ?? '') || a.start - b.start)
  const merged: InlineMark[] = []
  for (const mark of valid) {
    const last = merged[merged.length - 1]
    if (last && last.type === mark.type && last.href === mark.href && mark.start <= last.end) last.end = Math.max(last.end, mark.end)
    else merged.push({ ...mark })
  }
  return merged.sort((a, b) => a.start - b.start || a.type.localeCompare(b.type))
}

/** 글이 바뀌면(입력·붙여넣기·지우기·한글 조합) 바뀐 한 구간을 찾아 범위를 옮기거나 줄인다. 범위 끝에서 이어 친 글자는 서식을 넓히지 않는다 */
export function adjustMarks(oldText: string, newText: string, marks: InlineMark[]): InlineMark[] {
  if (marks.length === 0 || oldText === newText) return marks
  let prefix = 0
  const max = Math.min(oldText.length, newText.length)
  while (prefix < max && oldText[prefix] === newText[prefix]) prefix += 1
  let suffix = 0
  while (suffix < max - prefix && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix += 1
  const oldEnd = oldText.length - suffix
  const delta = newText.length - oldText.length
  const moved = marks.map((mark) => {
    const shift = (position: number, isEnd: boolean) => {
      if (position < prefix || (isEnd && position === prefix)) return position
      if (position >= oldEnd) return position + delta
      // 지운 구간 안: 바뀐 구간의 시작(끝 쪽은 새 글자 뒤)으로 모은다
      return isEnd ? prefix : prefix + (newText.length - suffix - prefix)
    }
    return { ...mark, start: shift(mark.start, false), end: shift(mark.end, true) }
  })
  return normalizeMarks(moved, newText.length)
}

/** 선택 범위 서식 켜기·끄기. 범위 전체에 이미 같은 서식이 있으면 끈다(링크는 주소를 바꿔 다시 건다) */
export function toggleMark(marks: InlineMark[], type: MarkType, start: number, end: number, length: number, href?: string): InlineMark[] {
  if (end <= start) return marks
  const covered = marks.some((mark) => mark.type === type && mark.start <= start && mark.end >= end && (type !== 'link' || href === undefined || mark.href === href))
  const cut: InlineMark[] = []
  for (const mark of marks) {
    if (mark.type !== type || mark.end <= start || mark.start >= end) {
      cut.push(mark)
      continue
    }
    if (mark.start < start) cut.push({ ...mark, end: start })
    if (mark.end > end) cut.push({ ...mark, start: end })
  }
  if (covered && (type !== 'link' || href === undefined)) return normalizeMarks(cut, length)
  const added: InlineMark = type === 'link' ? { type, start, end, href } : { type, start, end }
  return normalizeMarks([...cut, added], length)
}

export function hasMark(marks: InlineMark[], type: MarkType, start: number, end: number): boolean {
  if (end <= start) return marks.some((mark) => mark.type === type && mark.start < start && mark.end >= start)
  return marks.some((mark) => mark.type === type && mark.start <= start && mark.end >= end)
}

/** Enter로 나눌 때: 앞 블록은 [0, cut), 뒤 블록은 [resume, 끝)을 0부터 다시 센다 */
export function splitMarks(marks: InlineMark[], cut: number, resume: number, length: number): [InlineMark[], InlineMark[]] {
  const before = normalizeMarks(marks.map((mark) => ({ ...mark, end: Math.min(mark.end, cut) })), cut)
  const after = normalizeMarks(
    marks.map((mark) => ({ ...mark, start: Math.max(mark.start, resume) - resume, end: mark.end - resume })),
    length - resume,
  )
  return [before, after]
}

/** 블록을 이어 붙일 때 뒤 블록 서식을 앞 글 길이만큼 민다 */
export function concatMarks(first: InlineMark[], firstLength: number, second: InlineMark[], totalLength: number): InlineMark[] {
  return normalizeMarks([...first, ...second.map((mark) => ({ ...mark, start: mark.start + firstLength, end: mark.end + firstLength }))], totalLength)
}

export interface TextSegment {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
  href: string | null
}

/** 화면 그리기용: 서식 경계마다 글을 나눈다 */
export function segmentsOf(text: string, raw: unknown): TextSegment[] {
  const marks = normalizeMarks(raw, text.length)
  if (marks.length === 0) return [{ text, bold: false, italic: false, underline: false, href: null }]
  const cuts = new Set<number>([0, text.length])
  for (const mark of marks) {
    cuts.add(mark.start)
    cuts.add(mark.end)
  }
  const points = [...cuts].sort((a, b) => a - b)
  const segments: TextSegment[] = []
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    if (to <= from) continue
    const active = marks.filter((mark) => mark.start <= from && mark.end >= to)
    segments.push({
      text: text.slice(from, to),
      bold: active.some((mark) => mark.type === 'bold'),
      italic: active.some((mark) => mark.type === 'italic'),
      underline: active.some((mark) => mark.type === 'underline'),
      href: active.find((mark) => mark.type === 'link')?.href ?? null,
    })
  }
  return segments
}

/** attrs에 서식을 넣거나(비면) 뺀다. 다른 attrs는 그대로 둔다 */
export function withMarks<T extends { attrs?: object }>(block: T, marks: InlineMark[]): T {
  const attrs: Record<string, unknown> = { ...(block.attrs ?? {}) }
  if (marks.length > 0) attrs.marks = marks
  else delete attrs.marks
  const next = { ...block, attrs } as T
  if (Object.keys(attrs).length === 0) delete (next as { attrs?: object }).attrs
  return next
}

export const marksOf = (block: { text: string; attrs?: object }) => normalizeMarks((block.attrs as { marks?: unknown } | undefined)?.marks, block.text.length)
