import { useEffect, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { saveAiReview } from '../api/assessmentAdminApi.ts'
import { PdfViewer } from '../components/canonicalUi.ts'
import { paths } from '../routes/paths.ts'
import styles from './ai.module.css'
import { analyzeEvaluationPlanPdf, type AiField, type EvaluationPlanResult } from './aiApi.ts'
import { FieldRow, ProviderBanner, RunStatus, Section, Warnings } from './AiParts.tsx'
import { useAiProvider, useAiRun } from './useAiRun.ts'

// AI 기능 A — 학교 평가계획서 PDF 분석 (요청 ⑨-A, api-contract.md §47-A PROPOSED).
// 왼쪽 원본 PDF(관리자가 고른 로컬 파일) / 오른쪽 AI 추출 후보. 값은 관리자가 고치고 "검토 완료"로 확정 기록만 남긴다.
// 확정 기록은 학교 평가계획서·학생 수행평가·노트·피드백을 자동으로 바꾸지 않는다 (공식 반영은 기존 검토 화면의 확인 절차).
export function EvaluationPlanAiRoute() {
  const { provider, retry } = useAiProvider()
  const { state, run, confirm, reset } = useAiRun<EvaluationPlanResult>()
  // 관리자가 고른 로컬 PDF와 미리보기 주소 (주소는 고를 때 만들고, 바뀌거나 화면을 떠날 때 해제한다)
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null)
  const file = picked?.file ?? null
  const fileUrl = picked?.url ?? null
  const [hint, setHint] = useState('')
  const [page, setPage] = useState(1)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url)
  }, [picked])

  const analysis = state.kind === 'review' || state.kind === 'confirmed' ? state.analysis : null
  const readOnly = state.kind === 'confirmed'
  const checkOf = (path: string) => analysis?.evidenceChecks.find((check) => check.path === path)
  const row = (path: string, label: string, field: AiField) => (
    <FieldRow
      key={path}
      label={label}
      field={field}
      check={checkOf(path)}
      edited={edits[path]}
      readOnly={readOnly}
      onEdit={(value) => setEdits((previous) => ({ ...previous, [path]: value }))}
      onShowPage={setPage}
    />
  )

  const start = () => {
    if (!file) return
    setEdits({})
    setSaveError(null)
    void run((key) => analyzeEvaluationPlanPdf(file, hint, key))
  }

  const confirmReview = async () => {
    if (!analysis || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const saved = await saveAiReview({ analysisId: analysis.analysisId, kind: analysis.kind, sourceSha256: analysis.source.sha256, sourceName: analysis.source.fileName, edits })
      confirm(analysis, saved.confirmedAt)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '검토 기록을 저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  const result = analysis?.result
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.trail}>학교별 평가계획서 / AI 분석</p>
          <h2 className={styles.headTitle}>평가계획서 PDF AI 분석</h2>
        </div>
        <div className={styles.headEnd}>
          <button type="button" className={styles.button} onClick={() => navigate(paths.plans)}>
            목록으로
          </button>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.viewer}>
          {fileUrl && file ? (
            <PdfViewer url={fileUrl} title={file.name} expectedPageCount={analysis?.source.pageCount ?? 0} page={page} onPageChange={setPage} />
          ) : (
            <div className={styles.placeholder}>PDF를 고르면 원본을 여기에서 보며 AI 결과와 비교할 수 있어요.</div>
          )}
        </div>
        <div className={styles.panel}>
          <ProviderBanner provider={provider} onRetry={retry} />
          <div className={styles.form}>
            <div className={styles.fileRow}>
              <input
                type="file"
                accept="application/pdf,.pdf"
                aria-label="평가계획서 PDF 고르기"
                disabled={state.kind === 'running'}
                onChange={(event) => {
                  const chosen = event.target.files?.[0] ?? null
                  setPicked(chosen ? { file: chosen, url: URL.createObjectURL(chosen) } : null)
                  setPage(1)
                  reset()
                }}
              />
            </div>
            <input className={styles.input} value={hint} maxLength={200} placeholder="(선택) 관리자 메모: 예) 2학년 2학기 계획서" onChange={(event) => setHint(event.target.value)} aria-label="분석 메모" />
            <div className={styles.fileRow}>
              <button type="button" className={styles.buttonPrimary} disabled={!file || state.kind === 'running'} aria-busy={state.kind === 'running'} onClick={start}>
                {state.kind === 'running' ? '분석 중…' : analysis ? '다시 분석' : 'AI 분석'}
              </button>
              <span className={styles.muted}>PDF만, 20MB·120쪽 이하. 이미지(스캔)형 PDF는 OCR 미연결이라 분석할 수 없어요.</span>
            </div>
          </div>
          <RunStatus state={state} onRetry={file ? start : undefined} />
          {analysis && <Warnings items={analysis.warnings} />}

          {result && (
            <>
              <Section title="학교·학년도·학년·학기">
                {row('schoolName', '학교', result.schoolName)}
                {row('academicYear', '학년도', result.academicYear)}
                {row('grade', '학년', result.grade)}
                {row('semester', '학기', result.semester)}
              </Section>
              {result.subjects.length === 0 && <p className={styles.muted}>AI가 과목별 평가 구조를 찾지 못했어요. 원본을 확인해 직접 입력해 주세요.</p>}
              {result.subjects.map((subject, s) => {
                const base = `subjects[${s}]`
                return (
                  <Section key={base} title={subject.subjectName.found ? subject.subjectName.value : `과목 ${s + 1}`}>
                    {row(`${base}.subjectName`, '과목', subject.subjectName)}
                    {row(`${base}.writtenExamTotalRatio`, '지필 전체(%)', subject.writtenExamTotalRatio)}
                    {row(`${base}.performanceTotalRatio`, '수행 전체(%)', subject.performanceTotalRatio)}
                    {subject.writtenExams.map((exam, e) => (
                      <div key={`${base}.writtenExams[${e}]`} className={styles.card}>
                        <p className={styles.cardTitle}>지필평가 {e + 1}</p>
                        {row(`${base}.writtenExams[${e}].name`, '구분', exam.name)}
                        {row(`${base}.writtenExams[${e}].timing`, '시기', exam.timing)}
                        {row(`${base}.writtenExams[${e}].ratio`, '반영비율', exam.ratio)}
                        {row(`${base}.writtenExams[${e}].maxScore`, '만점', exam.maxScore)}
                      </div>
                    ))}
                    {subject.performanceAreas.map((area, a) => (
                      <div key={`${base}.performanceAreas[${a}]`} className={styles.card}>
                        <p className={styles.cardTitle}>수행평가 영역 {a + 1}</p>
                        {row(`${base}.performanceAreas[${a}].area`, '영역', area.area)}
                        {row(`${base}.performanceAreas[${a}].evaluationType`, '평가 유형', area.evaluationType)}
                        {row(`${base}.performanceAreas[${a}].timing`, '시기', area.timing)}
                        {row(`${base}.performanceAreas[${a}].ratio`, '반영비율', area.ratio)}
                        {row(`${base}.performanceAreas[${a}].maxScore`, '만점·배점', area.maxScore)}
                        {area.scoringCriteria.map((criterion, c) => row(`${base}.performanceAreas[${a}].scoringCriteria[${c}]`, `채점기준 ${c + 1}`, criterion))}
                      </div>
                    ))}
                    {subject.achievementStandards.map((standard, i) => (
                      <div key={`${base}.achievementStandards[${i}]`} className={styles.card}>
                        <p className={styles.cardTitle}>성취기준 {i + 1}</p>
                        {row(`${base}.achievementStandards[${i}].code`, '코드', standard.code)}
                        {row(`${base}.achievementStandards[${i}].statement`, '내용', standard.statement)}
                      </div>
                    ))}
                    {subject.units.map((unit, i) => row(`${base}.units[${i}]`, `단원 ${i + 1}`, unit))}
                    {subject.teachingMethods.map((method, i) => row(`${base}.teachingMethods[${i}]`, `교수·평가 방법 ${i + 1}`, method))}
                    {subject.achievementLevels.map((level, i) => row(`${base}.achievementLevels[${i}]`, `성취수준 ${i + 1}`, level))}
                  </Section>
                )
              })}
              {result.unreadableNotes.length > 0 && (
                <Section title="AI가 읽기 어려웠던 부분">
                  <ul className={styles.list}>
                    {result.unreadableNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </Section>
              )}
              <Section title="검토">
                <p className={styles.para}>
                  AI 결과는 공식 값이 아니라 후보예요. 근거 쪽을 확인하고 값을 고친 뒤 검토 완료를 누르면 검토 기록만 남아요. 학교 평가계획서·학생 기록은 자동으로 바뀌지 않아요.
                </p>
                {saveError && (
                  <p className={styles.banner} data-tone="danger" role="alert">
                    {saveError}
                  </p>
                )}
                <div className={styles.fileRow}>
                  <button type="button" className={styles.button} disabled={readOnly || saving} onClick={confirmReview}>
                    {readOnly ? '검토 완료됨' : saving ? '저장 중…' : `검토 완료${Object.keys(edits).length ? ` (수정 ${Object.keys(edits).length}건)` : ''}`}
                  </button>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
