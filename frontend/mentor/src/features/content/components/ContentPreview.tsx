import { mentorApi } from '../../../api/mentorApi.ts'
import { Badge } from '../../../components/Badge.tsx'
import ui from '../../../components/ui.module.css'
import { useResource } from '../../../lib/useResource.ts'
import { contentTypeLabel, isReviewRequired } from '../../../model/contentMeta.ts'
import { ContentBodyView, type TypedBody } from '../../../content-body/ContentBodyView.tsx'
import styles from './ContentPreview.module.css'

interface ContentPreviewProps {
  content: TypedBody & { title: string; tags: string[] }
}

// Student에게 보일 모습 미리보기. 작성 Mentor는 현재 Mentor 공개 Profile을 그대로 쓴다.
export function ContentPreview({ content }: ContentPreviewProps) {
  const { state: profile } = useResource('profile', () => mentorApi.getProfile())

  return (
    <section className={styles.preview} aria-labelledby="content-preview-title">
      <p className={styles.notice}>
        {isReviewRequired(content.type)
          ? '검수를 마친 뒤 Student에게 이렇게 보여요.'
          : '공개하면 Student에게 이렇게 보여요.'}
      </p>
      <article className={styles.card}>
        <header className={styles.header}>
          <Badge tone="accent">{`Mentor ${contentTypeLabel(content.type)}`}</Badge>
          <h2 id="content-preview-title" className={ui.sectionTitle}>
            {content.title || '제목 없음'}
          </h2>
          {profile.status === 'success' && (
            <p className={ui.meta}>
              {profile.data.name} · {profile.data.university} {profile.data.major} · {profile.data.admissionType}
            </p>
          )}
          {content.tags.length > 0 && (
            <ul className={ui.tagList} aria-label="태그">
              {content.tags.map((tag) => (
                <li key={tag} className={ui.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>
        <ContentBodyView content={content} />
      </article>
    </section>
  )
}
