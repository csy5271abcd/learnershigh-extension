import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { CHANNEL_LABEL } from '../model/format.ts'
import type { NoteChannel } from '../model/types.ts'
import { InlineError } from './StateMessage.tsx'

const CHANNELS: NoteChannel[] = ['MEETING', 'CALL', 'MESSAGE', 'OTHER']

/** 면담 · 통화 메모. 케어 건의 기록에 날짜별로 남는다. */
export function NoteForm({ caseId, onSaved }: { caseId: string; onSaved: () => void }) {
  const id = useId()
  const [channel, setChannel] = useState<NoteChannel>('MEETING')
  const [content, setContent] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim() || pending) return
    setPending(true)
    setError(null)
    try {
      await studentCareApi.addNote(caseId, channel, content.trim())
      setContent('')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, 'UNKNOWN_ERROR', String(caught), []))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="sc-note" onSubmit={submit} aria-label="면담·통화 메모">
      <div className="sc-note__row">
        <div className="sc-field sc-field--narrow">
          <label htmlFor={`${id}-channel`}>구분</label>
          <select
            id={`${id}-channel`}
            value={channel}
            onChange={(event) => setChannel(event.target.value as NoteChannel)}
          >
            {CHANNELS.map((value) => (
              <option key={value} value={value}>
                {CHANNEL_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="sc-field sc-field--grow">
          <label htmlFor={`${id}-content`}>메모</label>
          <textarea
            id={`${id}-content`}
            rows={2}
            maxLength={1000}
            value={content}
            placeholder="면담·통화에서 나눈 이야기와 약속"
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
      </div>
      <InlineError error={error} />
      <div className="sc-actions">
        <button type="submit" className="sc-button sc-button--secondary" disabled={!content.trim() || pending}>
          {pending ? '저장 중…' : '메모 남기기'}
        </button>
      </div>
    </form>
  )
}
