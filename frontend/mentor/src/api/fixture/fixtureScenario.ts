// 개발 중 Loading / Empty / Error / Retry 상태를 확인하기 위한 Fixture Scenario. (Production Build에서는 항상 normal)
//
// ?fixture=loading       읽기 요청이 끝나지 않는다 (Skeleton 확인)
// ?fixture=empty         목록이 비어 있다 (작성 Content 없음 / Q&A 없음)
// ?fixture=error         각 읽기 요청이 처음 한 번 실패하고 다시 시도하면 성공한다 (Error → Retry → Success)
// ?fixture=submit-error  각 변경 요청이 처음 한 번 실패하고 다시 시도하면 성공한다 (Submit Error → Retry)

export type FixtureScenario = 'normal' | 'loading' | 'empty' | 'error' | 'submit-error'

const scenarios: FixtureScenario[] = ['loading', 'empty', 'error', 'submit-error']

export function readFixtureScenario(): FixtureScenario {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 'normal'
  const value = new URLSearchParams(window.location.search).get('fixture')
  return scenarios.find((item) => item === value) ?? 'normal'
}
