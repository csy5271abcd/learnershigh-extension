import type { ReactNode } from 'react'

interface Option<T extends string> {
  value: T
  label: ReactNode
}

interface Props<T extends string> {
  name: string
  legend: string
  options: readonly Option<T>[]
  value: T | null
  onChange: (value: T) => void
  error?: string | null
}

/** 한 가지를 고르는 버튼 묶음 (radio). 화살표 키로 옮긴다. */
export function Choice<T extends string>({ name, legend, options, value, onChange, error }: Props<T>) {
  const errorId = `${name}-error`
  return (
    <fieldset className="sc-field" aria-describedby={error ? errorId : undefined}>
      <legend className="sc-field__label">{legend}</legend>
      <div className="sc-choice">
        {options.map((option) => (
          <label key={option.value} className="sc-choice__item">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option.value)}
            />
            <span className="sc-choice__text">{option.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="sc-field__error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
