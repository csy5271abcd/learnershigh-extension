import { studentCareApi } from '../api/studentCareApi.ts'
import { useCommand } from '../model/useCommand.ts'

interface Props {
  branchId: string
  studentId: string
  studentName: string
  onSaved: (message: string) => void
  onStale: () => void
}

/** 상담 없이 데이터만 보고 별일 아니었을 때: 기존 "문제없음" 결과(바로 관리 종료)로 저장한다. */
export function QuickClearButton({ branchId, studentId, studentName, onSaved, onStale }: Props) {
  const command = useCommand(onStale)

  function clear() {
    if (command.pending || !window.confirm(`${studentName} 학생을 이상 없음으로 관리 종료할까요?`)) return
    void command.run(
      () =>
        studentCareApi.openCase({
          branchId,
          studentId,
          channel: 'OTHER',
          memo: '데이터 확인 결과 이상 없음',
          reason: 'EXPECTED_CHANGE',
        }),
      () => onSaved('이상 없음 · 관리 종료'),
    )
  }

  return (
    <span className="sc-quick-clear">
      <button type="button" className="sc-button" aria-disabled={command.pending} onClick={clear}>
        이상 없음
      </button>
      {command.error && (
        <span className="sc-quick-clear__error" role="alert">
          저장하지 못했습니다
        </span>
      )}
    </span>
  )
}
