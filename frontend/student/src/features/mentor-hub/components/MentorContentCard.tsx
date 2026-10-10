import { contentKindLabel, mentorAffiliation } from '../model/format.ts'
import type { MentorContentSummary, MixedContentItem } from '../model/types.ts'
import styles from './MentorContentCard.module.css'

interface MentorContentCardProps {
  item: MixedContentItem
  onContentSelect?: (content: MentorContentSummary) => void
}

// 제목 Button이 Card 전체 영역으로 확장되어 Card 어디를 눌러도 선택된다.
export function MentorContentCard({ item, onContentSelect }: MentorContentCardProps) {
  const { mentor } = item

  return (
    <article className={styles.card}>
      <p className={styles.kind}>{contentKindLabel[item.kind]}</p>
      <h3 className={styles.title}>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => onContentSelect?.({ contentId: item.contentId, kind: item.kind, title: item.title })}
        >
          {item.title}
        </button>
      </h3>
      <p className={styles.summary}>{item.summary}</p>
      <p className={styles.mentor}>
        {mentor.name} · {mentorAffiliation(mentor)} · {mentor.admissionType}
      </p>
    </article>
  )
}
