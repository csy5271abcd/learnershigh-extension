import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  createSchoolActivityListLoader,
  createSchoolActivityService,
  readSchoolActivityActionScenario,
  readSchoolActivityLoadScenario,
} from '../fixtures/schoolActivity.fixture.ts'
import { SCHOOL_SNAPSHOT_DATE, schoolStudentContext } from '../fixtures/schoolTasks.fixture.ts'
import { activityTypes, type ActivityType } from '../model/activity.ts'
import { SchoolActivitiesPage } from '../SchoolActivitiesPage.tsx'
import { createModalParam, schoolActivityPath, schoolArchivePath, schoolEvidencePath, schoolTasksPath } from './paths.ts'
import { SchoolActivityCreateModal } from './SchoolActivityCreateModal.tsx'

/**
 * Activities 목록(또는 Archive)에서 Detail로 들어왔다는 표시. 있으면 돌아가기를 History Back으로 처리해
 * 들어온 목록의 검색 / Filter / Scroll을 복원한다. (돌아가기 문구도 들어온 곳에 맞춘다)
 */
export type SchoolActivityDetailEntryState = { fromActivityList: true } | { fromArchive: true }

const parseType = (value: string | null): ActivityType | 'all' => activityTypes.find((item) => item.id === value)?.id ?? 'all'

const isCreateOpenedHere = (state: unknown) =>
  typeof state === 'object' && state !== null && (state as { createModalOpenedHere?: boolean }).createModalOpenedHere === true

const createTriggerId = 'school-activity-create-trigger'

// School Activities. 검색(?query=) / 유형(?type=)은 URL에 둔다. (바꿀 때 History를 쌓지 않는다)
// 활동 기록 추가는 이 화면 위 Modal(?create=1). 만들면 그 기록 Detail로 바꿔 가서, Detail에서 Back하면 목록으로 돌아온다.
// 개발용 ?fixture=loading | error | empty | activity-create-fail-once
export function SchoolActivitiesRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('query') ?? ''
  const type = parseType(searchParams.get('type'))
  const createOpen = searchParams.has(createModalParam)
  const search = searchParams.toString()
  // 활동을 만들면 다시 그려 Loader(저장소 revision)가 바뀐 값을 읽게 한다.
  const [, setRevision] = useState(0)

  const loadList = createSchoolActivityListLoader(import.meta.env.DEV ? readSchoolActivityLoadScenario(search) : 'success')
  const service = createSchoolActivityService(import.meta.env.DEV ? readSchoolActivityActionScenario(search) : 'success')

  const updateParams = (apply: (params: URLSearchParams) => void) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        apply(params)
        return params
      },
      { replace: true, preventScrollReset: true },
    )

  const openCreate = () => {
    const params = new URLSearchParams(searchParams)
    params.set(createModalParam, '1')
    // History에 남겨 Browser Back으로 Modal이 닫히게 한다.
    navigate({ search: `?${params.toString()}` }, { state: { createModalOpenedHere: true }, preventScrollReset: true })
  }

  const closeCreate = (activityId?: string) => {
    if (activityId) {
      setRevision((value) => value + 1)
      // Modal 기록을 새 활동 Detail로 바꾼다. (Detail에서 Back하면 Modal이 아니라 목록으로)
      const state: SchoolActivityDetailEntryState = { fromActivityList: true }
      navigate(schoolActivityPath(activityId), { replace: true, state })
      return
    }
    if (isCreateOpenedHere(location.state)) navigate(-1)
    else
      updateParams((params) => {
        params.delete(createModalParam)
      })
  }

  // Modal이 만들지 않고 닫히면 "활동 기록 추가" 버튼으로 Focus를 돌려준다.
  const wasOpenRef = useRef(createOpen)
  useEffect(() => {
    if (wasOpenRef.current && !createOpen) document.getElementById(createTriggerId)?.focus({ preventScroll: true })
    wasOpenRef.current = createOpen
  }, [createOpen])

  return (
    <>
      <SchoolActivitiesPage
        loadList={loadList}
        query={query}
        type={type}
        snapshotDate={SCHOOL_SNAPSHOT_DATE}
        onQueryChange={(next) =>
          updateParams((params) => {
            if (next) params.set('query', next)
            else params.delete('query')
          })
        }
        onTypeChange={(next) =>
          updateParams((params) => {
            if (next === 'all') params.delete('type')
            else params.set('type', next)
          })
        }
        onReset={() =>
          updateParams((params) => {
            params.delete('query')
            params.delete('type')
          })
        }
        onOpen={(activityId) => {
          const state: SchoolActivityDetailEntryState = { fromActivityList: true }
          navigate(schoolActivityPath(activityId), { state })
        }}
        onCreate={openCreate}
        createTriggerId={createTriggerId}
        studentGrade={schoolStudentContext.grade}
        onSectionSelect={(id) => {
          if (id === 'tasks') navigate(schoolTasksPath)
          else if (id === 'evidence') navigate(schoolEvidencePath)
          else if (id === 'archive') navigate(schoolArchivePath)
        }}
      />
      {createOpen && <SchoolActivityCreateModal service={service} onClose={closeCreate} />}
    </>
  )
}
