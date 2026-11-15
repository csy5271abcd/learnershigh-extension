import { useState } from 'react'
import { navigate, replaceSearch } from '../../../app/adminLocation.ts'
import { comparePlans, searchSchools } from '../api/assessmentAdminApi.ts'
import type { PlanComparison, PlanComparisonCell, PlanComparisonColumn, PlanComparisonItemCell, PlanComparisonStatus } from '../api/types.ts'
import { RemoteView } from '../components/AdminParts.tsx'
import { useRemote } from '../model/useRemote.ts'
import review from '../review/review.module.css'
import { paths } from './paths.ts'

// 학년도별 평가계획서 비교 (A7, api-contract.md §38-5 DRAFT). 학년도마다 따로 등록·분석·확정한 문서의 관리자 확정값만 비교한다.
// - 분석 후보·초안은 쓰지 않는다(서버가 CONFIRMED_ONLY로 계산). 확정 전·문서 없음은 그 학년도 열 상태로 보여 준다.
// - 과목은 학년도마다 관리자가 고른다. 같은 과목 ID가 있어도, 이름이 비슷해도 자동으로 맞추지 않는다.
// - 이름만 바뀐 같은 평가일 수 있는 항목은 '명칭 변경 가능성'으로만 표시한다. 채점기준은 비교하지 않는다(원문 확인).

const statusText: Record<PlanComparisonStatus, string> = {
  SAME: '변경 없음',
  CHANGED: '값 변경',
  ADDED: '신규 추가',
  REMOVED: '삭제',
  POSSIBLE_RENAME: '명칭 변경 가능성',
  NOT_COMPARABLE: '비교 불가',
  NEEDS_REVIEW: '관리자 확인 필요',
}

const columnText: Record<string, string> = {
  NO_PLAN: '등록된 문서 없음',
  NOT_CONFIRMED: '확정 전 — 비교에서 제외',
  AMBIGUOUS_PLAN: '확정 문서가 여럿 — 문서를 골라 주세요',
  NO_SUBJECT_SELECTED: '과목을 골라 주세요',
  SUBJECT_UNKNOWN: '이 학년도 과목이 아니에요',
  SUBJECT_NOT_CONFIRMED: '이 과목 확정값 없음',
  CONFIRMED: '확정값 비교',
}

const unitOf = (key: string) => (key.endsWith('weightPercent') ? '%' : key.endsWith('maxScore') ? '점' : key.endsWith('itemCount') || key.endsWith('rowCount') ? '개' : '')

function cellText(cell: PlanComparisonCell | null, unit: string) {
  if (!cell) return '–'
  if (cell.state === 'VALUE') return `${String(cell.value)}${unit}`
  if (cell.state === 'ABSENT') return '원문에 없음'
  if (cell.state === 'NOT_CONFIRMED') return '미확정'
  return '–'
}

function parseYearMap(values: string[]): Record<number, string> {
  const map: Record<number, string> = {}
  for (const value of values) {
    const match = /^(\d{4}):(.+)$/.exec(value)
    if (match) map[Number(match[1])] = match[2]
  }
  return map
}

export function PlanComparisonRoute({ search }: { search: URLSearchParams }) {
  const schoolId = search.get('school') ?? ''
  const grade = Number(search.get('grade') ?? 1)
  const semester = Number(search.get('semester') ?? 2)
  const years = (search.get('years') ?? '').split(',').map(Number).filter((year) => Number.isInteger(year) && year > 2000).sort((a, b) => a - b)
  const subjects = parseYearMap(search.getAll('subject'))
  const plans = parseYearMap(search.getAll('plan'))
  const [schoolInput, setSchoolInput] = useState(schoolId)

  const setParams = (next: { school?: string; grade?: number; semester?: number; years?: number[]; subjects?: Record<number, string>; plans?: Record<number, string> }) => {
    const params = new URLSearchParams()
    params.set('school', next.school ?? schoolId)
    params.set('grade', String(next.grade ?? grade))
    params.set('semester', String(next.semester ?? semester))
    params.set('years', (next.years ?? years).join(','))
    for (const [year, id] of Object.entries(next.subjects ?? subjects)) if (id) params.append('subject', `${year}:${id}`)
    for (const [year, id] of Object.entries(next.plans ?? plans)) if (id) params.append('plan', `${year}:${id}`)
    replaceSearch(params.toString())
  }

  // 학년도를 정하지 않았으면 등록된 학교의 최근 학년도 기준 3개년을 제안한다(현재 날짜로 추측하지 않음)
  const school = useRemote(() => (schoolId ? searchSchools(schoolId) : Promise.resolve(null)), [schoolId])
  const latest = school.state.status === 'success' ? school.state.data?.items.find((item) => item.schoolId === schoolId)?.latestAcademicYear ?? null : null
  const effectiveYears = years.length >= 2 ? years : latest ? [latest - 2, latest - 1, latest] : []

  const comparison = useRemote(
    () =>
      schoolId && effectiveYears.length >= 2
        ? comparePlans({ schoolId, grade, semester, years: effectiveYears, subjects, plans })
        : Promise.resolve(null),
    [schoolId, grade, semester, effectiveYears.join(','), JSON.stringify(subjects), JSON.stringify(plans)],
  )

  return (
    <div className={review.listPage} data-testid="plan-comparison">
      <div className={review.listHead}>
        <button type="button" className={review.link} onClick={() => navigate(paths.plans)}>
          ← 평가계획서 목록
        </button>
        <h2>학년도별 평가계획서 비교</h2>
      </div>
      <p className={review.muted} style={{ marginBottom: 12 }}>
        학년도마다 따로 등록·분석·확정한 평가계획서를 <strong>관리자 확정값만으로</strong> 비교해요. 확정 전 문서와 분석 후보는 비교하지 않아요. 과목은 학년도마다 직접 골라요(이름이 비슷해도 자동으로 맞추지 않아요).
      </p>

      <form
        className={review.toolbar}
        onSubmit={(event) => {
          event.preventDefault()
          setParams({ school: schoolInput.trim(), years: [], subjects: {}, plans: {} })
        }}
      >
        <input className={review.input} style={{ maxWidth: 180 }} value={schoolInput} onChange={(event) => setSchoolInput(event.target.value)} placeholder="학교 코드" aria-label="학교 코드" data-testid="compare-school" />
        <select className={review.select} aria-label="학년" value={grade} onChange={(event) => setParams({ grade: Number(event.target.value), subjects: {}, plans: {} })} data-testid="compare-grade">
          {[1, 2, 3].map((value) => (
            <option key={value} value={value}>
              {value}학년
            </option>
          ))}
        </select>
        <select className={review.select} aria-label="학기" value={semester} onChange={(event) => setParams({ semester: Number(event.target.value), subjects: {}, plans: {} })} data-testid="compare-semester">
          {[1, 2].map((value) => (
            <option key={value} value={value}>
              {value}학기
            </option>
          ))}
        </select>
        {effectiveYears.map((year, index) => (
          <input
            key={index}
            className={review.input}
            style={{ maxWidth: 96 }}
            type="number"
            min={2000}
            max={2100}
            value={year}
            aria-label={`비교 학년도 ${index + 1}`}
            onChange={(event) => {
              const next = [...effectiveYears]
              next[index] = Number(event.target.value)
              if (next.every((value) => value > 2000)) setParams({ years: next })
            }}
            data-testid={`compare-year-${index}`}
          />
        ))}
        <button type="submit" className={review.button}>
          조회
        </button>
      </form>

      {!schoolId ? (
        <div className={review.empty}>
          <strong>학교 코드를 입력해 주세요</strong>
          <span className={review.muted}>평가계획서 목록에서 학교를 고른 뒤 &lsquo;학년도 비교&rsquo;로 들어오면 자동으로 채워져요.</span>
        </div>
      ) : effectiveYears.length < 2 ? (
        <div className={review.empty}>
          <strong>비교할 학년도를 정해 주세요</strong>
          <span className={review.muted}>이 학교에 등록된 평가계획서를 찾지 못해 학년도를 제안할 수 없어요.</span>
        </div>
      ) : (
        <RemoteView state={comparison.state} onRetry={comparison.reload} label="비교 결과">
          {(data) =>
            data ? (
              <ComparisonBody
                data={data}
                onSubject={(year, subjectId) => setParams({ years: effectiveYears, subjects: { ...subjects, [year]: subjectId } })}
                onPlan={(year, planId) => setParams({ years: effectiveYears, plans: { ...plans, [year]: planId } })}
                onSameSubject={(subjectId) => {
                  // 관리자가 누른 경우에만: 같은 과목 ID가 그 학년도 슬롯에 '있는' 학년도에만 채운다(이름으로 맞추지 않음)
                  const next = { ...subjects }
                  for (const column of data.columns) if (column.subjects.some((item) => item.subjectId === subjectId)) next[column.academicYear] = subjectId
                  setParams({ years: effectiveYears, subjects: next })
                }}
              />
            ) : null
          }
        </RemoteView>
      )}
    </div>
  )
}

function ComparisonBody({
  data,
  onSubject,
  onPlan,
  onSameSubject,
}: {
  data: PlanComparison
  onSubject: (year: number, subjectId: string) => void
  onPlan: (year: number, planId: string) => void
  onSameSubject: (subjectId: string) => void
}) {
  const changed = data.rows.filter((row) => ['CHANGED', 'ADDED', 'REMOVED'].includes(row.status))
  const itemChanges = data.items.filter((item) => item.status !== 'SAME' && item.status !== 'NOT_COMPARABLE')
  const notComparable = data.columns.filter((column) => column.status !== 'CONFIRMED')
  const latest = data.columns[data.columns.length - 1]
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {data.warnings.map((warning) => (
        <p key={warning} className={review.banner} role="alert" data-testid="compare-warning">
          {warning}
        </p>
      ))}

      <div style={{ overflowX: 'auto' }}>
        <table className={review.table} data-testid="compare-table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '20%' }}>
                {data.schoolName ?? data.schoolId} · {data.grade}학년 {data.semester}학기
              </th>
              {data.columns.map((column) => (
                <th key={column.academicYear} scope="col">
                  <YearHeader column={column} onSubject={onSubject} onPlan={onPlan} />
                </th>
              ))}
              <th scope="col" style={{ width: 150 }}>
                변경 상태
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.key} data-testid="compare-row" data-key={row.key} data-status={row.status}>
                <th scope="row" style={{ fontWeight: 600 }}>
                  {row.label}
                  {row.note && <div className={review.tiny} style={{ fontWeight: 400 }}>{row.note}</div>}
                </th>
                {row.cells.map((cell, index) => (
                  <td key={index}>
                    <CellValue cell={cell} unit={unitOf(row.key)} column={data.columns[index]} />
                  </td>
                ))}
                <td>
                  <StatusBadge status={row.status} transitions={row.transitions} />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row" colSpan={data.columns.length + 2} className={review.sectionLabel} style={{ paddingTop: 16 }}>
                수행평가 항목 (확정된 이름 기준)
              </th>
            </tr>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length + 2} className={review.muted}>
                  비교할 확정 수행평가 항목이 없어요.
                </td>
              </tr>
            ) : (
              data.items.map((item, rowIndex) => (
                <tr key={`${item.label ?? 'unnamed'}-${rowIndex}`} data-testid="compare-item" data-label={item.label ?? ''} data-status={item.status}>
                  <th scope="row" style={{ fontWeight: 600 }}>
                    {item.label ?? '이름 미확정 항목'}
                    {item.note && <div className={review.tiny} style={{ fontWeight: 400 }}>{item.note}</div>}
                  </th>
                  {item.cells.map((cell, index) => (
                    <td key={index}>
                      <ItemValue cell={cell} column={data.columns[index]} />
                    </td>
                  ))}
                  <td>
                    <StatusBadge status={item.status} transitions={item.transitions} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section aria-label="변경사항 요약" data-testid="compare-summary" style={{ display: 'grid', gap: 6 }}>
        <p className={review.sectionLabel}>변경사항 요약</p>
        <ul className={review.prose} style={{ margin: 0, paddingLeft: 18 }}>
          {changed.length === 0 && itemChanges.length === 0 ? (
            <li>확정값 기준으로 비교 가능한 구간에서 확인된 변화가 없어요.</li>
          ) : (
            <>
              {changed.map((row) => (
                <li key={row.key}>
                  {row.label}: {row.transitions.filter((t) => t.status !== 'SAME' && t.status !== 'NOT_COMPARABLE').map((t) => `${t.fromYear}→${t.toYear} ${statusText[t.status]}`).join(', ')}
                </li>
              ))}
              {itemChanges.map((item, index) => (
                <li key={`item-${index}`}>
                  수행평가 &lsquo;{item.label ?? '이름 미확정'}&rsquo;: {item.transitions.filter((t) => t.status !== 'SAME' && t.status !== 'NOT_COMPARABLE').map((t) => `${t.fromYear}→${t.toYear} ${statusText[t.status]}`).join(', ')}
                </li>
              ))}
            </>
          )}
          {notComparable.length > 0 && <li>비교에서 빠진 학년도: {notComparable.map((column) => `${column.academicYear}(${columnText[column.status] ?? column.status})`).join(', ')}</li>}
          <li>채점기준·학습 내용은 자동 비교하지 않아요. 학년도별 원문에서 확인해 주세요.</li>
        </ul>
        {latest?.subjectId && (
          <button type="button" className={review.link} style={{ justifySelf: 'start' }} onClick={() => onSameSubject(latest.subjectId as string)} data-testid="compare-same-subject">
            {latest.academicYear}학년도 과목 코드({latest.subjectId})가 있는 학년도에 같은 코드 적용
          </button>
        )}
      </section>
    </div>
  )
}

function YearHeader({ column, onSubject, onPlan }: { column: PlanComparisonColumn; onSubject: (year: number, subjectId: string) => void; onPlan: (year: number, planId: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 4, fontWeight: 400 }} data-testid={`compare-column-${column.academicYear}`} data-status={column.status}>
      <strong>{column.academicYear}학년도</strong>
      <span className={review.tiny}>{columnText[column.status] ?? column.status}</span>
      {column.fileName && <span className={review.tiny}>{column.fileName}</span>}
      {column.status === 'AMBIGUOUS_PLAN' && (
        <select className={review.select} aria-label={`${column.academicYear}학년도 문서`} onChange={(event) => onPlan(column.academicYear, event.target.value)} defaultValue="">
          <option value="">문서 선택</option>
          {column.plans
            .filter((plan) => plan.confirmedRevisionId)
            .map((plan) => (
              <option key={plan.planId} value={plan.planId}>
                {plan.fileName ?? plan.planId}
              </option>
            ))}
        </select>
      )}
      {column.subjects.length > 0 ? (
        <select className={review.select} aria-label={`${column.academicYear}학년도 과목`} value={column.subjectId ?? ''} onChange={(event) => onSubject(column.academicYear, event.target.value)} data-testid={`compare-subject-${column.academicYear}`}>
          <option value="">과목 선택</option>
          {column.subjects.map((subject) => (
            <option key={subject.subjectId} value={subject.subjectId}>
              {subject.name} · {subject.subjectId}
              {subject.confirmed ? '' : ' (확정값 없음)'}
            </option>
          ))}
        </select>
      ) : (
        column.status !== 'NO_PLAN' && <span className={review.tiny}>이 학년도 학업 과목 정보 없음</span>
      )}
    </div>
  )
}

function SourceLink({ column, page }: { column: PlanComparisonColumn; page: number | null }) {
  if (!column.planId || !column.revisionId || !page) return null
  if (!column.previewAvailable) return <span className={review.tiny}> · {column.documentFormat} 원문은 내려받아 확인</span>
  return (
    <button type="button" className={review.link} style={{ marginLeft: 6 }} onClick={() => navigate(paths.planReview(column.planId as string, column.revisionId as string, page))} data-testid="compare-source">
      {page}쪽
    </button>
  )
}

function CellValue({ cell, unit, column }: { cell: PlanComparisonCell; unit: string; column: PlanComparisonColumn }) {
  return (
    <span data-state={cell.state}>
      <span style={cell.state === 'VALUE' ? { fontWeight: 600 } : { color: 'var(--as-color-text-tertiary)' }}>{cellText(cell, unit)}</span>
      <SourceLink column={column} page={cell.pdfPageNumber} />
    </span>
  )
}

function ItemValue({ cell, column }: { cell: PlanComparisonItemCell; column: PlanComparisonColumn }) {
  if (cell.state === 'NOT_AVAILABLE') return <span className={review.tiny}>–</span>
  if (cell.state === 'MISSING') return <span className={review.tiny}>항목 없음</span>
  return (
    <span style={{ display: 'grid', gap: 2 }}>
      <span>반영 {cellText(cell.weightPercent, '%')}</span>
      <span className={review.tiny}>
        만점 {cellText(cell.maxScore, '점')} · 시기 {cellText(cell.timing, '')}
      </span>
      <SourceLink column={column} page={cell.pdfPageNumber} />
    </span>
  )
}

function StatusBadge({ status, transitions }: { status: PlanComparisonStatus; transitions: PlanComparison['rows'][number]['transitions'] }) {
  return (
    <span style={{ display: 'grid', gap: 2 }}>
      <span className={review.statusText} data-tone={status === 'SAME' || status === 'NOT_COMPARABLE' ? 'neutral' : undefined}>
        {statusText[status]}
      </span>
      {transitions.length > 1 && (
        <span className={review.tiny}>
          {transitions.map((t) => `${String(t.fromYear).slice(2)}→${String(t.toYear).slice(2)} ${statusText[t.status]}`).join(' · ')}
        </span>
      )}
    </span>
  )
}
