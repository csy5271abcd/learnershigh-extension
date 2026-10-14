import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import ui from './ui.module.css'

interface FieldShellProps {
  label: string
  help?: ReactNode
  error?: string
  optional?: boolean
  compact?: boolean
}

function FieldShell({
  id,
  label,
  help,
  error,
  optional,
  compact,
  children,
}: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={ui.field}>
      <label htmlFor={id} className={compact ? ui.compactLabel : ui.label}>
        {label}
        {optional && <span className={ui.optional}>(선택)</span>}
      </label>
      {children}
      {help && (
        <p id={`${id}-help`} className={ui.help}>
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={ui.fieldError}>
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, help: unknown, error: unknown) {
  return [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}

type TextFieldProps = FieldShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>

export function TextField({ label, help, error, optional, compact, ...input }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} help={help} error={error} optional={optional} compact={compact}>
      <input
        id={id}
        className={ui.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...input}
      />
    </FieldShell>
  )
}

type TextAreaFieldProps = FieldShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>

export function TextAreaField({ label, help, error, optional, compact, ...textarea }: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} help={help} error={error} optional={optional} compact={compact}>
      <textarea
        id={id}
        className={ui.textarea}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        {...textarea}
      />
    </FieldShell>
  )
}

type SelectFieldProps = FieldShellProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'>

export function SelectField({ label, help, error, optional, compact, children, ...select }: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} help={help} error={error} optional={optional} compact={compact}>
      <select id={id} className={ui.select} aria-describedby={describedBy(id, help, error)} {...select}>
        {children}
      </select>
    </FieldShell>
  )
}
