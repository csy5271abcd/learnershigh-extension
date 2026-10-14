import { forwardRef } from 'react'
import ui from '../../../components/ui.module.css'

// 입력 문제 목록. 저장 / 다음 단계로 못 가는 이유를 한곳에 모아 보여 주고 Focus를 받는다.
export const FormErrorSummary = forwardRef<HTMLDivElement, { errors: string[] }>(function FormErrorSummary({ errors }, ref) {
  if (errors.length === 0) return null
  return (
    <div ref={ref} tabIndex={-1} className={`${ui.alert} ${ui.alertError}`} role="alert">
      <div>
        <p>
          <strong>입력을 확인해 주세요.</strong>
        </p>
        <ul>
          {errors.map((error) => (
            <li key={error}>· {error}</li>
          ))}
        </ul>
      </div>
    </div>
  )
})
