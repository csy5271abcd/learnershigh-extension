import type { ReactNode } from 'react'
import { MentorPhoto } from './MentorPhoto.tsx'
import type { MentorContentType } from '../../fixtures/types.ts'
import { findMentorProfile, mentorAffiliation, mentorContentTypeLabel, planSubjects, type MentorContentItem } from '../../read-model/mentorContent.ts'
import styles from './MentorContent.module.css'

/*
 * Mentor Content Card — 유형마다 다른 정보 구조 (같은 Card Template을 쓰지 않는다)
 *   Case: 활동 · 과정 / Plan: 기간 · 과목 · 목표 / Routine: Timeline · 습관 / Story: 주제 · 발췌 / Record: 영역 · 검수 상태
 * 공통: Mentor 사진 · 이름 · 대학 학과 (MentorProfile · Student와 같은 사진 Mapping)
 * 유형은 글자 Label로 구분한다. (Icon 없음)
 */

export function MentorCue({ mentorId, onOpenMentor, compact = false }: { mentorId: string; onOpenMentor?: (mentorId: string) => void; compact?: boolean }) {
  const profile = findMentorProfile(mentorId)
  if (!profile) return <span className={styles.mentorCue}>Mentor 정보 없음</span>
  return (
    <span className={styles.mentorCue}>
      <MentorPhoto mentorId={mentorId} name={profile.name} />
      <span className={styles.mentorCueText}>
        {onOpenMentor ? (
          <button type="button" className={styles.mentorLink} onClick={() => onOpenMentor(mentorId)}>
            {profile.name}
            <span className="lh-visually-hidden"> Mentor Profile 보기</span>
          </button>
        ) : (
          <span className={styles.mentorName}>{profile.name}</span>
        )}
        {!compact && <span className={styles.mentorMeta}>{mentorAffiliation(profile)}</span>}
      </span>
    </span>
  )
}

function TypeEyebrow({ type, children }: { type: MentorContentType; children?: ReactNode }) {
  return (
    <span className={styles.typeEyebrow} data-type={type}>
      {mentorContentTypeLabel[type]}
      {children && (
        <>
          <span aria-hidden="true">·</span>
          <span className={styles.typeEyebrowSub}>{children}</span>
        </>
      )}
    </span>
  )
}

function CardBody({ item }: { item: MentorContentItem }) {
  switch (item.type) {
    case 'case': {
      const stages = item.detail?.stages ?? []
      return (
        <>
          <TypeEyebrow type="case">
            {item.ref.subject} · {item.ref.activityType}
          </TypeEyebrow>
          <span className={styles.cardTitle}>{item.title}</span>
          {/* 과정 중심: 단계 흐름 (한 줄 글자) */}
          <span className={styles.stageFlow}>
            <span className="lh-visually-hidden">활동 과정 {stages.length}단계: </span>
            {stages
              .slice(0, 4)
              .map((stage) => stage.title)
              .join(' → ')}
            {stages.length > 4 && <span className={styles.stageMore}> +{stages.length - 4}단계</span>}
          </span>
          <span className={styles.cardMeta}>
            활동 당시 {item.ref.gradeLabel} · 과정 자료 {item.detail?.materials.length ?? 0}개
          </span>
        </>
      )
    }
    case 'plan': {
      const subjects = planSubjects(item.detail)
      return (
        <>
          <TypeEyebrow type="plan" />
          <span className={styles.cardTitle}>{item.title}</span>
          {/* 기간 중심: 큰 기간 + 과목 */}
          <span className={styles.planFacts}>
            <strong>{item.detail.durationWeeks}주</strong>
            <span>주 {item.detail.daysPerWeek}일</span>
          </span>
          <span className={styles.subjectList}>
            {subjects.map((subject) => (
              <span key={subject}>{subject}</span>
            ))}
          </span>
          <span className={styles.cardSummary}>{item.summary}</span>
        </>
      )
    }
    case 'routine':
      return (
        <>
          <TypeEyebrow type="routine">{item.detail.timelineTitle}</TypeEyebrow>
          <span className={styles.cardTitle}>{item.title}</span>
          {/* Timeline 중심: 시간 블록 */}
          <ol className={styles.miniTimeline} aria-label="Timeline 일부">
            {item.detail.timeline.slice(0, 3).map((block) => (
              <li key={block.blockId}>
                <span className={styles.timeText}>{block.slot.start}</span>
                <span>{block.title}</span>
              </li>
            ))}
            {item.detail.timeline.length > 3 && <li className={styles.stageMore}>외 {item.detail.timeline.length - 3}개 블록</li>}
          </ol>
          <span className={styles.cardMeta}>
            습관 {item.detail.habits.length}개 · {item.detail.applyDays.join('')}
          </span>
        </>
      )
    case 'story': {
      const excerpt = item.detail.body.find((block) => block.type === 'paragraph')
      return (
        <>
          <TypeEyebrow type="story">{item.detail.topics.join(' · ')}</TypeEyebrow>
          <span className={styles.cardTitle}>{item.title}</span>
          {/* 발췌 중심 */}
          {excerpt && excerpt.type === 'paragraph' && <span className={styles.excerpt}>“{excerpt.text}”</span>}
          <span className={styles.cardMeta}>
            {item.detail.readMinutes}분 읽기 · {item.detail.publishedDate.replaceAll('-', '.')}
          </span>
        </>
      )
    }
    case 'record':
      return (
        <>
          <TypeEyebrow type="record">
            고{item.detail.grade}
            {item.detail.semester ? ` ${item.detail.semester}학기` : ''} · {item.detail.areaLabel}
          </TypeEyebrow>
          <span className={styles.cardTitle}>{item.title}</span>
          <span className={styles.cardSummary}>{item.summary}</span>
          {/* 검수 상태 중심 */}
          <span className={styles.reviewedLine}>개인정보 제거 · 검수 완료</span>
        </>
      )
  }
}

export function MentorContentCard({ item, onOpen, onOpenMentor }: { item: MentorContentItem; onOpen: (item: MentorContentItem) => void; onOpenMentor?: (mentorId: string) => void }) {
  return (
    <li className={styles.card} data-type={item.type}>
      <button type="button" className={styles.cardMain} onClick={() => onOpen(item)}>
        <CardBody item={item} />
        <span className="lh-visually-hidden"> {mentorContentTypeLabel[item.type]} 상세 보기</span>
      </button>
      <div className={styles.cardFoot}>
        <MentorCue mentorId={item.mentorId} onOpenMentor={onOpenMentor} />
      </div>
    </li>
  )
}

export function MentorContentGrid({ items, label, onOpen, onOpenMentor }: { items: MentorContentItem[]; label: string; onOpen: (item: MentorContentItem) => void; /** 없으면 Mentor 이름은 글자만 (Profile 안) */ onOpenMentor?: (mentorId: string) => void }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {items.map((item) => (
        <MentorContentCard key={item.contentId} item={item} onOpen={onOpen} onOpenMentor={onOpenMentor} />
      ))}
    </ul>
  )
}
