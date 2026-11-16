import { useId, useRef, useState } from 'react'
import type { SubjectRef } from '../../api/types.ts'
import { ChevronDownIcon, SparkleIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './detail.module.css'

interface TopicSuggestionModalProps {
  subjects: SubjectRef[]
  initialSubjectId: string
  onClose: () => void
}

// 주제명 추천받기 (Mockup SA-DETAIL-02, assessment-student.md §9 ST-06, api-contract.md §14 요청 필드).
// 입력 칸은 §14 요청 필드(subjectId·curriculumConcept·currentTopic·purpose·interest)만 둔다.
// Mockup의 "희망 진로"·"추천 유형"은 §14에 필드가 없어 제외한다 (MM-22). AI 호출은 Stage 3 범위라 보내지 않는다.
export function TopicSuggestionModal({ subjects, initialSubjectId, onClose }: TopicSuggestionModalProps) {
  const ids = { subject: useId(), concept: useId(), topic: useId(), purpose: useId(), interest: useId() }
  const conceptRef = useRef<HTMLInputElement>(null)
  const [subjectId, setSubjectId] = useState(initialSubjectId)
  const [concept, setConcept] = useState('')
  const [topic, setTopic] = useState('')
  const [purpose, setPurpose] = useState('')
  const [interest, setInterest] = useState('')

  return (
    <Modal
      title="주제명 추천받기"
      onRequestClose={onClose}
      initialFocusRef={conceptRef}
      footer={
        <div className={styles.footerButtons}>
          <span id={`${ids.concept}-reason`} className={styles.disabledReason}>
            AI 기능 연결 후 추천받을 수 있어요
          </span>
          <button type="button" className={formStyles.ghostButton} onClick={onClose}>
            취소
          </button>
          <button type="button" className={`${formStyles.primaryButton} ${styles.iconTextButton}`} disabled aria-describedby={`${ids.concept}-reason`}>
            <SparkleIcon size={15} />
            주제명 추천받기
          </button>
        </div>
      }
    >
      <p className={styles.modalLead}>
        교과 개념을 중심으로 무엇을 탐구하는지 드러나는 제목을 제안해요. 학교 과제명은 직접 적용하기 전까지 바뀌지 않아요.
      </p>
      <div className={styles.formGrid}>
        <div className={formStyles.field}>
          <label htmlFor={ids.subject} className={formStyles.label}>
            과목
          </label>
          <span className={styles.selectWrap}>
            <select
              id={ids.subject}
              className={`${formStyles.input} ${styles.select}`}
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.subjectId} value={subject.subjectId}>
                  {subject.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={15} className={styles.selectChevron} />
          </span>
        </div>
        <div className={formStyles.field}>
          <label htmlFor={ids.concept} className={formStyles.label}>
            관련 교과 개념 <span className={formStyles.required} aria-hidden="true">*</span>
            <span className="lh-visually-hidden">(필수)</span>
          </label>
          <input
            ref={conceptRef}
            id={ids.concept}
            className={formStyles.input}
            value={concept}
            placeholder="예: 매체의 관점과 신뢰성"
            onChange={(event) => setConcept(event.target.value)}
          />
        </div>
      </div>
      <div className={formStyles.field}>
        <label htmlFor={ids.topic} className={formStyles.label}>
          탐구하려는 현상·문제 <span className={styles.optional}>선택</span>
        </label>
        <input
          id={ids.topic}
          className={formStyles.input}
          value={topic}
          placeholder="예: 실험 결과가 예상과 달랐던 이유"
          onChange={(event) => setTopic(event.target.value)}
        />
      </div>
      <div className={styles.formGrid}>
        <div className={formStyles.field}>
          <label htmlFor={ids.purpose} className={formStyles.label}>
            목적·방법 <span className={styles.optional}>선택</span>
          </label>
          <input
            id={ids.purpose}
            className={formStyles.input}
            value={purpose}
            placeholder="예: 관찰 후 발표"
            onChange={(event) => setPurpose(event.target.value)}
          />
        </div>
        <div className={formStyles.field}>
          <label htmlFor={ids.interest} className={formStyles.label}>
            관심 분야 <span className={styles.optional}>선택</span>
          </label>
          <input
            id={ids.interest}
            className={formStyles.input}
            value={interest}
            placeholder="예: 환경, 도시·교통"
            onChange={(event) => setInterest(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
