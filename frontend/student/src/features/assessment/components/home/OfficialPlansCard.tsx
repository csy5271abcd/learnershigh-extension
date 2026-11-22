import { useState } from 'react'
import { Link } from 'react-router'
import { getOfficialPlan } from '../../api/evaluationPlansApi.ts'
import type { StudentOfficialEnsure, StudentOfficialPlan } from '../../api/types.ts'
import { useApiQuery } from '../../model/useApiQuery.ts'
import { restartOfficialEnsure, useOfficialEnsure } from '../../model/useOfficialEnsure.ts'
import { officialEmptyText } from '../../model/officialEmptyText.ts'
import { OfficialDocumentList, OfficialEnsureNotice } from '../official/OfficialDocuments.tsx'
import { evaluationPlansPath } from '../../routes/paths.ts'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './dashboard.module.css'

// A27-UX 학생 Dashboard: 학교 공식 공개 평가계획서 원본 3개년 슬롯.
// - 공식 원본은 관리자 분석 승인과 무관하게 열람하는 자료다(§10-1-3 DRAFT). 관리자가 직접 등록한 문서·분석 결과는 여기 보이지 않는다.
// - 부록 K: 진입만 하면 서버가 학교알리미 원본을 자동 확보한다(버튼 없음). 끝나면 목록을 다시 읽는다. 원본은 열기·내려받기.
// - A28-01: 학적 기록과 학교 공개 자료를 구분한다. 과거 학년도 학적이 없어도 우리 학교(현재 학교)의 공개 원본을 보여 주되
//   '재학 기록 아님'으로 표시한다(basis=SCHOOL_PUBLIC). 학년·학기를 골라 같은 학교의 다른 학년·학기 원본도 본다.
//   학교는 서버가 학생 학교로만 정한다(화면은 학교를 보내지 않는다).
export function OfficialPlansCard({ academicYear, semester }: { academicYear: number; semester: number }) {
  const years = [academicYear, academicYear - 1, academicYear - 2]
  const { ensure, version } = useOfficialEnsure()
  // null = 학생 학적(없으면 현재 학교) 기준 기본 학년. 학기 기본값은 현재 학기
  const [grade, setGrade] = useState<number | null>(null)
  const [term, setTerm] = useState(semester)
  const query = useApiQuery(`home-official|${academicYear}|${term}|${grade ?? 'own'}|${version}`, () =>
    Promise.all(years.map((year) => getOfficialPlan(year, term, grade))),
  )
  const shownGrade = grade ?? query.data?.find((slot) => slot.grade)?.grade ?? null
  return (
    <section className={styles.card} aria-labelledby="home-official" data-testid="home-official-plans">
      <div className={styles.cardHead}>
        <h2 id="home-official">학교 평가계획서 원본 · 3개년</h2>
        <Link to={evaluationPlansPath} className={styles.textLink}>
          확정된 평가 정보 보기
        </Link>
      </div>
      <p className={styles.caption}>학교알리미에 학교가 공식 공개한 원본은 선생님 확인 전에도 볼 수 있어요. 선생님이 정리한 평가 정보는 확정된 것만 보여요.</p>
      <div className={styles.slotFilters} role="group" aria-label="조회 학년·학기">
        <label>
          <span>학년</span>
          <select
            value={shownGrade ?? ''}
            onChange={(event) => setGrade(event.target.value ? Number(event.target.value) : null)}
            disabled={shownGrade === null}
            data-testid="home-official-grade"
          >
            {shownGrade === null && <option value="">-</option>}
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>
                고{value}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>학기</span>
          <select value={term} onChange={(event) => setTerm(Number(event.target.value))} data-testid="home-official-semester">
            <option value={1}>1학기</option>
            <option value={2}>2학기</option>
          </select>
        </label>
        {(grade !== null || term !== semester) && (
          <button
            type="button"
            className={styles.slotReset}
            onClick={() => {
              setGrade(null)
              setTerm(semester)
            }}
            data-testid="home-official-reset"
          >
            내 학년·학기로
          </button>
        )}
      </div>
      <OfficialEnsureNotice ensure={ensure} />
      {ensure?.state === 'FAILED' && (
        <button type="button" className={styles.slotRetry} onClick={() => restartOfficialEnsure()} data-testid="home-official-retry">
          학교알리미 다시 확인
        </button>
      )}
      {query.status === 'error' && query.error ? (
        <ErrorState title="원본 정보를 불러오지 못했어요" error={query.error} onRetry={query.retry} />
      ) : !query.data ? (
        <LoadingRows rows={3} label="원본 정보를 불러오는 중" />
      ) : (
        <ul className={styles.yearSlots}>
          {query.data.map((slot) => (
            <li key={slot.academicYear} className={styles.yearSlot} data-testid="home-official-slot" data-basis={slot.basis ?? 'NONE'}>
              <YearSlot slot={slot} ensure={ensure} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function YearSlot({ slot, ensure }: { slot: StudentOfficialPlan; ensure: StudentOfficialEnsure | null }) {
  const head = (
    <p className={styles.slotYear}>
      {slot.academicYear}학년도{slot.grade ? ` · 고${slot.grade}` : ''} · {slot.semester}학기
    </p>
  )
  // 학적 없음은 '자료 없음'이 아니다 — 학교 공개 원본 열람과 따로 한 줄로 알린다
  const noRecord = !slot.contextFound && (
    <p className={styles.slotNote} data-testid="home-official-no-context">
      해당 학년도 학적 정보 없음
    </p>
  )
  if (!slot.basis && !slot.schoolId) {
    return (
      <>
        {head}
        {noRecord}
        <p className={styles.slotEmpty} data-testid="home-official-empty">
          {officialEmptyText(slot, ensure)}
        </p>
      </>
    )
  }
  return (
    <>
      {head}
      <p className={styles.slotSchool}>{slot.schoolName}</p>
      {slot.basis === 'SCHOOL_PUBLIC' && (
        <p className={styles.slotBadge} data-testid="home-official-public">
          {slot.contextFound ? '같은 학교 다른 학년 공개 원본' : '현재 학교 공개 원본 · 재학 기록 아님'}
        </p>
      )}
      {noRecord}
      {slot.documents.length === 0 ? (
        <p className={styles.slotEmpty} data-testid="home-official-empty">
          {officialEmptyText(slot, ensure)}
        </p>
      ) : (
        <>
          <p className={styles.slotCount} data-testid="home-official-count">
            학교알리미 공식 원본 {slot.documents.length}개
          </p>
          <div className={styles.slotDocScroll}>
            <OfficialDocumentList slot={slot} compact limit={4} />
          </div>
        </>
      )}
    </>
  )
}
