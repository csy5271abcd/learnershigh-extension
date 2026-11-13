import { useState, type ReactNode } from 'react'
import type { PreviewAnalysisSegment, PreviewPerformanceItem, PreviewSource, PreviewSubject, PreviewWrittenExam } from '../../api/dev/analysisPreviewClient.ts'
import { formatBytes } from '../../model/assessmentDetailView.ts'
import type { AnalysisPreviewEntry } from '../../model/analysisPreviewSession.ts'
import { AlertIcon, ChevronDownIcon, FileIcon, InfoIcon } from '../AssessmentIcons.tsx'
import enrichmentStyles from '../enrichment/enrichment.module.css'
import previewStyles from './analysisPreview.module.css'
import styles from './pdfImport.module.css'

// 평가계획서 분석 미리보기 결과 본문 (2026-11-12 분리). Student 결과 페이지와 Admin 평가계획서 자동 분석 미리보기가 같은 화면을 쓴다.
// Router에 의존하지 않는다. 빈 결과 때의 이동 버튼과 맺음말만 화면마다 넘긴다.
// - 데이터는 로컬 분석기의 실제 응답(backendImport.payload + analysis)뿐이다. 없는 값은 만들지 않고 "미추출"/"분석기 미지원"으로 구분한다.
// - 결과는 저장되지 않는다(메모리 전용). 공식 평가정보로 쓰지 않는다. 확정·가져오기 버튼을 두지 않는다.

const studentFootnote = '이 결과는 이 탭에만 있고 저장되지 않았어요(새로고침하면 사라져요). 수행평가로 등록하려면 문서를 보며 직접 추가하거나, 관리자 확인을 거친 공식 평가정보를 기다려 주세요.'
const missing = '미추출'
const pct = (value: number | null | undefined) => (typeof value === 'number' ? `${value}%` : missing)
const text = (value: string | number | null | undefined, suffix = '') => (value === null || value === undefined || value === '' ? missing : `${value}${suffix}`)

function locatorLabel(source: PreviewSource): string {
  if (typeof source.pdfPageNumber === 'number') {
    return `PDF ${source.pdfPageNumber}쪽${source.printedPageLabel ? ` (문서 표기 ${source.printedPageLabel}쪽)` : ' (문서 표기 쪽 없음)'}`
  }
  const locator = source.documentLocator
  if (!locator) return '위치 정보 없음'
  const parts = [
    typeof locator.section === 'number' ? `구역 ${locator.section + 1}` : null,
    typeof locator.table === 'number' ? `표 ${locator.table + 1}` : null,
    typeof locator.row === 'number' && typeof locator.col === 'number' ? `${locator.row + 1}행 ${locator.col + 1}열` : null,
  ].filter(Boolean)
  return `${parts.join(' · ') || (locator.kind ?? '구조 위치')}${locator.path ? ` · ${locator.path}` : ''}`
}

function warningText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const parts = [record.code, record.message, record.reason].filter((part) => typeof part === 'string')
    if (parts.length > 0) return parts.join(' · ')
  }
  return JSON.stringify(value)
}

export function AnalysisPreviewResult({ entry, emptyAction, footnote = studentFootnote }: { entry: AnalysisPreviewEntry; emptyAction?: ReactNode; footnote?: string }) {
  const { result } = entry
  const subjects: PreviewSubject[] = result.backendImport?.payload?.subjects ?? []
  const segments: PreviewAnalysisSegment[] = result.analysis?.segments ?? []
  const [subjectIndex, setSubjectIndex] = useState(0)
  const source = result.source
  const shaState = !entry.localSha256 || !source?.sha256 ? '확인 불가' : entry.localSha256 === source.sha256 ? '일치' : '불일치'
  const experimental = result.backendImport?.variant === 'EXPERIMENTAL_MULTIFORMAT'
  const warnings = [...(result.warnings ?? []), ...(result.backendImport?.payload?.warnings ?? []), ...(result.analysis?.statusReasons ?? [])].map(warningText)
  const writtenCount = subjects.reduce((sum, subject) => sum + (subject.writtenEvaluation?.exams?.length ?? 0), 0)
  const performanceCount = subjects.reduce((sum, subject) => sum + (subject.performanceEvaluation?.items?.length ?? 0), 0)
  const current = subjects[Math.min(subjectIndex, Math.max(0, subjects.length - 1))]
  const currentIndex = current ? subjects.indexOf(current) : 0
  const segment = segments[currentIndex] ?? (segments.length === 1 ? segments[0] : undefined)

  return (
    <>
      <div className={styles.docLine}>
        <FileIcon size={16} className={styles.pdfIcon} />
        <span data-testid="preview-file-name">{entry.fileName}</span>
        <span className={styles.chip}>{source?.detectedFormat ?? '형식 미확인'}</span>
        <span className={styles.chip}>{formatBytes(entry.fileSize)}</span>
        <span className={styles.chip} data-tone="demo">
          저장되지 않은 미리보기
        </span>
      </div>

      <p className={styles.candidateBanner}>
        <InfoIcon size={15} />
        <span>
          <strong className={previewStyles.candidateInline}>자동 분석 후보 · 관리자 확인 전</strong> 규칙 기반 문서 구조 분석 결과예요(AI·LLM 호출 없음). 학교의 공식 평가정보가 아니고,
          수행평가 목록에 자동으로 들어가지 않아요.{experimental ? ' HWP·HWPX는 실험용 다중 형식 Adapter 결과이며 공식 확정 경로가 아니에요.' : ''}
        </span>
      </p>

      <section className={styles.block} aria-labelledby="doc-info-heading">
        <h2 id="doc-info-heading" className={styles.blockTitle}>
          문서 정보
        </h2>
        <dl className={previewStyles.factGrid} data-testid="preview-doc-info">
          <Fact label="파일">{entry.fileName}</Fact>
          <Fact label="형식">
            {source?.detectedFormat ?? '형식 미확인'}
            {source?.extensionMatchesFormat === false ? ' (확장자와 다름)' : ''}
          </Fact>
          <Fact label="분량">{typeof source?.pageCount === 'number' ? `${source.pageCount}쪽` : typeof source?.sectionCount === 'number' ? `구역 ${source.sectionCount}개 (쪽 번호 없음)` : missing}</Fact>
          <Fact label="분석 상태">{result.status ?? missing}</Fact>
          <Fact label="검토 상태">{result.reviewState?.status ?? missing}</Fact>
          <Fact label="분석기">
            {result.analyzer?.version ?? result.analyzerVersion ?? missing}
            {result.analyzerChannel ? ` · ${result.analyzerChannel}` : ''}
            {result.backendImport?.adapter ? ` · ${result.backendImport.adapter}` : ''}
          </Fact>
          <Fact label="원본 SHA-256">
            <span data-testid="preview-sha-state" data-state={shaState}>
              {shaState}
            </span>
            {source?.sha256 ? ` · ${source.sha256.slice(0, 16)}…` : ''}
          </Fact>
          <Fact label="문서의 학년도·학년·학기">{contextLabel(segment)}</Fact>
        </dl>
      </section>

      <section className={styles.block} aria-labelledby="summary-heading">
        <h2 id="summary-heading" className={styles.blockTitle}>
          평가 요약
        </h2>
        <ul className={previewStyles.summaryGrid} data-testid="preview-summary">
          <SummaryCard label="과목" value={subjects.length} />
          <SummaryCard label="지필평가" value={writtenCount} />
          <SummaryCard label="수행평가" value={performanceCount} />
          <SummaryCard label="근거 위치 미확인" value={result.summary?.locatorsUnresolved ?? 0} />
          <SummaryCard label="분석 경고" value={warnings.length} tone={warnings.length > 0 ? 'warn' : undefined} />
        </ul>
        {warnings.length > 0 && (
          <ul className={styles.sourceList} aria-label="분석 경고">
            {warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>
                <span className={styles.sourcePage}>
                  <AlertIcon size={12} /> 경고
                </span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {subjects.length === 0 ? (
        <section className={styles.stateBox} data-testid="preview-empty">
          <p className={styles.stateTitle}>분석은 끝났지만 찾은 과목·평가 항목이 없어요 ({result.status ?? missing})</p>
          <p className={styles.stateText}>분석 실패가 아니라 추출된 항목이 없는 상태예요. 수행평가가 0건이라는 뜻은 아니에요. 원본을 보면서 직접 추가해 주세요.</p>
          {emptyAction}
        </section>
      ) : (
        <>
          <div className={enrichmentStyles.tabs} role="tablist" aria-label="분석한 과목">
            {subjects.map((subject, index) => (
              <button
                key={`${subject.subjectName ?? 'subject'}-${index}`}
                type="button"
                role="tab"
                id={`preview-subject-tab-${index}`}
                aria-selected={index === currentIndex}
                aria-controls="preview-subject-panel"
                className={`${enrichmentStyles.tab} ${styles.subjectTab}`}
                onClick={() => setSubjectIndex(index)}
              >
                {subject.subjectName ?? '과목명 미추출'}
              </button>
            ))}
          </div>
          {current && <SubjectPanel key={currentIndex} subject={current} segment={segment} index={currentIndex} />}
        </>
      )}

      <p className={previewStyles.footnote}>
        {footnote}
        분석 시각 {new Date(entry.analyzedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · 요청 ID {result.requestId ?? missing}
      </p>
    </>
  )
}

function contextLabel(segment: PreviewAnalysisSegment | undefined): string {
  const context = segment?.context
  if (!context) return '분석기 결과 없음'
  const year = typeof context.academicYear === 'number' ? `${context.academicYear}학년도` : null
  const grades = context.grades?.length ? `${context.grades.join('·')}학년` : null
  const semesters = context.semesters?.length ? `${context.semesters.join('·')}학기` : null
  const parts = [year, grades, semesters].filter(Boolean)
  return parts.length > 0 ? `${parts.join(' ')}${year ? '' : ' (학년도 미추출)'}` : `${missing} (문서에서 찾지 못함)`
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={previewStyles.fact}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <li className={previewStyles.summaryCard} data-tone={tone}>
      <span className={previewStyles.summaryValue}>{value}</span>
      <span className={previewStyles.summaryLabel}>{label}</span>
    </li>
  )
}

function SubjectPanel({ subject, segment, index }: { subject: PreviewSubject; segment: PreviewAnalysisSegment | undefined; index: number }) {
  const exams = subject.writtenEvaluation?.exams ?? []
  const items = subject.performanceEvaluation?.items ?? []
  const subjectSources = (subject as { sources?: PreviewSource[] }).sources ?? []
  const teachingTables = segment?.teaching?.tables?.length ?? null
  return (
    <section id="preview-subject-panel" role="tabpanel" aria-labelledby={`preview-subject-tab-${index}`} className={styles.subjectPanel}>
      <section className={styles.block} aria-labelledby="preview-written-heading">
        <h2 id="preview-written-heading" className={styles.blockTitle}>
          지필평가 <span className={styles.blockMeta}>반영 {pct(subject.writtenEvaluation?.weightPercent)}</span>
        </h2>
        {exams.length === 0 ? (
          <p className={styles.muted}>문서에서 지필평가 항목을 찾지 못했어요 ({missing}).</p>
        ) : (
          <table className={styles.table} data-testid="preview-written-table">
            <thead>
              <tr>
                <th scope="col">시험 구분</th>
                <th scope="col">반영비율</th>
                <th scope="col">시기</th>
                <th scope="col">만점</th>
                <th scope="col">문항 유형</th>
                <th scope="col">근거</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam: PreviewWrittenExam, examIndex) => (
                <tr key={exam.itemKey ?? examIndex}>
                  <td>{typeof exam.round === 'number' ? `${exam.round}회` : missing}</td>
                  <td>{pct(exam.weightPercent)}</td>
                  <td>{text(exam.timing)}</td>
                  <td>{text((exam as { maxScore?: number | null }).maxScore, '점')}</td>
                  <td>{exam.questionTypes?.length ? exam.questionTypes.join(', ') : missing}</td>
                  <td>{exam.sources?.[0] ? locatorLabel(exam.sources[0]) : '위치 없음'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className={styles.blockHint}>평가 범위: 분석기 미지원 (분석 결과 형식에 범위 항목이 없어요).</p>
      </section>

      <section className={styles.block} aria-labelledby="preview-performance-heading">
        <h2 id="preview-performance-heading" className={styles.blockTitle}>
          수행평가 <span className={styles.blockMeta}>반영 {pct(subject.performanceEvaluation?.weightPercent)}</span>
        </h2>
        {items.length === 0 ? (
          <p className={styles.muted}>문서에서 수행평가 항목을 찾지 못했어요 ({missing}).</p>
        ) : (
          <ul className={styles.itemList} data-testid="preview-performance-list">
            {items.map((item, itemIndex) => (
              <PerformanceItem key={item.itemKey ?? itemIndex} item={item} />
            ))}
          </ul>
        )}
      </section>

      <section className={styles.block} aria-labelledby="preview-plan-heading">
        <h2 id="preview-plan-heading" className={styles.blockTitle}>
          운영계획
        </h2>
        <dl className={previewStyles.factGrid}>
          <Fact label="교수·학습 운영표">
            {teachingTables === null ? '분석기 결과 없음' : teachingTables === 0 ? `${missing} (문서에서 운영표를 찾지 못함)` : `${teachingTables}개 추출 · 화면 표시 형식 미정 (원문 확인 필요)`}
          </Fact>
          <Fact label="평가 운영 언급">
            {typeof segment?.teaching?.inClassEvaluationMentions === 'number' ? `${segment.teaching.inClassEvaluationMentions}건` : missing}
          </Fact>
          <Fact label="성취기준">분석기 미지원 (분석 결과 형식에 성취기준 항목이 없어요)</Fact>
          <Fact label="평가 방법">수행평가 항목의 제출물·조건·채점 요소로 표시</Fact>
        </dl>
      </section>

      <section className={styles.block} aria-labelledby="preview-sources-heading">
        <h2 id="preview-sources-heading" className={styles.blockTitle}>
          원문 근거 (과목)
        </h2>
        <p className={styles.blockHint}>
          PDF는 파일의 1번째 쪽부터 센 쪽 번호, HWP·HWPX는 문서 구역·표·행·열 위치예요. HWP·HWPX에는 쪽 번호를 만들지 않아요.
        </p>
        <SourceList sources={subjectSources} />
      </section>
    </section>
  )
}

function PerformanceItem({ item }: { item: PreviewPerformanceItem }) {
  const [open, setOpen] = useState(false)
  const sources = [...(item.sources ?? []), ...(item.rubric ?? []).flatMap((rubric) => rubric.sources ?? [])]
  return (
    <li className={styles.item}>
      <div className={styles.itemBody}>
        <span className={styles.itemTitleRow}>
          <span className={styles.itemTitle}>{item.label ?? '이름 미추출'}</span>
          {item.area && <span className={styles.chip}>{item.area}</span>}
        </span>
        <span className={styles.itemMeta}>
          반영 {pct(item.weightPercent)} · 만점 {text(item.maxScore, '점')} · 시기 {text(item.timing)}
        </span>
        <dl className={previewStyles.factGrid}>
          <Fact label="평가 내용">{item.content ? <span className={previewStyles.preLine}>{item.content}</span> : missing}</Fact>
          <Fact label="제출물">{item.submissions?.length ? item.submissions.join(', ') : missing}</Fact>
          <Fact label="조건·활동">{item.conditions?.length ? <span className={previewStyles.preLine}>{item.conditions.join('\n')}</span> : missing}</Fact>
        </dl>
        {(item.rubric ?? []).length > 0 ? (
          <table className={styles.table} aria-label={`${item.label ?? '수행평가'} 채점 요소·기준`}>
            <thead>
              <tr>
                <th scope="col">채점 요소</th>
                <th scope="col">채점 기준(수준)</th>
                <th scope="col">배점</th>
              </tr>
            </thead>
            <tbody>
              {(item.rubric ?? []).flatMap((rubric, rubricIndex) =>
                (rubric.levels?.length ? rubric.levels : [{ description: null, score: null }]).map((level, levelIndex) => (
                  <tr key={`${rubricIndex}-${levelIndex}`}>
                    <td>{levelIndex === 0 ? (rubric.element ?? missing) : ''}</td>
                    <td>{text(level.description)}</td>
                    <td>{text(level.score, '점')}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        ) : (
          <span className={styles.itemMeta}>채점 요소·기준: {missing}</span>
        )}
        <span className={styles.evidenceRow}>
          {sources.length === 0 ? (
            <span className={styles.chip} data-tone="warn">
              근거 위치 없음 · 원문 확인 필요
            </span>
          ) : (
            <button type="button" className={styles.textButton} aria-expanded={open} onClick={() => setOpen(!open)}>
              근거 {sources.length}건 · {locatorLabel(sources[0])}
              <ChevronDownIcon size={12} />
            </button>
          )}
        </span>
        {open && <SourceList sources={sources} />}
      </div>
    </li>
  )
}

function SourceList({ sources }: { sources: PreviewSource[] }) {
  if (sources.length === 0) return <p className={styles.muted}>근거 위치가 없어요 (원문 확인 필요).</p>
  return (
    <ul className={styles.sourceList}>
      {sources.map((source, index) => (
        <li key={index}>
          <span className={styles.sourcePage}>{locatorLabel(source)}</span>
          <span>{source.extractedText ?? '(근거 문자열 없음)'}</span>
        </li>
      ))}
    </ul>
  )
}
