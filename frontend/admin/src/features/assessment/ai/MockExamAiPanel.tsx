import type { MockExamMaterial } from '../api/canonicalSource.ts'
import styles from './ai.module.css'
import { analyzeMockExamPassage, type MockExamTopic } from './aiApi.ts'
import { ProviderBanner, RunStatus, Section, Warnings } from './AiParts.tsx'
import { useAiProvider, useAiRun } from './useAiRun.ts'
import type { MockExamResult } from './aiApi.ts'

interface MockExamAiPanelProps {
  materialId: string | null
  passageText: string
  aiTransferAllowed: boolean
  context: { subjectName: string; academicYear: number | null; examMonth: number | null; grade: number | null; questionNumber: string | null }
  /** 관리자가 고른 주제를 폼의 탐구 소재 칸에 넣는다 (저장은 폼의 저장 버튼으로만) */
  onApply: (idea: Partial<MockExamMaterial['idea']>) => void
}

const minLength = 50

// AI 기능 C — 모의고사 지문 기반 심화 탐구 생성 (요청 ⑨-C, api-contract.md §47-A PROPOSED).
// 원문 이용 조건(외부 AI 전송 허용)을 확인하지 않으면 요청하지 않는다. 결과는 선택해 폼에 넣을 뿐이고, 저장해야 소재 카드가 바뀐다.
// 다른 59개 소재는 건드리지 않는다.
export function MockExamAiPanel({ passageText, aiTransferAllowed, context, onApply }: MockExamAiPanelProps) {
  const { provider, retry } = useAiProvider()
  const { state, run } = useAiRun<MockExamResult>()
  const tooShort = passageText.trim().length < minLength
  const blockedReason = passageText.trim() === ''
    ? '원문을 입력하면 분석할 수 있어요.'
    : tooShort
      ? `원문이 너무 짧아요 (${minLength}자 이상).`
      : !aiTransferAllowed
        ? '원문 이용 조건(외부 AI 전송 허용)을 확인해야 분석할 수 있어요.'
        : null

  const start = () => {
    if (blockedReason) return
    void run((key) =>
      analyzeMockExamPassage(
        {
          subjectName: context.subjectName,
          academicYear: context.academicYear,
          examMonth: context.examMonth,
          grade: context.grade,
          questionNumber: context.questionNumber,
          fieldHint: null,
          passageText,
          aiTransferConfirmed: aiTransferAllowed,
        },
        key,
      ),
    )
  }

  const apply = (topic: MockExamTopic, keyConcepts: string[], fields: string[]) =>
    onApply({
      topicTitle: topic.title,
      topicReason: topic.reason,
      goal: topic.goal,
      extensionQuestions: topic.questions,
      relatedFields: fields.length ? fields : topic.relatedSubjects,
      coreMaterial: keyConcepts[0] ?? '',
    })

  const analysis = state.kind === 'review' || state.kind === 'confirmed' ? state.analysis : null
  const result = analysis?.result
  return (
    <section className={styles.card} aria-label="AI 심화 탐구 분석" data-testid="mock-exam-ai">
      <p className={styles.cardTitle}>AI 심화 탐구 분석</p>
      <ProviderBanner provider={provider} onRetry={retry} />
      <div className={styles.fileRow}>
        <button type="button" className={styles.button} disabled={blockedReason !== null || state.kind === 'running'} aria-busy={state.kind === 'running'} onClick={start} aria-describedby="mock-ai-blocked">
          {state.kind === 'running' ? '분석 중…' : analysis ? '다시 분석' : 'AI 분석하기'}
        </button>
        {blockedReason && (
          <span id="mock-ai-blocked" className={styles.muted}>
            {blockedReason}
          </span>
        )}
      </div>
      <RunStatus state={state} onRetry={blockedReason ? undefined : start} />
      {analysis && <Warnings items={analysis.warnings} />}
      {result && (
        <>
          <Section title="지문 분석">
            <p className={styles.para}>{result.summary || '—'}</p>
            <p className={styles.para}>핵심 개념: {result.keyConcepts.join(', ') || '—'}</p>
            <p className={styles.para}>핵심 주장·원리: {result.coreClaims.join(' / ') || '—'}</p>
            <p className={styles.para}>관련 학문 분야: {result.academicFields.join(', ') || '—'}</p>
          </Section>
          {result.materials.length > 0 && (
            <Section title="탐구 소재">
              <ul className={styles.list}>
                {result.materials.map((material) => (
                  <li key={material.material}>
                    <strong>{material.material}</strong> — {material.curriculumLink} · {material.realWorldExtension}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section title="추천 탐구 주제">
            {result.topics.length === 0 && <p className={styles.muted}>지문에서 충분히 도출한 주제가 없어요.</p>}
            {result.topics.map((topic, index) => (
              <div key={`${topic.title}-${index}`} className={styles.card}>
                <p className={styles.cardTitle}>
                  {index + 1}. {topic.title}
                </p>
                <p className={styles.para}>추천 이유: {topic.reason}</p>
                <p className={styles.para}>탐구 목표: {topic.goal}</p>
                <p className={styles.para}>탐구 질문</p>
                <ul className={styles.list}>
                  {topic.questions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className={styles.para}>탐구 방법</p>
                <ul className={styles.list}>
                  {topic.methods.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className={styles.para}>예상 결과물: {topic.expectedOutput} · 관련 과목: {topic.relatedSubjects.join(', ')}</p>
                <p className={styles.para}>확장 방향: {topic.extensionDirection}</p>
                <button type="button" className={styles.button} onClick={() => apply(topic, result.keyConcepts, result.academicFields)}>
                  선택하여 적용 (폼에 채우기)
                </button>
              </div>
            ))}
            <p className={styles.muted}>적용하면 아래 탐구 소재 칸만 바뀌어요. 직접 고친 뒤 저장해야 반영되고, 원문은 그대로예요.</p>
          </Section>
        </>
      )}
    </section>
  )
}
