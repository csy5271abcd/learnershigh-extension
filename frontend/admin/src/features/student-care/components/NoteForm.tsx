import { useId, useState, type FormEvent } from 'react'
import { toApiError, type ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { fieldMessage, invalidProps } from '../model/fieldErrors.ts'
import { CHANNEL_LABEL } from '../model/format.ts'
import { needsReload } from '../model/savedNotice.ts'
import type { NoteChannel } from '../model/types.ts'
import { FieldError, InlineError } from './StateMessage.tsx'

const CHANNELS: NoteChannel[] = ['MEETING', 'CALL', 'MESSAGE', 'OTHER']

interface Props {
  branchId: string
  caseId: string
  onSaved: () => void
  onReloadNeeded: () => void
}

/** 면담 · 통화 메모. 케어 건의 기록에 날짜별로 남는다. */
export function NoteForm({ branchId, caseId, onSaved, onReloadNeeded }: Props) {
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
      await studentCareApi.addNote(branchId, caseId, channel, content.trim())
      setContent('')
      onSaved()
    } catch (caught) {
      const apiError = toApiError(caught)
      setError(apiError)
      if (needsReload(apiError.code)) onReloadNeeded()
    } finally {
      setPending(false)
    }
  }

  const contentError = fieldMessage(error, ['content'], '메모는 1~1000자로 입력하세요.')
  const channelError = fieldMessage(error, ['channel'], '구분을 다시 골라주세요.')

  return (
    <form className="sc-note" onSubmit={submit} aria-label="면담·통화 메모">
      <div className="sc-note__row">
        <div className="sc-field sc-field--narrow">
          <label htmlFor={`${id}-channel`}>구분</label>
          <select
            id={`${id}-channel`}
            value={channel}
            onChange={(event) => setChannel(event.target.value as NoteChannel)}
            {...invalidProps(`${id}-channel-error`, channelError)}
          >
            {CHANNELS.map((value) => (
              <option key={value} value={value}>
                {CHANNEL_LABEL[value]}
              </option>
            ))}
          </select>
          <FieldError id={`${id}-channel-error`} message={channelError} />
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
            {...invalidProps(`${id}-content-error`, contentError)}
          />
          <FieldError id={`${id}-content-error`} message={contentError} />
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
