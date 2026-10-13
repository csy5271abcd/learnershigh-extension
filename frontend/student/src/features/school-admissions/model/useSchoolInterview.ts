import { useCallback, useEffect, useState } from 'react'
import type { SchoolInterviewDetailLoader, SchoolInterviewListLoader } from '../fixtures/schoolInterview.fixture.ts'
import type { InterviewQuestionDetail } from './interview.ts'
import type { LoadState } from './types.ts'

// Detail에서 Back으로 돌아올 때 Loading 없이 바로 그려야 Scroll 위치가 복원된다.
// 답변 / 연습 상태가 바뀌어 Loader가 새로 만들어져도, 같은 시나리오의 마지막 목록을 먼저 보여주고 새 값으로 바꾼다.
const lastList = new Map<string, InterviewQuestionDetail[]>()

/** 공개 면접 질문 목록. (현재는 Fixture, API 연결 시 GET /api/student/interview/questions) */
export function useSchoolInterviewList(loadList: SchoolInterviewListLoader, cacheKey: string) {
  const cached = (): LoadState<InterviewQuestionDetail[]> => {
    const data = lastList.get(cacheKey)
    return data ? { status: 'success', data } : { status: 'loading' }
  }
  const [request, setRequest] = useState({ loadList, cacheKey, attempt: 0 })
  const [state, setState] = useState<LoadState<InterviewQuestionDetail[]>>(cached)

  if (request.loadList !== loadList || request.cacheKey !== cacheKey) {
    const next = cached()
    setRequest({ loadList, cacheKey, attempt: 0 })
    if (next.status === 'success' || state.status !== 'success') setState(next)
  }

  useEffect(() => {
    let active = true
    const { loadList: load, cacheKey: key } = request
    load().then(
      (data) => {
        lastList.set(key, data)
        if (active) setState({ status: 'success', data })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [request])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  return { state, reload }
}

export type InterviewDetailState = LoadState<InterviewQuestionDetail> | { status: 'notFound' }

// 관련 활동에서 돌아올 때도 Loading 없이 마지막 질문을 먼저 그려 Scroll 위치를 복원한다. (그 뒤 새 값으로 바꾼다)
const lastDetail = new Map<string, InterviewQuestionDetail>()

/** 질문 하나. null은 Not Found, reject는 Error. 같은 질문을 다시 읽을 때는 보던 화면을 유지한다. */
export function useSchoolInterviewDetail(questionId: string, loadDetail: SchoolInterviewDetailLoader) {
  const [request, setRequest] = useState({ questionId, loadDetail, attempt: 0 })
  const cached = (): InterviewDetailState => {
    const data = lastDetail.get(questionId)
    return data ? { status: 'success', data } : { status: 'loading' }
  }
  const [state, setState] = useState<InterviewDetailState>(cached)

  if (request.questionId !== questionId || request.loadDetail !== loadDetail) {
    const keepCurrent = request.questionId === questionId && state.status === 'success'
    setRequest({ questionId, loadDetail, attempt: 0 })
    if (!keepCurrent) setState(cached())
  }

  useEffect(() => {
    let active = true
    request.loadDetail(request.questionId).then(
      (data) => {
        if (data) lastDetail.set(request.questionId, data)
        else lastDetail.delete(request.questionId)
        if (active) setState(data ? { status: 'success', data } : { status: 'notFound' })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [request])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  return { state, reload }
}
