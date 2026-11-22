import { segmentsOf } from '../../model/noteInlineMarks.ts'

// A27-UX(계정 B) 노트 인라인 서식 그리기 (편집기의 비포커스 블록 · 학생 읽기 보기 · 관리자 열람 공용).
// 서식이 없으면 글만 그대로 돌려준다(기존 노트와 같은 결과). 링크는 저장 때와 그릴 때 모두 http(s)만 허용한다.
export function InlineText({ text, marks, linkable = true }: { text: string; marks: unknown; linkable?: boolean }) {
  const segments = segmentsOf(text, marks)
  if (segments.length === 1 && !segments[0].bold && !segments[0].italic && !segments[0].underline && !segments[0].href) return <>{text}</>
  return (
    <>
      {segments.map((segment, index) => {
        let node = <>{segment.text}</>
        if (segment.bold) node = <strong>{node}</strong>
        if (segment.italic) node = <em>{node}</em>
        if (segment.underline) node = <u>{node}</u>
        if (segment.href) {
          node = linkable ? (
            <a href={segment.href} target="_blank" rel="noopener noreferrer nofollow" data-inline-link="true">
              {node}
            </a>
          ) : (
            <span data-inline-link="true" title={segment.href}>
              {node}
            </span>
          )
        }
        return <span key={index}>{node}</span>
      })}
    </>
  )
}
