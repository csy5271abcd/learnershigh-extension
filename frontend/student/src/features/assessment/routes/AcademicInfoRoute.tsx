import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { updateAcademicContext } from '../api/academicContextApi.ts'
import { toApiError, type ApiError } from '../api/apiError.ts'
import { listSchoolAssessments } from '../api/schoolAssessmentApi.ts'
import type { AcademicContext } from '../api/types.ts'
import { AlertIcon, CapIcon, RefreshIcon } from '../components/AssessmentIcons.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { isSameTerm, termKey, termLabel } from '../model/academicTerm.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { countBySubject } from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import styles from './AcademicInfoRoute.module.css'
import { schoolAssessmentsPath } from './paths.ts'

const sourceLabels: Record<string, string> = {
  EXISTING_LEARNERSHIGH: 'LearnersHigh 프로필과 연결됨',
}

// 학교·학업 정보 (ST-01, screen-map S2, api-contract.md §9).
// 학교·학년도·학년은 기존 LearnersHigh가 원천일 수 있어(OD-A04) 읽기 전용으로 두고, 수강 과목 선택만 §9-2로 저장한다.
export function AcademicInfoRoute() {
  const { terms, selectTerm, dataVersion, notifyDataChanged, requestAddSubject } = useAssessmentWorkspace()
  const navigate = useNavigate()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text }))

  const termCounts = useApiQuery(`academic-term-counts|${terms.data ? terms.data.contexts.map(termKey).join(',') : ''}|${dataVersion}`, () =>
    terms.data
      ? Promise.all(
          terms.data.contexts.map((context) =>
            listSchoolAssessments({ academicYear: context.academicYear, semester: context.semester, page: 0, size: 100 }),
          ),
        )
      : new Promise<never>(() => {}),
  )

  if (terms.status === 'error' && terms.error) {
    return (
      <main className={styles.page}>
        <PageHeader />
        <ErrorState title="학업 정보를 불러오지 못했어요" error={terms.error} onRetry={terms.retry} />
      </main>
    )
  }
  if (!terms.data) {
    return (
      <main className={styles.page}>
        <PageHeader />
        <LoadingRows rows={3} label="학업 정보를 불러오는 중" />
      </main>
    )
  }

  const { currentTerm, contexts, failedTerms } = terms.data
  const current = contexts.find((context) => isSameTerm(context, currentTerm))
  const previous = contexts.filter((context) => !isSameTerm(context, currentTerm))
  const responseOf = (context: AcademicContext) => termCounts.data?.[contexts.indexOf(context)]

  return (
    <main className={styles.page}>
      <PageHeader />

      {current && (
        <CurrentTermCard
          key={`${termKey(current)}|${dataVersion}`}
          context={current}
          subjectCounts={(() => {
            const response = responseOf(current)
            return response ? countBySubject(response.items) : undefined
          })()}
          onSaved={() => {
            notifyDataChanged()
            showToast('success', '수강 과목을 저장했어요.')
          }}
          onUnavailable={(text) => showToast('info', text)}
          onAddSubject={() => requestAddSubject(current)}
        />
      )}

      <section className={styles.history} aria-labelledby="academic-history">
        <h2 id="academic-history" className={styles.sectionTitle}>
          이전 기록
        </h2>
        {previous.length === 0 && failedTerms.length === 0 ? (
          <p className={styles.muted}>이전 학기 기록이 없어요.</p>
        ) : (
          <ul className={styles.historyList}>
            {previous.map((context) => {
              const response = responseOf(context)
              return (
                <li key={termKey(context)} className={styles.historyItem}>
                  <CapIcon className={styles.historyIcon} size={18} />
                  <div className={styles.historyText}>
                    <p className={styles.historyTitle}>
                      {termLabel(context)} · {context.school.name}
                    </p>
                    <p className={styles.historyMeta}>
                      {context.subjects.map((subject) => subject.name).join(' · ')}
                      {termCounts.status === 'error'
                        ? ' · 수행평가 수를 불러오지 못했어요'
                        : response
                          ? ` · 수행평가 ${response.page.totalElements}개 보관`
                          : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => {
                      selectTerm({ academicYear: context.academicYear, semester: context.semester })
                      navigate(schoolAssessmentsPath)
                    }}
                  >
                    기록 보기
                  </button>
                </li>
              )
            })}
            {failedTerms.map((term) => (
              <li key={termKey(term)} className={styles.historyItem}>
                <AlertIcon className={styles.historyIcon} size={18} />
                <p className={styles.historyMeta}>
                  {term.academicYear}학년도 {term.semester}학기 정보를 불러오지 못했어요.
                </p>
                <button type="button" className={styles.smallButton} onClick={terms.retry}>
                  <RefreshIcon size={14} />
                  다시 시도
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )
}

function PageHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>학교·학업 정보</h1>
      <p className={styles.subtitle}>학교나 학년이 바뀌어도 이전 기록은 그대로 남아요.</p>
      <MockDataNotice />
    </header>
  )
}

interface CurrentTermCardProps {
  context: AcademicContext
  subjectCounts: Map<string, number> | undefined
  onSaved: () => void
  onUnavailable: (text: string) => void
  /** 과목 추가 Modal (Layout이 그린다, Sidebar "+"와 같은 Modal) */
  onAddSubject: () => void
}

function CurrentTermCard({ context, subjectCounts, onSaved, onUnavailable, onAddSubject }: CurrentTermCardProps) {
  const [editing, setEditing] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => context.subjects.map((subject) => subject.subjectId))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<ApiError>()

  const dirty =
    selectedIds.length !== context.subjects.length ||
    context.subjects.some((subject) => !selectedIds.includes(subject.subjectId))
  const removed = context.subjects.filter((subject) => !selectedIds.includes(subject.subjectId))
  const removedAssessmentCount = removed.reduce((sum, subject) => sum + (subjectCounts?.get(subject.subjectId) ?? 0), 0)

  const cancel = () => {
    setEditing(false)
    setSelectedIds(context.subjects.map((subject) => subject.subjectId))
    setSaveError(undefined)
  }

  const save = async () => {
    if (saving || !dirty) return
    setSaving(true)
    setSaveError(undefined)
    try {
      await updateAcademicContext({
        schoolId: context.school.schoolId,
        academicYear: context.academicYear,
        grade: context.grade,
        semester: context.semester,
        subjectIds: selectedIds,
      })
      onSaved()
    } catch (error) {
      setSaveError(toApiError(error))
      setSaving(false)
    }
  }

  return (
    <section className={styles.card} aria-labelledby="current-term">
      <div className={styles.cardHeader}>
        <h2 id="current-term" className={styles.sectionTitle}>
          현재 학기
        </h2>
        <span className={styles.source}>
          <RefreshIcon size={13} />
          {sourceLabels[context.source] ?? `출처: ${context.source}`}
        </span>
      </div>

      <dl className={styles.fields}>
        <div>
          <dt>학교</dt>
          <dd>{context.school.name}</dd>
        </div>
        <div>
          <dt>학년도</dt>
          <dd>{context.academicYear}학년도</dd>
        </div>
        <div>
          <dt>학년 · 학기</dt>
          <dd>
            {context.grade}학년 {context.semester}학기
          </dd>
        </div>
      </dl>

      <fieldset className={styles.subjects} disabled={saving}>
        <legend className={styles.fieldLabel}>수강 과목</legend>
        {context.subjects.length === 0 && <p className={styles.muted}>등록된 과목이 없어요.</p>}
        <div className={styles.chips}>
          {context.subjects.map((subject) =>
            editing ? (
              <label key={subject.subjectId} className={styles.chipToggle}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(subject.subjectId)}
                  onChange={(event) =>
                    setSelectedIds((ids) =>
                      event.target.checked ? [...ids, subject.subjectId] : ids.filter((id) => id !== subject.subjectId),
                    )
                  }
                />
                <span>
                  {subject.name}
                  {subject.addedByStudent && <small className={styles.addedTag}> · 직접 추가</small>}
                </span>
              </label>
            ) : (
              <span key={subject.subjectId} className={styles.chip}>
                {subject.name}
                {/* 학생이 이름을 직접 입력한 과목은 학교 개설 과목과 구분한다 (P-26) */}
                {subject.addedByStudent && <small className={styles.addedTag}>직접 추가</small>}
              </span>
            ),
          )}
          {!editing && (
            <button type="button" className={styles.chipAdd} onClick={onAddSubject}>
              + 과목 추가
            </button>
          )}
        </div>
      </fieldset>

      {editing && (
        <div className={styles.editNotes}>
          <p className={styles.muted}>학교·학년도·학년은 LearnersHigh 프로필에서 관리돼요. 여기서는 수강 과목만 바꿀 수 있어요.</p>
          {removed.length > 0 && (
            <p className={styles.warning}>
              선택을 해제한 과목({removed.map((subject) => subject.name).join(', ')})의 수행평가
              {subjectCounts ? ` ${removedAssessmentCount}개` : ''}는 지워지지 않고 그대로 남아요.
            </p>
          )}
          {saveError && (
            <p className={styles.error} role="alert">
              <AlertIcon size={16} />
              {saveError.message} ({saveError.code})
            </p>
          )}
        </div>
      )}

      <div className={styles.cardActions}>
        {editing ? (
          <>
            <button type="button" className={styles.ghostButton} onClick={cancel} disabled={saving}>
              취소
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={save}
              disabled={!dirty || saving}
              aria-busy={saving}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.softButton} onClick={() => setEditing(true)}>
              정보 수정
            </button>
            <button
              type="button"
              className={styles.ghostButton}
              aria-disabled="true"
              onClick={() => onUnavailable('전학·진급 처리는 학적 정보 연동 정책이 확정된 뒤 제공돼요.')}
            >
              전학·진급 처리
            </button>
          </>
        )}
      </div>
    </section>
  )
}
