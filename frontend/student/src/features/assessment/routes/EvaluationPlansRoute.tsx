import { Link } from 'react-router'
import { getEvaluationPlan, listEvaluationPlans } from '../api/evaluationPlansApi.ts'
import type { EvaluationPlan } from '../api/types.ts'
import { FileIcon, InfoIcon } from '../components/AssessmentIcons.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { termLabel } from '../model/academicTerm.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { firstPageOf, groupConfirmedFields, unitOf, type ConfirmedItem, type ConfirmedSubject, type ConfirmedValue } from '../model/confirmedPlanView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { getOfficialPlan } from '../api/evaluationPlansApi.ts'
import { useOfficialEnsure } from '../model/useOfficialEnsure.ts'
import { officialEmptyText } from '../model/officialEmptyText.ts'
import { OfficialDocumentList, OfficialEnsureNotice } from '../components/official/OfficialDocuments.tsx'
import styles from './EvaluationPlansRoute.module.css'
import { evaluationPlanOriginalPath, monthlyPlanPath } from './paths.ts'

// 학교 평가 정보 (§10-1 상세 confirmedFields, 2026-11-15). 관리자가 원문과 대조해 확정한 값만 보여 준다.
// - 서버는 확정 Revision만, 확정값만 보낸다(분석 후보·검토 초안 없음). 이 화면은 값을 계산·보충하지 않는다.
// - 확정 목록에 없는 항목 = '미확정', value=null = '원문에 없음'(관리자 확인). 0으로 바꾸지 않는다.
// - 근거 쪽(PDF)이 있으면 원문 Viewer의 그 쪽으로 이동한다.

export function EvaluationPlansRoute() {
  const { terms, selectedContext } = useAssessmentWorkspace()
  const slot = selectedContext
    ? { schoolId: selectedContext.school.schoolId, academicYear: selectedContext.academicYear, grade: selectedContext.grade, semester: selectedContext.semester }
    : null
  const plans = useApiQuery(`confirmed-evaluation-plans:${slot ? `${slot.schoolId}|${slot.academicYear}|${slot.grade}|${slot.semester}` : 'none'}`, () =>
    slot
      ? listEvaluationPlans(slot).then((list) => Promise.all(list.items.map((plan) => getEvaluationPlan(plan.planId))))
      : new Promise<never>(() => {}),
  )

  const header = (
    <header className={styles.header}>
      <h1 className={styles.title}>학교 평가 정보</h1>
      <p className={styles.subtitle}>
        {selectedContext ? `${selectedContext.school.name} · ${termLabel(selectedContext)} · ` : ''}
        관리자가 평가계획서 원문과 대조해 확정한 정보만 보여요.
      </p>
    </header>
  )

  if (terms.status === 'error' && terms.error) {
    return (
      <main className={styles.page}>
        {header}
        <ErrorState title="학업 정보를 불러오지 못했어요" error={terms.error} onRetry={terms.retry} />
      </main>
    )
  }
  if (!selectedContext) {
    return (
      <main className={styles.page}>
        {header}
        {terms.status === 'loading' ? (
          <LoadingRows rows={3} label="학업 정보를 불러오는 중" />
        ) : (
          <EmptyState title="학업 정보가 없어요" description="학교·학년·학기 정보가 있어야 평가 정보를 볼 수 있어요." />
        )}
      </main>
    )
  }
  if (plans.status === 'error' && plans.error) {
    return (
      <main className={styles.page}>
        {header}
        <ErrorState title="평가 정보를 불러오지 못했어요" error={plans.error} onRetry={plans.retry} />
      </main>
    )
  }
  if (!plans.data) {
    return (
      <main className={styles.page}>
        {header}
        <LoadingRows rows={4} label="평가 정보를 불러오는 중" />
      </main>
    )
  }
  return (
    <main className={styles.page} data-testid="confirmed-evaluation-info">
      {header}
      <p className={styles.notice}>
        <InfoIcon size={14} />
        확정되지 않은 항목은 &lsquo;미확정&rsquo;으로 표시해요. 평가 일정·기준은 학교 공지가 우선이니 원문과 함께 확인해 주세요.
      </p>
      <OfficialSourcesSection academicYear={selectedContext.academicYear} semester={selectedContext.semester} />
      <h2 className={styles.sectionTitle}>확정된 평가 정보</h2>
      {plans.data.length === 0 ? (
        <EmptyState title="아직 확정된 평가계획서가 없어요" description="관리자가 이 학기 평가계획서를 확인하면 여기에 보여요." />
      ) : (
        plans.data.map((plan) => <PlanSection key={plan.planId} plan={plan} />)
      )}
    </main>
  )
}

function PlanSection({ plan }: { plan: EvaluationPlan }) {
  const { selectedContext } = useAssessmentWorkspace()
  const subjects = groupConfirmedFields(plan.confirmedFields ?? [], selectedContext)
  const mine = subjects.filter((subject) => subject.enrolled)
  const others = subjects.filter((subject) => !subject.enrolled)
  return (
    <section className={styles.plan} aria-label={plan.fileName} data-testid="confirmed-plan">
      <div className={styles.planHead}>
        <div className={styles.planTitle}>
          <FileIcon size={16} />
          <span className={styles.planName}>{plan.fileName}</span>
        </div>
        <span className={styles.meta}>
          {plan.academicYear}학년도 {plan.grade}학년 {plan.semester}학기 · 확정 과목 {subjects.length}개
        </span>
        <Link className={styles.linkButton} to={monthlyPlanPath} data-testid="confirmed-plan-monthly">
          월별 운영계획
        </Link>
        {plan.file?.available && (
          <Link className={styles.linkButton} style={{ marginLeft: 0 }} to={evaluationPlanOriginalPath(plan.planId)} data-testid="confirmed-plan-original">
            원문 보기
          </Link>
        )}
      </div>
      {subjects.length === 0 ? (
        <p className={styles.empty} data-testid="confirmed-plan-no-fields">
          이 문서는 확정됐지만 과목별로 확정된 평가 정보가 아직 없어요. 원문에서 확인해 주세요.
        </p>
      ) : (
        <>
          {mine.length > 0 && <SubjectGroup title="내 수강 과목" subjects={mine} plan={plan} />}
          {others.length > 0 && <SubjectGroup title={mine.length > 0 ? '그 밖의 과목' : '과목'} subjects={others} plan={plan} />}
        </>
      )}
    </section>
  )
}

function SubjectGroup({ title, subjects, plan }: { title: string; subjects: ConfirmedSubject[]; plan: EvaluationPlan }) {
  return (
    <div className={styles.group}>
      <h2 className={styles.groupTitle}>
        {title} <span className={styles.count}>{subjects.length}</span>
      </h2>
      <div className={styles.subjects}>
        {subjects.map((subject) => (
          <SubjectCard key={subject.subjectId} subject={subject} plan={plan} />
        ))}
      </div>
    </div>
  )
}

const canPreview = (plan: EvaluationPlan) => Boolean(plan.file?.available && plan.file.previewAvailable)

function SubjectCard({ subject, plan }: { subject: ConfirmedSubject; plan: EvaluationPlan }) {
  const page = firstPageOf(subject)
  return (
    <article className={styles.subject} data-testid="confirmed-subject" data-subject-id={subject.subjectId}>
      <div className={styles.subjectHead}>
        <h3 className={styles.subjectName}>{subject.subjectName ?? `과목 코드 ${subject.subjectId}`}</h3>
        {!subject.subjectName && <span className={styles.meta}>학업 정보에서 과목 이름을 찾지 못했어요</span>}
        {canPreview(plan) && page && (
          <Link className={styles.pageLink} to={evaluationPlanOriginalPath(plan.planId, page)}>
            원문 {page}쪽
          </Link>
        )}
      </div>
      <dl className={styles.weights}>
        <div>
          <dt>지필평가 반영비율</dt>
          <dd>
            <ValueText value={subject.writtenWeight} unit="%" plan={plan} />
          </dd>
        </div>
        <div>
          <dt>수행평가 반영비율</dt>
          <dd>
            <ValueText value={subject.performanceWeight} unit="%" plan={plan} />
          </dd>
        </div>
      </dl>
      {subject.exams.length > 0 && <ItemTable title="지필평가" items={subject.exams} plan={plan} namePrefix="지필 항목" />}
      {subject.items.length > 0 && <ItemTable title="수행평가" items={subject.items} plan={plan} namePrefix="수행평가 항목" />}
      {subject.exams.length === 0 && subject.items.length === 0 && <p className={styles.emptySmall}>세부 평가 항목은 아직 확정되지 않았어요.</p>}
      {subject.others.length > 0 && <p className={styles.emptySmall}>그 밖에 확정된 정보 {subject.others.length}건이 있어요. 원문에서 함께 확인해 주세요.</p>}
    </article>
  )
}

// A27-UX 학생: 수행평가 상세 평가 기준(확정 공개값)도 같은 표를 쓴다
export function ItemTable({ title, items, plan, namePrefix }: { title: string; items: ConfirmedItem[]; plan: EvaluationPlan; namePrefix: string }) {
  return (
    <div className={styles.items}>
      <p className={styles.itemsTitle}>{title}</p>
      <ul className={styles.itemList}>
        {items.map((item) => (
          <li key={item.index} className={styles.item} data-testid="confirmed-item">
            <span className={styles.itemName}>
              {item.label.state === 'value' ? String(item.label.value) : `${namePrefix} ${item.index + 1}`}
              {item.label.state !== 'value' && <span className={styles.muted}> · 이름 {item.label.state === 'absent' ? '원문에 없음' : '미확정'}</span>}
            </span>
            <span className={styles.itemFacts}>
              <Fact label="반영" value={item.weightPercent} unit={unitOf('weightPercent')} plan={plan} />
              <Fact label="만점" value={item.maxScore} unit={unitOf('maxScore')} plan={plan} />
              <Fact label="시기" value={item.timing} unit="" plan={plan} />
            </span>
            {item.rubric && (
              <div className={styles.rubric} data-testid="confirmed-rubric">
                <span className={styles.factLabel}>세부 채점기준</span>
                <table className={styles.rubricTable}>
                  <thead>
                    <tr>
                      <th scope="col">채점 요소</th>
                      <th scope="col">수준별 기준</th>
                      <th scope="col">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.rubric.criteria.flatMap((criterion, c) =>
                      (criterion.levels.length ? criterion.levels : [null]).map((level, l) => (
                        <tr key={`${c}-${l}`}>
                          {l === 0 && (
                            <th scope="row" rowSpan={Math.max(1, criterion.levels.length)}>
                              {criterion.element}
                              {criterion.maxScore !== null && <span data-testid="confirmed-rubric-max-score"> · 배점 {criterion.maxScore}점</span>}
                            </th>
                          )}
                          <td>{level ? level.description : '—'}</td>
                          <td>{level && level.score !== null ? `${level.score}점` : '—'}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
                {item.rubric.page !== null && (
                  <Link className={styles.sourcePage} to={evaluationPlanOriginalPath(plan.planId, item.rubric.page)} aria-label={`채점기준 원문 ${item.rubric.page}쪽에서 확인`}>
                    원문 {item.rubric.page}쪽
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// A27-UX 학생: 수행평가 상세 평가 기준(확정 공개값)도 같은 표를 쓴다
export function Fact({ label, value, unit, plan }: { label: string; value: ConfirmedValue; unit: string; plan: EvaluationPlan }) {
  return (
    <span className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <ValueText value={value} unit={unit} plan={plan} />
    </span>
  )
}

// A27-UX 학생: 수행평가 상세 평가 기준(확정 공개값)도 같은 표를 쓴다
export function ValueText({ value, unit, plan }: { value: ConfirmedValue; unit: string; plan: EvaluationPlan }) {
  if (value.state === 'missing') {
    return (
      <span className={styles.missing} data-state="missing">
        미확정
      </span>
    )
  }
  return (
    <>
      {value.state === 'absent' ? (
        <span className={styles.absent} data-state="absent">
          원문에 없음
        </span>
      ) : (
        <strong className={styles.value} data-state="value">{`${value.value}${unit}`}</strong>
      )}
      {canPreview(plan) && value.page && (
        <Link className={styles.sourcePage} to={evaluationPlanOriginalPath(plan.planId, value.page)} aria-label={`원문 ${value.page}쪽에서 확인`}>
          {value.page}쪽
        </Link>
      )}
    </>
  )
}

/**
 * A27-UX 부록 K: 학교알리미 공식 공개 원본(원문 파일). 위 '확정된 평가 정보'(관리자 확정값)와 다른 자료다 —
 * 원본은 학교가 공개한 원문이라 바로 열람하고, 분석 결과·채점기준은 확정된 것만 아래에 보인다.
 */
function OfficialSourcesSection({ academicYear, semester }: { academicYear: number; semester: number }) {
  const { ensure, version } = useOfficialEnsure()
  const query = useApiQuery(`plans-official|${academicYear}|${semester}|${version}`, () => getOfficialPlan(academicYear, semester))
  return (
    <section className={styles.official} aria-labelledby="official-sources" data-testid="official-sources">
      <h2 id="official-sources" className={styles.sectionTitle}>
        학교알리미 평가계획서 원본
      </h2>
      <p className={styles.officialCaption}>학교가 학교알리미에 공개한 원문 파일이에요. 아래 평가 정보와 달리 선생님 확인 전에도 볼 수 있어요.</p>
      <OfficialEnsureNotice ensure={ensure} />
      {query.status === 'error' && query.error ? (
        <ErrorState title="원본 정보를 불러오지 못했어요" error={query.error} onRetry={query.retry} />
      ) : !query.data ? (
        <LoadingRows rows={2} label="원본 정보를 불러오는 중" />
      ) : !query.data.contextFound && !query.data.schoolId ? (
        <p className={styles.officialCaption} data-testid="official-sources-no-context">
          {academicYear}학년도 {semester}학기 학적 정보가 없고 조회할 학교도 정하지 못했어요.
        </p>
      ) : query.data.documents.length === 0 ? (
        <p className={styles.officialCaption} data-testid="official-sources-empty">
          {officialEmptyText(query.data, ensure)}
        </p>
      ) : (
        <>
          <p className={styles.officialCaption} data-testid="official-sources-scope">
            {query.data.schoolName} · {academicYear}학년도 고{query.data.grade} {semester}학기 · 원본 {query.data.documents.length}개
            {query.data.basis === 'SCHOOL_PUBLIC' && (query.data.contextFound ? ' · 같은 학교 다른 학년 공개 원본' : ' · 현재 학교 공개 원본(이 학년도 학적 정보 없음 · 재학 기록 아님)')}
          </p>
          <OfficialDocumentList slot={query.data} />
        </>
      )}
    </section>
  )
}
