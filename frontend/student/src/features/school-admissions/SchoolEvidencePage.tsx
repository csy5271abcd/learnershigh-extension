import { EvidenceTable } from './components/EvidenceTable.tsx'
import { SchoolLayout, type SchoolSectionId } from './components/SchoolLayout.tsx'
import { useEvidenceManager } from './components/useEvidenceManager.tsx'
import type { SchoolEvidenceService } from './fixtures/schoolEvidence.fixture.ts'
import type { SchoolEvidenceListResult } from './model/types.ts'
import { useSchoolEvidenceList } from './model/useSchoolEvidenceList.ts'
import styles from './SchoolEvidencePage.module.css'

interface SchoolEvidencePageProps {
  loadList: () => Promise<SchoolEvidenceListResult>
  evidenceService: SchoolEvidenceService
  onEvidenceChanged: () => void
  onTaskOpen: (taskId: string) => void
  onSectionSelect: (id: SchoolSectionId) => void
}

const headingId = 'school-evidence-heading'

// School Evidence (Evidence-00 Mockup): 내 수행평가 자료를 Task별로 묶어 보여준다.
// Task 제목 · 자료 수 · 자료 추가 / 파일 · 형식 · 단계 · 날짜 · 상태 · 미리보기 · 삭제.
// Mockup에 검색 / Filter가 없어 두지 않는다. Task Detail 과정 자료 Tab과 같은 Canonical Evidence를 읽는다.
export function SchoolEvidencePage({
  loadList,
  evidenceService,
  onEvidenceChanged,
  onTaskOpen,
  onSectionSelect,
}: SchoolEvidencePageProps) {
  const { state, reload } = useSchoolEvidenceList(loadList)
  const evidence = useEvidenceManager({ service: evidenceService, onChanged: onEvidenceChanged, focusFallbackId: headingId })

  return (
    <SchoolLayout current="evidence" onSectionSelect={onSectionSelect} busy={state.status === 'loading'}>
      <section className={styles.page} aria-labelledby={headingId}>
        <h2 id={headingId} className="lh-visually-hidden" tabIndex={-1}>
          수행평가 자료
        </h2>

        {state.status === 'loading' && (
          <>
            <p className="lh-visually-hidden" role="status">
              자료를 불러오는 중이에요.
            </p>
            <div className={styles.skeleton} aria-hidden="true">
              {Array.from({ length: 2 }, (_, group) => (
                <span key={group} className={styles.skeletonGroup}>
                  <span className={styles.skeletonTitle} />
                  {Array.from({ length: 3 }, (_, row) => (
                    <span key={row} className={styles.skeletonRow} />
                  ))}
                </span>
              ))}
            </div>
          </>
        )}

        {state.status === 'error' && (
          <div className={styles.errorNotice} role="alert">
            <p className={styles.errorTitle}>자료를 불러오지 못했어요.</p>
            <p className={styles.errorDescription}>잠시 후 다시 시도해 주세요.</p>
            <button type="button" className={styles.retryButton} onClick={reload}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'success' &&
          (state.data.groups.length === 0 ? (
            <p className={styles.emptyNotice} role="status">
              아직 모아둔 자료가 없어요. 수행평가의 과정 자료에서 파일을 추가하면 여기에 모여요.
            </p>
          ) : (
            state.data.groups.map(({ task, items }) => {
              const groupHeadingId = `evidence-group-${task.taskId}`
              return (
                <section key={task.taskId} className={styles.group} aria-labelledby={groupHeadingId}>
                  <header className={styles.groupHeader}>
                    <h3 id={groupHeadingId} className={styles.groupTitle}>
                      <button type="button" className={styles.taskLink} onClick={() => onTaskOpen(task.taskId)}>
                        {task.title}
                        <span className="lh-visually-hidden"> 수행평가 보기</span>
                      </button>
                      <span className={styles.groupCount}>{items.length}개</span>
                    </h3>
                    {/* 최종 제출을 마친 수행평가는 자료를 읽기만 한다. */}
                    {task.currentStage !== 8 && (
                      <button
                        type="button"
                        className={styles.addLink}
                        aria-haspopup="dialog"
                        aria-label={`${task.title}에 자료 추가`}
                        onClick={(event) => evidence.openAdd(task, event.currentTarget)}
                      >
                        자료 추가
                      </button>
                    )}
                  </header>
                  <EvidenceTable
                    items={items}
                    onPreview={evidence.openPreview}
                    onDelete={task.currentStage === 8 ? undefined : evidence.openDelete}
                    deleteErrorId={evidence.deleteErrorId}
                  />
                </section>
              )
            })
          ))}
      </section>
      {evidence.dialogs}
    </SchoolLayout>
  )
}
