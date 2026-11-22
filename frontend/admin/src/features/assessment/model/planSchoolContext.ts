import { listPlanYears, listSchools, searchSchools } from '../api/assessmentAdminApi.ts'
import { useRemote } from './useRemote.ts'
import { planYearOptions } from './schoolInfoSync.ts'

// A27-UX: 평가계획서(6슬롯)·분석·월별 운영계획·전체 현황이 같은 '학교 · 학년도' 선택을 쓴다.
// 학교 목록 = 담당 학생의 학교(지점 범위) 먼저, 그다음 평가계획서가 등록된 다른 학교. 전체 학교 Master는 아직 없다(API-OD-A01).
// 선택 값은 URL Query(school·year)에 둬서 새로고침·직접 주소·탭 이동에서 유지된다.
export interface SchoolOption {
  schoolId: string
  label: string
  name: string
  /** A28-02: 담당 학생이 있는 학교(true) · 담당 학생 없이 조회하는 외부 학교(false) */
  managed: boolean
}

export function usePlanSchoolContext(search: URLSearchParams) {
  const schools = useRemote(() => listSchools(), [])
  const registered = useRemote(() => searchSchools(), [])
  const known = schools.state.status === 'success' ? schools.state.data.items : []
  const registeredItems = registered.state.status === 'success' ? registered.state.data.items : []
  const managed = known.filter((school) => (school.studentCount ?? 0) > 0)
  const options: SchoolOption[] = [
    ...managed.map((school) => ({ schoolId: school.schoolId, name: school.name, label: `${school.name} · 담당 학생 ${school.studentCount}명`, managed: true })),
    ...registeredItems
      .filter((item) => !managed.some((school) => school.schoolId === item.schoolId))
      .map((item) => ({ schoolId: item.schoolId, name: item.name ?? '이름 미확인 학교', label: `${item.name ?? '이름 미확인 학교'} · 평가계획서 ${item.planCount}건`, managed: false })),
  ]
  const schoolId = search.get('school') ?? options[0]?.schoolId ?? ''
  const selected = options.find((option) => option.schoolId === schoolId)
  const years = useRemote(() => (schoolId ? listPlanYears(schoolId) : Promise.resolve([] as number[])), [schoolId])
  // 부록 N5-2: 등록 문서가 있는 해만이 아니라 최근 3개 학년도(올해·작년·재작년)를 항상 보여 준다
  const yearList = schoolId ? planYearOptions(years.state.status === 'success' ? years.state.data : []) : []
  const year = Number(search.get('year') ?? '') || yearList[0] || null
  const loading = schools.state.status === 'loading' || registered.state.status === 'loading'
  const failed = schools.state.status === 'error' && registered.state.status === 'error'
  return {
    options,
    schoolId,
    schoolName: selected?.name ?? (schoolId ? '선택한 학교' : ''),
    // A28-02: 담당 학생이 없는 학교를 보고 있는가(검색으로 고른 학교 포함). 조회는 막지 않는다 — 담당 관계·학적은 바뀌지 않는다
    external: Boolean(schoolId) && !selected?.managed,
    yearList,
    year,
    loading,
    failed,
    retry: () => {
      schools.reload()
      registered.reload()
    },
  }
}

