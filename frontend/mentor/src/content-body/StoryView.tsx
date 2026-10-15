import type { StoryBody } from '../api/types.ts'
import ui from '../components/ui.module.css'
import { storyTopicLabel } from './labels.ts'
import styles from './contentBody.module.css'

// Story: 본문 중심
export function StoryView({ body }: { body: StoryBody }) {
  const paragraphs = body.text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim())

  return (
    <div className={styles.body}>
      {body.summary && <p className={styles.lead}>{body.summary}</p>}
      {body.topics.length > 0 && (
        <ul className={ui.tagList} aria-label="주제">
          {body.topics.map((topic) => (
            <li key={topic} className={ui.tag}>
              {storyTopicLabel(topic)}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.prose}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}
