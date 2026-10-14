import { useId, useState } from 'react'
import type { MentorContentListItem, PageResult } from '../../../api/types.ts'
import { Badge } from '../../../components/Badge.tsx'
import { EmptyState } from '../../../components/PageState.tsx'
import ui from '../../../components/ui.module.css'
import type { ResourceState } from '../../../lib/useResource.ts'
import { contentTypeLabel } from '../../../model/contentMeta.ts'
import styles from './RelatedContentPicker.module.css'

interface RelatedContentPickerProps {
  /** 내 Published Content (GET /api/mentor/content?status=PUBLISHED) */
  contents: ResourceState<PageResult<MentorContentListItem>>
  onRetry: () => void
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

// 답변에 연결할 내 Content를 검색 / 선택한다. 연결은 참조(contentId)만 보내고 본문을 복제하지 않는다. (frontend-mentor.md §9)
// Student에게 보이는 Published Content만 고를 수 있다. (Draft / 검수 중 Record · Case를 답변으로 노출하지 않게)
export function RelatedContentPicker({ contents, onRetry, selectedIds, onChange, disabled }: RelatedContentPickerProps) {
  const [query, setQuery] = useState('')
  const searchId = useId()

  const toggle = (contentId: string) =>
    onChange(selectedIds.includes(contentId) ? selectedIds.filter((id) => id !== contentId) : [...selectedIds, contentId])

  const items = contents.status === 'success' ? contents.data.items : []
  const selected = selectedIds
    .map((id) => items.find((item) => item.contentId === id))
    .filter((item): item is MentorContentListItem => Boolean(item))
  const needle = query.trim().toLowerCase()
  const matches = items.filter(
    (item) => !needle || item.title.toLowerCase().includes(needle) || item.tags.some((tag) => tag.toLowerCase().includes(needle)),
  )

  return (
    <fieldset className={styles.picker} disabled={disabled}>
      <legend className={ui.label}>
        관련 콘텐츠 연결<span className={ui.optional}>(선택)</span>
      </legend>
      <p className={ui.help}>답변과 함께 볼 내 공개 콘텐츠를 고르면 Student Q&A에 링크로 보여요.</p>

      {selected.length > 0 && (
        <ul className={styles.selected} aria-label="연결한 콘텐츠">
          {selected.map((item) => (
            <li key={item.contentId} className={styles.selectedItem}>
              <Badge tone="accent">{contentTypeLabel(item.type)}</Badge>
              <span className={styles.selectedTitle}>{item.title}</span>
              <button
                type="button"
                className={`${ui.button} ${ui.ghost} ${ui.small}`}
                onClick={() => toggle(item.contentId)}
                aria-label={`${item.title} 연결 해제`}
              >
                해제
              </button>
            </li>
          ))}
        </ul>
      )}

      {contents.status === 'loading' && (
        <p className={ui.meta} role="status">
          내 콘텐츠를 불러오는 중이에요…
        </p>
      )}
      {(contents.status === 'error' || contents.status === 'notFound') && (
        <div className={`${ui.alert} ${ui.alertError}`} role="alert">
          <span>내 콘텐츠를 불러오지 못했어요. 연결 없이 답변할 수도 있어요.</span>
          <button type="button" className={`${ui.button} ${ui.neutral} ${ui.small}`} onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}
      {contents.status === 'success' && items.length === 0 && (
        <EmptyState title="연결할 수 있는 공개 콘텐츠가 없어요." description="콘텐츠를 공개하면 답변에 연결할 수 있어요." />
      )}
      {contents.status === 'success' && items.length > 0 && (
        <>
          <label htmlFor={searchId} className="visually-hidden">
            연결할 콘텐츠 검색
          </label>
          <input
            id={searchId}
            type="search"
            className={ui.input}
            placeholder="제목 또는 태그로 찾기"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {matches.length === 0 ? (
            <p className={ui.meta}>'{query.trim()}'에 맞는 콘텐츠가 없어요.</p>
          ) : (
            <ul className={styles.options}>
              {matches.map((item) => (
                <li key={item.contentId}>
                  <label className={styles.option}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.contentId)}
                      onChange={() => toggle(item.contentId)}
                    />
                    <Badge>{contentTypeLabel(item.type)}</Badge>
                    <span>{item.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </fieldset>
  )
}
