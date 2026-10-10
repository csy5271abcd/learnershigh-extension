import { contentKindLabel } from '../model/format.ts'
import { mentorProfileContentKinds } from '../model/tabs.ts'
import type { MentorContentSummary, MentorProfileContent, MentorProfileContentKind } from '../model/types.ts'
import styles from './MentorProfileSections.module.css'
import { UnderlineTabs } from './UnderlineTabs.tsx'

interface MentorProfileContentsProps {
  contents: MentorProfileContent[]
  selectedKind: MentorProfileContentKind
  onKindSelect: (kind: MentorProfileContentKind) => void
  /** Content Detail 화면이 아직 없어 호출 측에서 연결한다. */
  onContentSelect?: (content: MentorContentSummary) => void
}

const tabIdPrefix = 'mentor-profile-content-tab'
const panelId = 'mentor-profile-content-panel'

export function MentorProfileContents({ contents, selectedKind, onKindSelect, onContentSelect }: MentorProfileContentsProps) {
  const tabs = mentorProfileContentKinds.map((kind) => ({
    id: kind,
    label: `${contentKindLabel[kind]} ${contents.filter((item) => item.kind === kind).length}`,
  }))
  const visible = contents.filter((item) => item.kind === selectedKind)

  return (
    <div className={styles.contents}>
      <UnderlineTabs
        items={tabs}
        selected={selectedKind}
        onSelect={onKindSelect}
        ariaLabel="Mentor Content"
        idPrefix={tabIdPrefix}
        panelId={panelId}
      />
      <div role="tabpanel" id={panelId} aria-labelledby={`${tabIdPrefix}-${selectedKind}`}>
        {visible.length > 0 ? (
          <ul className={styles.contentList}>
            {visible.map((item) => (
              <li key={item.contentId}>
                <button
                  type="button"
                  className={styles.contentRow}
                  onClick={() => onContentSelect?.({ contentId: item.contentId, kind: item.kind, title: item.title })}
                >
                  <span className={styles.contentText}>
                    <span className={styles.contentTitle}>
                      {item.title}
                      {item.adminRecommended && <span className={styles.adminBadge}>Admin 추천</span>}
                    </span>
                    <span className={styles.contentSummary}>{item.summary}</span>
                  </span>
                  <span className={styles.contentChevron} aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyNotice}>아직 공개한 {contentKindLabel[selectedKind]} 콘텐츠가 없어요.</p>
        )}
      </div>
    </div>
  )
}
