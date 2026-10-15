import { useId, useState, type KeyboardEvent } from 'react'
import ui from './ui.module.css'
import styles from './TagInput.module.css'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  /** 빠르게 넣을 수 있는 추천 Tag (내 Profile Tag) */
  suggestions?: string[]
}

const normalize = (value: string) => value.trim().replace(/^#/, '').replace(/\s+/g, ' ')

// Tag 입력: Enter 또는 "추가"로 넣고, 각 Tag의 삭제 Button으로 뺀다.
export function TagInput({ tags, onChange, suggestions = [] }: TagInputProps) {
  const [text, setText] = useState('')
  const inputId = useId()

  const add = (raw: string) => {
    const tag = normalize(raw)
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중 Enter는 무시한다.
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(text)
    }
  }

  const remaining = suggestions.filter((tag) => !tags.includes(tag))

  return (
    <div className={ui.field}>
      <label htmlFor={inputId} className={ui.label}>
        태그
      </label>
      <div className={styles.inputRow}>
        <input
          id={inputId}
          className={ui.input}
          value={text}
          maxLength={20}
          placeholder="예: 내신, 오답노트"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={`${inputId}-help`}
        />
        <button type="button" className={`${ui.button} ${ui.neutral}`} onClick={() => add(text)} disabled={!normalize(text)}>
          추가
        </button>
      </div>
      <p id={`${inputId}-help`} className={ui.help}>
        Student가 콘텐츠를 찾을 때 쓰는 단어예요. Enter로 추가해요.
      </p>
      {tags.length > 0 ? (
        <ul className={styles.tags} aria-label="추가한 태그">
          {tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
              <button
                type="button"
                className={styles.remove}
                onClick={() => onChange(tags.filter((item) => item !== tag))}
                aria-label={`태그 ${tag} 삭제`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={ui.meta}>아직 추가한 태그가 없어요.</p>
      )}
      {remaining.length > 0 && (
        <div className={styles.suggestions}>
          <span className={ui.meta}>내 프로필 태그</span>
          <div className={ui.chips}>
            {remaining.map((tag) => (
              <button key={tag} type="button" className={ui.chip} onClick={() => add(tag)} aria-label={`태그 ${tag} 추가`}>
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
