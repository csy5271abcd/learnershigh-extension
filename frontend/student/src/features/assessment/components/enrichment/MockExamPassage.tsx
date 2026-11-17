import { useState } from 'react'
import { mockExamPassageSource } from '../../api/mock/mockExamPassages.ts'
import { InfoIcon } from '../AssessmentIcons.tsx'
import styles from './mockExamPassage.module.css'

// 심화 탐구 모의고사 원문 지문 (A26, Student·Admin 공용). 원문은 PDF가 아니라 텍스트 데이터다.
// - 원문 글자·줄바꿈을 그대로 보여 준다(빈 줄 = 문단 간격). 텍스트로만 렌더링해 HTML을 실행하지 않는다.
// - 등록 데이터에는 지문만 있고 발문·선택지는 없다 → 문항 번호와 함께 그 사실을 알린다(문제·보기를 만들어 채우지 않는다).
// - 원문이 없으면 이유(파일 미연결 / 이 자료에 원문 없음)를 구분해 안내한다.
export function MockExamPassage({ passage, examTitle, questionLabel, testId = 'passage-view', collapsible = true }: { passage: string | null | undefined; examTitle: string; questionLabel: string; testId?: string; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible)
  if (!passage) {
    return (
      <div className={styles.empty} data-testid="passage-empty" role="note">
        <InfoIcon size={16} />
        <div>
          <strong>모의고사 원문이 아직 연결되지 않았어요</strong>
          <p>
            {mockExamPassageSource === 'NONE'
              ? '이 실행 환경에 원문 지문 파일이 연결되지 않았어요(배포 권한 확인 전이라 저장소에 없음). 개발 환경은 실행 가이드의 ASSESSMENT_MOCK_EXAM_PASSAGES_FILE 설정을 확인해 주세요.'
              : '이 자료에는 등록된 원문 지문이 없어요.'}{' '}
            기본 정보와 출처({examTitle} {questionLabel})는 확인할 수 있어요.
          </p>
        </div>
      </div>
    )
  }
  const paragraphs = passage.split(/\n\s*\n/).filter((block) => block.trim().length > 0)
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.number}>{questionLabel}</span>
        <span className={styles.meta}>
          {examTitle} · 지문 원문 · {passage.length.toLocaleString()}자
        </span>
      </div>
      <div className={styles.passage} data-expanded={open || undefined} tabIndex={0} aria-label={`${questionLabel} 지문 원문`} data-testid={testId}>
        {paragraphs.map((block, index) => (
          <p key={index}>{block}</p>
        ))}
      </div>
      {collapsible && (
        <button type="button" className={styles.expand} aria-expanded={open} onClick={() => setOpen((value) => !value)} data-testid="passage-expand">
          {open ? '원문 접기' : '원문 전체 펼치기'}
        </button>
      )}
      <p className={styles.note}>
        <InfoIcon size={13} /> 등록된 원문은 이 문항의 지문이에요. 발문·선택지는 원문 데이터에 포함되어 있지 않아요 — 원본 시험지 {questionLabel}에서 확인하세요.
      </p>
    </div>
  )
}
