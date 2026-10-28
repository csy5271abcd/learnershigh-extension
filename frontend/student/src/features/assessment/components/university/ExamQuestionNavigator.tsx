import { useState } from 'react'
import type { UniversityExamDocument, UniversityExamQuestion } from '../../api/types.ts'
import { answerSectionKinds, examSectionLabels, pageRangeLabel, questionDisplayLabel } from '../../model/universityExamView.ts'
import { ChevronDownIcon } from '../AssessmentIcons.tsx'
import styles from './university.module.css'

interface ExamQuestionNavigatorProps {
  document: UniversityExamDocument
  currentQuestionId: string | null
  currentPage: number
  onGoTo: (page: number, questionId: string) => void
  onStartTask: (question: UniversityExamQuestion) => void
}

// 문항 목차·문항 학습 (원문에서 확인된 문항·구획만). 문제를 먼저 읽도록 해설·채점 기준·예시 답안·총평은 접어 둔다.
// 해설·답을 앱이 새로 쓰지 않고 원본 PDF의 그 쪽으로만 이동한다.
export function ExamQuestionNavigator({ document, currentQuestionId, currentPage, onGoTo, onStartTask }: ExamQuestionNavigatorProps) {
  const [openAnswers, setOpenAnswers] = useState<Record<string, boolean>>({})

  if (document.indexStatus !== 'INDEXED') {
    return <p className={styles.mutedText}>이 문서는 문항 목차를 아직 만들지 않았어요. 원문은 그대로 볼 수 있어요.</p>
  }

  return (
    <ol className={styles.toc} aria-label="문항 목차">
      {document.questions.map((question) => {
        const current = question.questionId === currentQuestionId
        const openSections = question.sections.filter((section) => !answerSectionKinds.has(section.kind))
        const answerSections = question.sections.filter((section) => answerSectionKinds.has(section.kind))
        const answersOpen = openAnswers[question.questionId] ?? false
        const label = questionDisplayLabel(question)
        return (
          <li key={question.questionId} className={styles.tocItem} data-current={current} aria-current={current ? 'location' : undefined}>
            <div className={styles.tocHead}>
              <div>
                <p className={styles.tocTitle}>{label}</p>
                {question.topic && <p className={styles.tocTopic}>{question.topic}</p>}
              </div>
            </div>
            {question.concepts.length > 0 && <p className={styles.tocConcepts}>{question.concepts.join(' · ')}</p>}
            <div className={styles.pageLinks}>
              <button
                type="button"
                className={styles.pageLink}
                aria-current={currentPage === question.pageStart ? 'true' : undefined}
                aria-label={`${label} 문제 보기, ${pageRangeLabel(question.pageStart, question.pageEnd)}`}
                onClick={() => onGoTo(question.pageStart, question.questionId)}
              >
                문제 보기 <span>{pageRangeLabel(question.pageStart, question.pageEnd)}</span>
              </button>
              {openSections.map((section) => (
                <button
                  key={section.kind}
                  type="button"
                  className={styles.pageLink}
                  aria-current={currentPage === section.page ? 'true' : undefined}
                  aria-label={`${label} ${examSectionLabels[section.kind]}, ${section.page}쪽`}
                  onClick={() => onGoTo(section.page, question.questionId)}
                >
                  {examSectionLabels[section.kind]} <span>{section.page}쪽</span>
                </button>
              ))}
            </div>
            {answerSections.length > 0 && (
              <>
                <button
                  type="button"
                  className={styles.answerToggle}
                  aria-expanded={answersOpen}
                  aria-controls={`answers-${question.questionId}`}
                  onClick={() => setOpenAnswers((previous) => ({ ...previous, [question.questionId]: !answersOpen }))}
                >
                  <ChevronDownIcon size={13} />
                  {answerSections.map((section) => examSectionLabels[section.kind]).join('·')} 보기
                </button>
                <div id={`answers-${question.questionId}`} className={styles.pageLinks} hidden={!answersOpen}>
                  {answersOpen &&
                    answerSections.map((section) => (
                      <button
                        key={section.kind}
                        type="button"
                        className={styles.pageLink}
                        aria-current={currentPage === section.page ? 'true' : undefined}
                        aria-label={`${label} ${examSectionLabels[section.kind]}, ${section.page}쪽`}
                        onClick={() => onGoTo(section.page, question.questionId)}
                      >
                        {examSectionLabels[section.kind]} <span>{section.page}쪽</span>
                      </button>
                    ))}
                </div>
              </>
            )}
            {question.studyExamples && question.studyExamples.length > 0 && (
              <div className={styles.exampleBox}>
                <span className={styles.exampleLabel}>탐구 방향 예시</span>
                {question.studyExamples.map((example) => (
                  <p key={example}>{example}</p>
                ))}
                <span className={styles.exampleHint}>LearnersHigh가 쓴 학습용 예시예요. 대학 공식 출제 의도나 추천 주제가 아니에요.</span>
              </div>
            )}
            <button type="button" className={styles.outlineButton} onClick={() => onStartTask(question)}>
              이 문항으로 심화 탐구 시작
            </button>
          </li>
        )
      })}
    </ol>
  )
}
