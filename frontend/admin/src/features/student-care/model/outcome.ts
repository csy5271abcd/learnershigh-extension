import type { CareCase } from './types.ts'

/** 저장 뒤 페이지에 알릴 결과. 종결되면 학생이 목록에서 빠지므로 선택을 해제한다. */
export interface Outcome {
  message: string
  keepSelection: boolean
}

export function outcomeOf(careCase: CareCase, studentName: string): Outcome {
  if (careCase.status === 'CLOSED') {
    return { message: `${studentName}: 종결했습니다. 학생 기록 탭에서 과정을 볼 수 있습니다.`, keepSelection: false }
  }
  const last = careCase.events[careCase.events.length - 1]
  if (last?.type === 'ADJUSTMENT_STARTED') {
    return { message: `${studentName}: 조정을 시작했습니다. 조정 진행 중 목록으로 옮겼습니다.`, keepSelection: true }
  }
  return { message: `${studentName}: 결정을 저장했습니다.`, keepSelection: true }
}
