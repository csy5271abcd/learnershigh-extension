import { useEffect, useState } from 'react'
import { navigate } from '../../../app/adminLocation.ts'
import { saveAiReview } from '../api/assessmentAdminApi.ts'
import { PdfViewer } from '../components/canonicalUi.ts'
import { paths } from '../routes/paths.ts'
import styles from './ai.module.css'
import { analyzeUniversityExamPdf, type ExamQuestion, type UniversityExamResult } from './aiApi.ts'
import { EvidenceBadge, ProviderBanner, RunStatus, Section, Warnings } from './AiParts.tsx'
import { useAiProvider, useAiRun } from './useAiRun.ts'

// AI 기능 B — 대학별 자료 PDF 문항 분석·심화 탐구 추천 (요청 ⑨-B, api-contract.md §47-A PROPOSED).
// 새 PDF 분석 결과는 Candidate다. 기존 27개 자료·123개 문항 Manifest는 읽지도 덮어쓰지도 않는다.
// 확정하면 관리자 검토 기록(문항 제목·쪽 범위 수정 포함)만 남고, Manifest 반영은 별도 승인 절차가 필요하다.
export function UniversityExamAiRoute() {
  const { provider, retry } = useAiProvider()
  const { state, run, confirm, reset } = useAiRun<UniversityExamResult>()
  // 관리자가 고른 로컬 PDF와 미리보기 주소 (주소는 고를 때 만들고, 바뀌거나 화면을 떠날 때 해제한다)
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null)
  const file = picked?.file ?? null
  const fileUrl = picked?.url ?? null
  const [hint, setHint] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(0)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url)
  }, [picked])

  const analysis = state.kind === 'review' || state.kind === 'confirmed' ? state.analysis : null
  const readOnly = state.kind === 'confirmed'
  const questions = analysis?.result.questions ?? []
  const question: ExamQuestion | undefined = questions[selected]
  const check = analysis?.evidenceChecks.find((item) => item.path === `questions[${selected}].pages`)

  const start = () => {
    if (!file) return
    setEdits({})
    setSelected(0)
    setSaveError(null)
    void run((key) => analyzeUniversityExamPdf(file, hint, key))
  }

  const edit = (field: string, value: string) => setEdits((previous) => ({ ...previous, [`questions[${selected}].${field}`]: value }))
  const valueOf = (field: string, original: string) => edits[`questions[${selected}].${field}`] ?? original

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

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.trail}>심화 탐구 콘텐츠 / 대학별 자료 / AI 문항 분석</p>
          <h2 className={styles.headTitle}>대학별 자료 PDF AI 문항 분석</h2>
        </div>
        <div className={styles.headEnd}>
          <button type="button" className={styles.button} onClick={() => navigate(paths.universities)}>
            대학별 자료로
          </button>
        </div>
      </header>
      <div className={styles.body}>
        <div className={styles.viewer}>
          {fileUrl && file ? (
            <PdfViewer url={fileUrl} title={file.name} expectedPageCount={analysis?.source.pageCount ?? 0} page={page} onPageChange={setPage} />
          ) : (
            <div className={styles.placeholder}>대학 입학처에서 받은 PDF를 고르면 원본과 문항 분석을 나란히 볼 수 있어요.</div>
          )}
        </div>
        <div className={styles.panel}>
          <ProviderBanner provider={provider} onRetry={retry} />
          <p className={styles.banner}>기존 서울대 9개·KAIST 18개 자료(문항 123개)는 이 분석으로 바뀌지 않아요.</p>
          <div className={styles.form}>
            <input
              type="file"
              accept="application/pdf,.pdf"
              aria-label="대학별 자료 PDF 고르기"
              disabled={state.kind === 'running'}
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null
                setPicked(chosen ? { file: chosen, url: URL.createObjectURL(chosen) } : null)
                setPage(1)
                reset()
              }}
            />
            <input className={styles.input} value={hint} maxLength={200} placeholder="(선택) 메모: 예) 서울대 2026 인문 논술" onChange={(event) => setHint(event.target.value)} aria-label="분석 메모" />
            <div className={styles.fileRow}>
              <button type="button" className={styles.buttonPrimary} disabled={!file || state.kind === 'running'} aria-busy={state.kind === 'running'} onClick={start}>
                {state.kind === 'running' ? '분석 중…' : analysis ? '다시 분석' : 'AI 문항 분석'}
              </button>
            </div>
          </div>
          <RunStatus state={state} onRetry={file ? start : undefined} />
          {analysis && <Warnings items={[...analysis.warnings, ...analysis.result.limitations]} />}

          {analysis && questions.length === 0 && <p className={styles.muted}>AI가 문항을 나누지 못했어요. 원본을 확인해 주세요.</p>}
          {questions.length > 0 && (
            <ul className={styles.questionList} aria-label="분석된 문항">
              {questions.map((item, index) => (
                <li key={`${item.questionNumber}-${index}`}>
                  <button
                    type="button"
                    className={styles.questionItem}
                    aria-current={index === selected ? 'true' : undefined}
                    onClick={() => {
                      setSelected(index)
                      setPage(item.startPage > 0 ? item.startPage : 1)
                    }}
                  >
                    <strong>문항 {item.questionNumber || index + 1}</strong>
                    <span>{item.title}</span>
                    <span className={styles.muted}>
                      PDF {item.startPage}~{item.endPage}쪽
                    </span>
                    {!item.boundaryConfident && <span className={styles.badge} data-tone="warning">위치 검토 필요</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {question && (
            <>
              <Section title={`문항 ${question.questionNumber || selected + 1}`} action={check && <EvidenceBadge check={check} />}>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>문항 제목</span>
                  <input className={styles.fieldInput} readOnly={readOnly} value={valueOf('title', question.title)} onChange={(event) => edit('title', event.target.value)} aria-label="문항 제목" />
                </div>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>시작 쪽</span>
                  <input className={styles.fieldInput} readOnly={readOnly} inputMode="numeric" value={valueOf('startPage', String(question.startPage))} onChange={(event) => edit('startPage', event.target.value)} aria-label="문제 시작 PDF 쪽" />
                </div>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>끝 쪽</span>
                  <input className={styles.fieldInput} readOnly={readOnly} inputMode="numeric" value={valueOf('endPage', String(question.endPage))} onChange={(event) => edit('endPage', event.target.value)} aria-label="문제 끝 PDF 쪽" />
                </div>
                <div className={styles.evidence} style={{ gridColumn: 'auto', marginTop: 6 }}>
                  {question.startPage > 0 && (
                    <button type="button" className={styles.pageButton} onClick={() => setPage(question.startPage)}>
                      문제 PDF p.{question.startPage}
                    </button>
                  )}
                  {question.intentPages.map((p) => (
                    <button key={`intent-${p}`} type="button" className={styles.pageButton} onClick={() => setPage(p)}>
                      출제 의도 p.{p}
                    </button>
                  ))}
                  {question.basisPages.map((p) => (
                    <button key={`basis-${p}`} type="button" className={styles.pageButton} onClick={() => setPage(p)}>
                      출제 근거 p.{p}
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="핵심 개념·사고력">
                <p className={styles.para}>관련 교과 개념: {question.relatedConcepts.join(', ') || '—'}</p>
                <p className={styles.para}>핵심 사고력: {question.thinkingSkills.join(', ') || '—'}</p>
              </Section>
              <Section title="문제 분석">
                <textarea className={styles.textarea} readOnly={readOnly} value={valueOf('problemAnalysis', question.problemAnalysis)} onChange={(event) => edit('problemAnalysis', event.target.value)} aria-label="문제 분석" />
              </Section>
              <Section title="심화 탐구 주제 (제안)">
                {question.inquiryTopics.length === 0 && <p className={styles.muted}>제안된 주제가 없어요.</p>}
                {question.inquiryTopics.map((topic, t) => (
                  <div key={`${topic.title}-${t}`} className={styles.card}>
                    <p className={styles.cardTitle}>{topic.title}</p>
                    <p className={styles.para}>선정 이유: {topic.reason}</p>
                    <p className={styles.para}>탐구 방법</p>
                    <ul className={styles.list}>
                      {topic.methods.map((method) => (
                        <li key={method}>{method}</li>
                      ))}
                    </ul>
                    <p className={styles.para}>추가 탐구 질문</p>
                    <ul className={styles.list}>
                      {topic.extensionQuestions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Section>
              <Section title="관련 참고자료 후보">
                <ul className={styles.list}>
                  {question.referenceCandidates.length === 0 ? <li>—</li> : question.referenceCandidates.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </Section>
            </>
          )}
          {analysis && (
            <Section title="검토">
              {saveError && (
                <p className={styles.banner} data-tone="danger" role="alert">
                  {saveError}
                </p>
              )}
              <button type="button" className={styles.button} disabled={readOnly || saving} onClick={confirmReview}>
                {readOnly ? '확정됨 (후보 기록)' : saving ? '저장 중…' : `확정${Object.keys(edits).length ? ` (수정 ${Object.keys(edits).length}건)` : ''}`}
              </button>
              <span className={styles.muted}>그림·도표 중심 문항은 텍스트만으로 분석이 부족할 수 있어요.</span><p className={styles.muted}>확정해도 기존 Manifest·학생 화면에는 반영되지 않아요. 반영은 저작권·출처 확인 후 별도 작업이에요.</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
