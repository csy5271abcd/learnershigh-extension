import type { StoryBody, StoryTopic } from '../../../api/types.ts'
import { TextAreaField, TextField } from '../../../components/FormFields.tsx'
import ui from '../../../components/ui.module.css'
import { storyTopics } from '../../../content-body/labels.ts'

interface StoryEditorProps {
  value: StoryBody
  onChange: (next: StoryBody) => void
}

// Story: 한 줄 요약 · 주제 · 본문
export function StoryEditor({ value, onChange }: StoryEditorProps) {
  const toggleTopic = (topic: StoryTopic) =>
    onChange({
      ...value,
      topics: value.topics.includes(topic) ? value.topics.filter((item) => item !== topic) : [...value.topics, topic],
    })

  return (
    <div className={ui.form}>
      <TextField
        label="한 줄 요약"
        value={value.summary}
        onChange={(event) => onChange({ ...value, summary: event.target.value })}
        help="목록 Card에 보이는 문장이에요."
      />
      <fieldset className={ui.field}>
        <legend className={ui.label}>주제</legend>
        <div className={ui.chips}>
          {storyTopics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={ui.chip}
              aria-pressed={value.topics.includes(topic.id)}
              onClick={() => toggleTopic(topic.id)}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </fieldset>
      <TextAreaField
        label="본문"
        rows={12}
        value={value.text}
        onChange={(event) => onChange({ ...value, text: event.target.value })}
        help="빈 줄로 문단을 나눠요."
      />
    </div>
  )
}
