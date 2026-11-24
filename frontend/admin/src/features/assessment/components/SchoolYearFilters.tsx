import type { ReactNode } from 'react'
import type { usePlanSchoolContext } from '../model/planSchoolContext.ts'
import { relativeYearLabel } from '../model/schoolInfoSync.ts'
import review from '../review/review.module.css'

// A27-UX 공용 학교·학년도 Filter (평가계획서·분석·월별 운영계획·전체 현황)
export function SchoolYearFilters({
  context,
  onChange,
  extra,
}: {
  context: ReturnType<typeof usePlanSchoolContext>
  onChange: (entries: Record<string, string | null>) => void
  extra?: ReactNode
}) {
  return (
    <div className={review.toolbar} data-testid="school-year-filters">
      <select className={review.select} aria-label="학교" value={context.schoolId} onChange={(event) => onChange({ school: event.target.value, year: null })} data-testid="filter-school">
        {context.options.length === 0 && <option value="">{context.loading ? '학교를 불러오는 중' : '학교 없음'}</option>}
        {/* A28-02: 담당 학교와 검색·등록으로 조회하는 외부 학교를 나눠 보인다(전국 학교를 목록에 넣지 않는다 — '학교 검색'으로 찾는다) */}
        {(['managed', 'external'] as const).map((group) => {
          const list = context.options.filter((option) => option.managed === (group === 'managed'))
          if (list.length === 0) return null
          const items = list.map((option) => (
            <option key={option.schoolId} value={option.schoolId}>
              {option.label}
            </option>
          ))
          return context.options.some((option) => option.managed) && context.options.some((option) => !option.managed) ? (
            <optgroup key={group} label={group === 'managed' ? '담당 학교' : '조회한 외부 학교'}>
              {items}
            </optgroup>
          ) : (
            items
          )
        })}
      </select>
      <select className={review.select} aria-label="학년도" value={context.year ?? ''} onChange={(event) => onChange({ year: event.target.value })} data-testid="filter-year">
        {context.yearList.length === 0 && <option value="">등록된 학년도 없음</option>}
        {context.yearList.map((value) => (
          <option key={value} value={value}>
            {value}학년도{relativeYearLabel(value) ? ` (${relativeYearLabel(value)})` : ''}
          </option>
        ))}
      </select>
      {extra}
    </div>
  )
}
