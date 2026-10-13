import { useId, useRef, useState, type FormEvent } from 'react'
import type { ApiError } from '../api/apiClient.ts'
import { studentCareApi } from '../api/studentCareApi.ts'
import { fieldMessage, formLevelError, invalidProps } from '../model/fieldErrors.ts'
import { CHANNEL_LABEL } from '../model/format.ts'
import type { NoteChannel } from '../model/types.ts'
import { useCaseCommand } from '../model/useCaseCommand.ts'
import { useErrorFocus } from '../model/useFocus.ts'
import { FieldError, InlineError } from './StateMessage.tsx'

const CHANNELS: NoteChannel[] = ['MEETING', 'CALL', 'MESSAGE', 'OTHER']

interface Props {
  branchId: string
  caseId: string
  onSaved: () => void
  onStale: (error: ApiError) => void
}

/** 면담 · 통화 메모. 케어 건의 기록에 날짜별로 남는다. */
export function NoteForm({ branchId, caseId, onSaved, onStale }: Props) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [channel, setChannel] = useState<NoteChannel>('MEETING')
  const [content, setContent] = useState('')
  // 메모는 같은 건에 여러 번 남길 수 있으므로 잠그지 않는다 (revision 없음). 보내는 중에만 막는다.
  const command = useCaseCommand(null, onStale)
  const { pending, error } = command
  useErrorFocus(error, formRef)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    void command.run(
      () => studentCareApi.addNote(branchId, caseId, channel, trimmed),
      () => {
        // 비우면 버튼이 disabled가 되므로, 먼저 입력 칸으로 Focus를 옮겨 다음 메모를 바로 쓸 수 있게 한다.
        contentRef.current?.focus()
        setContent('')
        onSaved()
      },
    )
  }

  const contentError = fieldMessage(error, ['content'], '메모는 1~1000자로 입력하세요.')
  const channelError = fieldMessage(error, ['channel'], '구분을 다시 골라주세요.')

  return (
    <form ref={formRef} className="sc-note" onSubmit={submit} aria-label="면담·통화 메모">
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
            ref={contentRef}
            id={`${id}-content`}
            rows={2}
            maxLength={1000}
            value={content}
            readOnly={pending}
            placeholder="면담·통화에서 나눈 이야기와 약속"
            onChange={(event) => setContent(event.target.value)}
            {...invalidProps(`${id}-content-error`, contentError)}
          />
          <FieldError id={`${id}-content-error`} message={contentError} />
        </div>
      </div>
      <InlineError error={formLevelError(error, [contentError, channelError])} />
      <div className="sc-actions">
        <button
          type="submit"
          className="sc-button sc-button--secondary"
          disabled={!content.trim()}
          aria-disabled={pending || undefined}
        >
          {pending ? '저장 중…' : '메모 남기기'}
        </button>
      </div>
    </form>
  )
}
