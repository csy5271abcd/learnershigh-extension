import { Link } from 'react-router'
import type { PublicMentorAuthor } from '../../../api/discover/types.ts'
import { discoverMentorPath } from '../../../app/paths.ts'
import { Avatar } from '../../../components/Avatar.tsx'
import styles from './AuthorLine.module.css'

/** 공개 Content 작성 Mentor. 이름을 누르면 그 Mentor의 공개 Profile로 간다. */
export function AuthorLine({ author, size = 28 }: { author: PublicMentorAuthor; size?: number }) {
  return (
    <p className={styles.author}>
      <Avatar name={author.name} imageUrl={author.profileImageUrl} size={size} decorative />
      <Link to={discoverMentorPath(author.mentorId)} className={styles.name}>
        {author.name}
      </Link>
      <span className={styles.affiliation}>
        {author.university} · {author.major}
      </span>
    </p>
  )
}
