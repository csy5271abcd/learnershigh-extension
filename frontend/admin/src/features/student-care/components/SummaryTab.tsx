import { studentCareApi } from '../api/studentCareApi.ts'
import { monthDay } from '../model/format.ts'
import { useRemote } from '../model/useRemote.ts'
import { Empty, ErrorState, Loading } from './StateMessage.tsx'

/** 지점 요약: 오늘의 케어 현황과 최근 30일 종결. */
export function SummaryTab({ branchId, version }: { branchId: string; version: number }) {
  const summary = useRemote(`${branchId}/${version}`, () => studentCareApi.summary(branchId))

  if (summary.status === 'error' && !summary.data) {
    return <ErrorState error={summary.error} onRetry={summary.reload} />
  }
  if (!summary.data) {
    return <Loading />
  }
  const data = summary.data
  const tiles = [
    { label: '확인할 변화', value: data.needsCheckCount },
    { label: '판단 보류', value: data.deferredCount },
    { label: '조정 진행 중', value: data.inAdjustmentCount },
    { label: '재점검 도래', value: data.recheckDueCount },
  ]

  return (
    <section className="sc-summary" aria-labelledby="sc-summary-title">
      <h2 id="sc-summary-title" className="sc-history__title">
        지점 요약 <span className="sc-hint">{monthDay(data.asOf)} 기준</span>
      </h2>
      <dl className="sc-tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="sc-tile">
            <dt>{tile.label}</dt>
            <dd>{tile.value}명</dd>
          </div>
        ))}
      </dl>

      <div className="sc-summary__grid">
        <section aria-labelledby="sc-summary-signals">
          <h3 id="sc-summary-signals" className="sc-section__title">
            신호별 학생 수
          </h3>
          {data.signalCounts.length === 0 ? (
            <Empty title="오늘 올라온 신호가 없습니다" />
          ) : (
            <table className="sc-table">
              <tbody>
                {data.signalCounts.map((signal) => (
                  <tr key={signal.type}>
                    <th scope="row">{signal.label}</th>
                    <td>{signal.count}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section aria-labelledby="sc-summary-closed">
          <h3 id="sc-summary-closed" className="sc-section__title">
            최근 30일 종결
          </h3>
          <table className="sc-table">
            <tbody>
              <tr>
                <th scope="row">예상된 변화</th>
                <td>{data.closedLast30Days.expectedChange}건</td>
              </tr>
              <tr>
                <th scope="row">기록 문제</th>
                <td>{data.closedLast30Days.recordIssue}건</td>
              </tr>
              <tr>
                <th scope="row">재점검 후 종결</th>
                <td>{data.closedLast30Days.afterRecheck}건</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </section>
  )
}
