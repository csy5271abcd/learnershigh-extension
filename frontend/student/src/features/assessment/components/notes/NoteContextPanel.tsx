import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { EnrichmentTask, SchoolAssessment } from '../../api/types.ts'
import { formatTaskDate, sourceTypeLabels } from '../../model/enrichmentView.ts'
import type { EvaluationItemLookup } from '../../model/evaluationItemCandidate.ts'
import { formatDateWithWeekday, sourceLabel, statusLabels } from '../../model/schoolAssessmentView.ts'
import type { QueryResult } from '../../model/useApiQuery.ts'
import { enrichmentTaskDetailPath, schoolAssessmentDetailPath } from '../../routes/paths.ts'
import { BulbIcon, ChevronDownIcon, InfoIcon } from '../AssessmentIcons.tsx'
import styles from '../detail/context.module.css'

type ContextProps =
  | {
      kind: 'school'
      assessment: SchoolAssessment
      subjectName: string
      lookup: QueryResult<EvaluationItemLookup>
      linkedTasks: QueryResult<EnrichmentTask[]>
      onOpenCriteria: () => void
    }
  | {
      kind: 'enrichment'
      task: EnrichmentTask
      subjectName: string
      related: { status: 'none' } | { status: 'loading' } | { status: 'error' } | { status: 'ok'; assessment: SchoolAssessment }
    }

const unregistered = '미등록'

// 노트 위 과제 정보 (2026-10-27 사용자 요청 D). 원본(학교 수행평가·심화 탐구)의 최신 정보를 읽기 전용으로 보여준다.
// 노트 본문에 복사하지 않는다 (원본이 바뀌면 여기만 바뀐다).
// §12 상세에 없는 항목(평가 유형·담당 선생님·첨부)은 지어내지 않고 "미등록"으로, 평가계획서 분석 값은 "후보 · 확인 필요"로 표시한다.
// 학교 담당 선생님 자리에 학원·관리자 정보를 넣지 않는다.
export function NoteContextPanel(props: ContextProps) {
  const [open, setOpen] = useState(true)
  const bodyId = useId()
  const title = props.kind === 'school' ? props.assessment.title : props.task.title

  return (
    <section className={styles.contextPanel} aria-label="노트 작성 참고 정보">
      <div className={styles.contextHead}>
        <button type="button" className={styles.contextToggle} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <ChevronDownIcon size={15} className={styles.contextChevron} />
          {props.kind === 'school' ? '과제 정보' : '탐구 정보'}
        </button>
        <span className={styles.readOnlyBadge}>읽기 전용 · 노트에 복사되지 않아요</span>
      </div>
      {open && (
        <div id={bodyId}>
          <p className={styles.contextTitle}>{title}</p>
          <dl className={styles.contextGrid}>{props.kind === 'school' ? <SchoolFacts {...props} /> : <EnrichmentFacts {...props} />}</dl>
          <p className={styles.contextNote}>
            <InfoIcon size={12} />
            원본 정보가 바뀌면 여기에 바로 반영돼요.{props.kind === 'school' && ' "후보 · 확인 필요"는 평가계획서 분석 값이라 학교 안내로 확인해 주세요.'}
          </p>
        </div>
      )}
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Missing({ text = unregistered }: { text?: string }) {
  return <span className={styles.missing}>{text}</span>
}

function SchoolFacts({ assessment, subjectName, lookup, linkedTasks, onOpenCriteria }: Extract<ContextProps, { kind: 'school' }>) {
  const found = lookup.data?.kind === 'found' ? lookup.data : undefined
  const loading = !lookup.data && lookup.status !== 'error'
  const candidate = (value: string | number | null | undefined, suffix = '') =>
    loading ? <Missing text="불러오는 중…" /> : found && value !== null && value !== undefined ? (
      <>
        {value}
        {suffix} <span className={styles.candidateTag}>후보 · 확인 필요</span>
      </>
    ) : (
      <Missing />
    )
  return (
    <>
      <Fact label="과목">{subjectName}</Fact>
      <Fact label="평가 유형">
        <Missing />
      </Fact>
      <Fact label="진행 상태">{statusLabels[assessment.status]}</Fact>
      <Fact label="평가일">{candidate(found?.item.timing)}</Fact>
      <Fact label="제출 마감">{assessment.deadlineDate ? formatDateWithWeekday(assessment.deadlineDate) : <Missing text="날짜 미정" />}</Fact>
      <Fact label="반영 비율">{candidate(found?.item.weightPercent, '%')}</Fact>
      <Fact label="학교 담당 선생님">
        <Missing text="미등록 · 확인 필요" />
      </Fact>
      <Fact label="정보 출처">{sourceLabel(assessment)}</Fact>
      <Fact label="평가 기준">
        {found ? (
          <button type="button" className={styles.inlineAction} onClick={onOpenCriteria}>
            후보 {found.item.rubric.length}개 · 평가 기준 탭에서 보기
          </button>
        ) : loading ? (
          <Missing text="불러오는 중…" />
        ) : (
          <button type="button" className={styles.inlineAction} onClick={onOpenCriteria}>
            {assessment.evaluationItemRef ? '평가 기준 탭에서 상태 보기' : '미등록 · 평가 기준 탭 보기'}
          </button>
        )}
      </Fact>
      <Fact label="첨부">
        <Missing text="미등록 (학교 안내문 첨부는 아직 지원하지 않아요)" />
      </Fact>
      <Fact label="연결된 심화 탐구">
        <LinkedTasks linkedTasks={linkedTasks} />
      </Fact>
    </>
  )
}

export function LinkedTasks({ linkedTasks }: { linkedTasks: QueryResult<EnrichmentTask[]> }) {
  if (linkedTasks.status === 'error') return <Missing text="불러오지 못했어요" />
  if (!linkedTasks.data) return <Missing text="불러오는 중…" />
  if (linkedTasks.data.length === 0) return <Missing text="없음" />
  return (
    <span className={styles.linkList}>
      {linkedTasks.data.map((task) => (
        <Link key={task.taskId} to={enrichmentTaskDetailPath(task.taskId)} className={styles.inlineLink}>
          <BulbIcon size={14} className={styles.inlineLinkIcon} />
          {task.title}
        </Link>
      ))}
    </span>
  )
}

function EnrichmentFacts({ task, subjectName, related }: Extract<ContextProps, { kind: 'enrichment' }>) {
  return (
    <>
      <Fact label="과목">{subjectName}</Fact>
      <Fact label="진행 상태">{statusLabels[task.status]}</Fact>
      <Fact label="탐구 목표">{task.goal ?? <Missing text="아직 적지 않았어요" />}</Fact>
      <Fact label="연결된 수행평가">
        {related.status === 'none' ? (
          <Missing text="없음 (독립 탐구)" />
        ) : related.status === 'loading' ? (
          <Missing text="불러오는 중…" />
        ) : related.status === 'error' ? (
          <Missing text="불러오지 못했어요" />
        ) : (
          <Link to={schoolAssessmentDetailPath(related.assessment.assessmentId)} className={styles.inlineLink}>
            {related.assessment.title}
          </Link>
        )}
      </Fact>
      <Fact label="출처 자료">{task.sourceReference ? sourceTypeLabels[task.sourceReference.type] : <Missing text="없음" />}</Fact>
      <Fact label="시작한 날">{formatTaskDate(task.createdAt)}</Fact>
      <Fact label="내 목표일">
        {task.deadlineDate ? `${formatDateWithWeekday(task.deadlineDate)} (학교 공식 마감 아님)` : <Missing text="없음" />}
      </Fact>
    </>
  )
}
