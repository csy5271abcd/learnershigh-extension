import { useId, useState } from 'react'
import type { NoteBlockAttrs, UniversityExamDocument } from '../../api/types.ts'
import { listUniversityExamDocuments } from '../../api/universityExamApi.ts'
import { examCategoryLabels, examSourceLine, matchesExamSearch, pageRangeLabel, questionDisplayLabel } from '../../model/universityExamView.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { ChevronDownIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './university.module.css'

export type ExamSourcePick = NonNullable<NoteBlockAttrs['examSource']> & { title: string }

/** 원문 보기 → 탐구 상세 이동 State. 탐구 상세의 노트 편집기가 받아 출처 카드를 넣는다 */
export interface ExamSourceInsertState {
  examSourceInsert: ExamSourcePick
}

interface ExamSourcePickerModalProps {
  onClose: () => void
  onPick: (source: ExamSourcePick) => void
}

// 노트 "/대학 기출 PDF" (또는 "/참고자료"): 대학별 기출 문서 → 문항(있으면) → 쪽 범위를 골라 출처 카드로 넣는다.
// 원본 PDF는 탐구마다 복제하지 않고 문서 ID·쪽 범위만 남긴다 (P-25).
export function ExamSourcePickerModal({ onClose, onPick }: ExamSourcePickerModalProps) {
  const ids = { search: useId(), question: useId(), start: useId(), end: useId() }
  const documents = useApiQuery('ae-uni-exams', () => listUniversityExamDocuments())
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<UniversityExamDocument>()
  const [questionId, setQuestionId] = useState('')
  const [start, setStart] = useState('1')
  const [end, setEnd] = useState('')

  const items = (documents.data?.items ?? []).filter((document) => matchesExamSearch(document, query))
  const question = selected?.questions.find((item) => item.questionId === questionId) ?? null
  const startPage = Number(start)
  const endPage = end === '' ? null : Number(end)
  const rangeError = !selected
    ? null
    : !Number.isInteger(startPage) || startPage < 1 || startPage > selected.pageCount
      ? `시작 쪽은 1~${selected.pageCount} 사이로 적어 주세요.`
      : endPage !== null && (!Number.isInteger(endPage) || endPage < startPage || endPage > selected.pageCount)
        ? `끝 쪽은 ${startPage}~${selected.pageCount} 사이로 적어 주세요.`
        : null
  const canPick = selected !== undefined && rangeError === null

  const choose = (document: UniversityExamDocument) => {
    setSelected(document)
    setQuestionId('')
    setStart('1')
    setEnd('')
  }

  const pick = () => {
    if (!selected || rangeError) return
    const pageEnd = endPage !== null && endPage !== startPage ? endPage : null
    onPick({
      documentId: selected.documentId,
      questionId: question?.questionId ?? null,
      pageStart: startPage,
      pageEnd,
      label: examSourceLine(selected, question, startPage, pageEnd),
      title: selected.title,
    })
  }

  return (
    <Modal
      title="대학 기출 PDF를 출처로 연결"
      description="원문은 복사하지 않고 문서와 쪽만 노트에 출처 카드로 남겨요."
      onRequestClose={onClose}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose}>
            취소
          </button>
          <button type="button" className={formStyles.primaryButton} disabled={!canPick} onClick={pick}>
            노트에 넣기
          </button>
        </>
      }
    >
      {documents.status === 'error' && documents.error ? (
        <ErrorState title="대학별 자료를 불러오지 못했어요" error={documents.error} onRetry={documents.retry} />
      ) : !documents.data ? (
        <LoadingRows rows={3} label="대학별 자료를 불러오는 중" />
      ) : (
        <div className={formStyles.form}>
          <div className={formStyles.field}>
            <label htmlFor={ids.search} className={formStyles.label}>
              자료 찾기
            </label>
            <input
              id={ids.search}
              className={formStyles.input}
              value={query}
              placeholder="대학, 학년도, 과목, 핵심 개념"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {items.length === 0 ? (
            <p className={styles.mutedText}>일치하는 자료가 없어요. (문서 목록 검색이며 PDF 본문 검색이 아니에요)</p>
          ) : (
            <ul className={styles.pickerList} aria-label="대학별 PDF 자료">
              {items.map((document) => (
                <li key={document.documentId}>
                  <button type="button" className={styles.pickerOption} aria-pressed={selected?.documentId === document.documentId} onClick={() => choose(document)}>
                    {document.title}
                    <small>
                      {document.university} · {examCategoryLabels[document.category]} · {document.pageCount}쪽
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <>
              {selected.questions.length > 0 && (
                <div className={formStyles.field}>
                  <label htmlFor={ids.question} className={formStyles.label}>
                    문항 (선택)
                  </label>
                  <span className={styles.selectWrap}>
                    <select
                      id={ids.question}
                      className={styles.select}
                      value={questionId}
                      onChange={(event) => {
                        const next = selected.questions.find((item) => item.questionId === event.target.value)
                        setQuestionId(event.target.value)
                        if (next) {
                          setStart(String(next.pageStart))
                          setEnd(next.pageEnd && next.pageEnd !== next.pageStart ? String(next.pageEnd) : '')
                        }
                      }}
                    >
                      <option value="">문항 지정 안 함</option>
                      {selected.questions.map((item) => (
                        <option key={item.questionId} value={item.questionId}>
                          {questionDisplayLabel(item)} ({pageRangeLabel(item.pageStart, item.pageEnd)})
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon size={14} className={styles.selectChevron} />
                  </span>
                </div>
              )}
              <fieldset className={formStyles.field}>
                <legend className={formStyles.label}>참고할 쪽 (PDF 쪽 기준)</legend>
                <div className={styles.rangeRow}>
                  <label htmlFor={ids.start}>시작</label>
                  <input id={ids.start} inputMode="numeric" value={start} onChange={(event) => setStart(event.target.value.replace(/[^\d]/g, ''))} />
                  <label htmlFor={ids.end}>끝 (선택)</label>
                  <input id={ids.end} inputMode="numeric" value={end} onChange={(event) => setEnd(event.target.value.replace(/[^\d]/g, ''))} />
                  <span className={styles.mutedText}>/ {selected.pageCount}쪽</span>
                </div>
                {rangeError && (
                  <p className={formStyles.fieldError} role="alert">
                    {rangeError}
                  </p>
                )}
              </fieldset>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
