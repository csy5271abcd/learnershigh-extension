import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { studentCareApi } from '../api/studentCareApi.ts'
import { addDays, CHANNELS, RECHECK_CHOICES, REASONS, shortDate } from '../model/format.ts'
import type { CareReason, NoteChannel } from '../model/types.ts'
import { useCommand } from '../model/useCommand.ts'
import { Choice } from './Choice.tsx'

const MEMO_MAX = 1000

interface Props {
  branchId: string
  studentId: string
  asOf: string
  /** 관리 중이면 그 건에 상담 기록만 남긴다 (65-7). 아니면 결과와 함께 관리를 연다 (65-4). */
  caseId: string | null
  onSaved: (message: string) => void
  onStale: () => void
}

export function CounselForm({ branchId, studentId, asOf, caseId, onSaved, onStale }: Props) {
  const id = useId()
  const [channel, setChannel] = useState<NoteChannel | null>(null)
  const [memo, setMemo] = useState('')
  const [reason, setReason] = useState<CareReason | null>(null)
  const [days, setDays] = useState('7')
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set())
  const command = useCommand(onStale)
  const withResult = caseId === null
  const formRef = useRef<HTMLFormElement>(null)

  // 빠진 항목이 표시되면 첫 칸으로 Focus를 옮긴다.
  useLayoutEffect(() => {
    if (missing.size > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [missing])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = new Set<string>()
    if (!channel) next.add('channel')
    if (withResult && !reason) next.add('reason')
    if (!withResult && memo.trim() === '') next.add('memo')
    setMissing(next)
    if (next.size > 0 || !channel) return
    if (caseId !== null) {
      void command.run(
        () => studentCareApi.addNote(branchId, caseId, channel, memo.trim()),
        () => {
          setMemo('')
          setChannel(null)
          onSaved('상담 기록 저장')
        },
      )
      return
    }
    const chosen = reason as CareReason
    const recheckDate = chosen === 'ADJUSTMENT_NEEDED' ? addDays(asOf, Number(days)) : undefined
    void command.run(
      () => studentCareApi.openCase({ branchId, studentId, channel, memo: memo.trim(), reason: chosen, recheckDate }),
      (saved) => {
        const label = REASONS.find((item) => item.value === chosen)?.label ?? ''
        onSaved(saved.status === 'CLOSED' ? `${label} · 관리 종료` : `계속 관리 · 다음 점검 ${shortDate(saved.recheckDate ?? '')}`)
      },
    )
  }

  const flag = (key: string) => (missing.has(key) ? key : null)

  return (
    <form ref={formRef} className="sc-form" onSubmit={submit} noValidate aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="sc-section-title">
        상담 기록
      </h3>
      <Choice
        name={`${id}-channel`}
        legend="방식"
        options={CHANNELS}
        value={channel}
        onChange={(value) => setChannel(value)}
        error={flag('channel') && '방식을 고르세요'}
      />
      <div className="sc-field">
        <label className="sc-field__label" htmlFor={`${id}-memo`}>
          내용
        </label>
        <textarea
          id={`${id}-memo`}
          className="sc-textarea"
          rows={3}
          maxLength={MEMO_MAX}
          value={memo}
          aria-invalid={flag('memo') ? true : undefined}
          aria-describedby={flag('memo') ? `${id}-memo-error` : undefined}
          onChange={(event) => setMemo(event.target.value)}
        />
        {flag('memo') && (
          <p id={`${id}-memo-error`} className="sc-field__error">
            내용을 입력하세요
          </p>
        )}
      </div>
      {withResult && (
        <Choice
          name={`${id}-reason`}
          legend="결과"
          options={REASONS}
          value={reason}
          onChange={(value) => setReason(value)}
          error={flag('reason') && '결과를 고르세요'}
        />
      )}
      {withResult && reason === 'ADJUSTMENT_NEEDED' && (
        <Choice
          name={`${id}-days`}
          legend="다음 점검일"
          options={RECHECK_CHOICES.map((choice) => ({
            value: String(choice.days),
            label: (
              <>
                {choice.label} <span className="sc-choice__sub">{shortDate(addDays(asOf, choice.days))}</span>
              </>
            ),
          }))}
          value={days}
          onChange={setDays}
        />
      )}
      {command.error && (
        <p className="sc-error" role="alert">
          {command.error.message}
        </p>
      )}
      <button type="submit" className="sc-button sc-button--primary" aria-disabled={command.pending || undefined}>
        {command.pending ? '저장 중' : '저장'}
      </button>
    </form>
  )
}
