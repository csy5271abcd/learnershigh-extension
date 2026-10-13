import { contentKindLabel } from '../model/format.ts'
import type { MentorContentSummary } from '../model/types.ts'
import styles from './RelatedContentList.module.css'

interface RelatedContentListProps {
  items: MentorContentSummary[]
  /** Detail 화면이 있는 유형이면 이동 함수를 돌려준다. 없으면 이동하지 않는 항목으로 보여준다. */
  resolveLink: (content: MentorContentSummary) => (() => void) | undefined
}

// 관련 콘텐츠 줄 (StudentQ&A-01 Mockup). Q&A 답변 / Record Detail이 함께 쓴다.
// Detail 화면이 없는 유형은 이동하지 않는 항목으로 보여준다.
export function RelatedContentList({ items, resolveLink }: RelatedContentListProps) {
  if (items.length === 0) return null
  return (
    <ul className={styles.related} aria-label="관련 콘텐츠">
      {items.map((item) => {
        const open = resolveLink(item)
        const body = (
          <>
            <span className={styles.relatedKind}>{contentKindLabel[item.kind]}</span>
            <span className={styles.relatedTitle}>{item.title}</span>
          </>
        )
        return (
          <li key={item.contentId}>
            {open ? (
              <button type="button" className={styles.relatedItem} onClick={open}>
                {body}
                <span className={styles.relatedChevron} aria-hidden="true">
                  ›
                </span>
              </button>
            ) : (
              <p className={`${styles.relatedItem} ${styles.relatedStatic}`}>
                {body}
                <span className={styles.relatedNote}>화면 준비 중</span>
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
