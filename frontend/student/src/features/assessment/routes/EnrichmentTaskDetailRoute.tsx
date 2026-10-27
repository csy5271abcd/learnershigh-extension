import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import { listNotes } from '../api/assessmentDetailApi.ts'
import { changeEnrichmentTaskStatus, getEnrichmentTask, updateEnrichmentTask } from '../api/enrichmentApi.ts'
import { getSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { EnrichmentTask, EnrichmentTaskStatus } from '../api/types.ts'
import formStyles from '../components/AddSchoolAssessmentModal.module.css'
import {
  AlertIcon,
  BookIcon,
  BulbIcon,
  CalendarIcon,
  ChevronDownIcon,
  LinkIcon,
  PlusIcon,
  SproutIcon,
  StatusIcon,
  ArchiveIcon,
} from '../components/AssessmentIcons.tsx'
import { DetailTopBar, type MoreMenuItem } from '../components/detail/DetailTopBar.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { EnrichmentPanel, type EnrichmentPanelTab } from '../components/enrichment/EnrichmentPanel.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { NoteEditor, NoteSaveStatusLabel, type NoteEditorState } from '../components/notes/NoteEditor.tsx'
import { Modal } from '../components/Modal.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { StatusSelect } from '../components/StatusSelect.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { formatTaskDate } from '../model/enrichmentView.ts'
import { statusLabels, subjectNameOf } from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { enrichmentPath, growthRecordNewPath, myEnrichmentTasksPath, schoolAssessmentDetailPath, tipsSection } from './paths.ts'
import styles from './SchoolAssessmentDetailRoute.module.css'

const enrichmentRoot = {
  label: '심화 탐구',
  path: enrichmentPath,
  subjectPath: (subjectId: string) => `${enrichmentPath}?subject=${encodeURIComponent(subjectId)}`,
  backLabel: '심화 탐구로 돌아가기',
}

// 더보기 (Mockup AE-DETAIL-05). 성장 기록은 이 탐구를 관련 활동으로 채운 작성 화면으로 이동한다.
// 보관함은 원본을 조회하는 Projection이라 "이동"할 대상이 없고, 보관·휴지통 정책도 미정이다 (OD-A11, API-OD-A08).
const enrichmentMenuItems = (taskId: string): MoreMenuItem[] => [
  { label: '성장 기록에 남기기', icon: SproutIcon, to: growthRecordNewPath('ENRICHMENT_TASK', taskId) },
  { label: '보관함으로 이동', icon: ArchiveIcon, reason: '심화 탐구 보관·휴지통 정책이 확정되기 전이라 아직 옮길 수 없어요.' },
]

// 심화 탐구 상세 (screen-map S18, Mockup AE-DETAIL-01~05, inquiry §3·§5, api-contract.md §18·20·21).
// 학교 수행평가 상세와 같은 화면 틀(상단 바·가운데 본문·오른쪽 패널)을 쓰지만 Entity는 EnrichmentTask다.
// 평가 기준·공식 마감·피드백 요청은 학교 과제 전용이라 두지 않는다. Mockup의 "탐구 유형(분야·난이도)"과 "자동 저장됨"은
// 계약에 없거나(MM-26) 노트 저장이 없어(MM-23) 표시하지 않는다.
export function EnrichmentTaskDetailRoute() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { terms, termAssessments, notifyDataChanged } = useAssessmentWorkspace()
  const [taskVersion, setTaskVersion] = useState(0)
  const task = useApiQuery(`ae-task|${taskId}|${taskVersion}`, () => getEnrichmentTask(taskId))
  const [notesVersion, setNotesVersion] = useState(0)
  const notes = useApiQuery(`ae-notes|${taskId}|${notesVersion}`, () => listNotes('ENRICHMENT_TASK', taskId))
  const [editorState, setEditorState] = useState<NoteEditorState>()
  const item = task.data?.taskId === taskId ? task.data : undefined
  const related = useApiQuery(item?.relatedAssessmentId ? `ae-related|${item.relatedAssessmentId}` : 'ae-related|none', () =>
    item?.relatedAssessmentId ? getSchoolAssessment(item.relatedAssessmentId) : Promise.resolve(null),
  )

  const [panelTab, setPanelTab] = useState<EnrichmentPanelTab>('selfCheck')
  const [pendingStatus, setPendingStatus] = useState(false)
  const [linking, setLinking] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = useCallback(
    (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text })),
    [],
  )

  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(myEnrichmentTasksPath))
  const subjects = terms.data?.contexts.flatMap((context) => context.subjects) ?? []
  const subjectName = (subjectId: string) => (terms.status === 'loading' ? '…' : subjectNameOf(subjects, subjectId))
  const note = notes.data?.items[0]

  const frame = (content: ReactNode, panel?: ReactNode) => (
    <main className={styles.page}>
      <DetailTopBar
        title={item?.title}
        subjectId={item?.subjectId}
        subjectName={item ? subjectName(item.subjectId) : ''}
        noteId={editorState?.noteId ?? note?.noteId}
        onBack={goBack}
        onUnavailable={(message) => showToast('info', message)}
        root={enrichmentRoot}
        menuItems={enrichmentMenuItems(taskId)}
        saveStatus={<NoteSaveStatusLabel state={editorState} />}
        currentRevisionId={editorState?.baseRevisionId}
        hasUnsavedChanges={editorState?.unsaved}
      />
      <div className={styles.body}>
        <div className={styles.main}>
          <article className={styles.column}>{content}</article>
        </div>
        <div className={styles.panelArea}>{panel}</div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )

  if (task.status === 'error' && task.error) {
    return frame(
      task.error.code === 'ENRICHMENT_TASK_NOT_FOUND' ? (
        <EmptyState
          title="심화 탐구를 찾을 수 없어요"
          description="삭제되었거나 접근할 수 없는 탐구예요."
          action={<Link to={myEnrichmentTasksPath}>내 탐구로 가기</Link>}
        />
      ) : (
        <ErrorState title="심화 탐구를 불러오지 못했어요" error={task.error} onRetry={task.retry} />
      ),
    )
  }
  if (!item) return frame(<LoadingRows rows={3} label="심화 탐구를 불러오는 중" />)

  const onStatusChange = async (next: EnrichmentTaskStatus) => {
    if (next === item.status || pendingStatus) return
    setPendingStatus(true)
    try {
      await changeEnrichmentTaskStatus(item.taskId, next)
      showToast('success', `상태를 ${statusLabels[next]}(으)로 바꿨어요.`)
      setTaskVersion((value) => value + 1)
      notifyDataChanged()
    } catch (error) {
      const apiError = toApiError(error)
      showToast('error', `상태를 바꾸지 못했어요. ${apiError.message} (${apiError.code})`)
    } finally {
      setPendingStatus(false)
    }
  }

  return (
    <>
      {frame(
        <>
          <p className={styles.eyebrow}>
            <BulbIcon size={14} />
            자율 심화 탐구
          </p>
          <h1 className={styles.title}>{item.title}</h1>
          <div className={styles.chipRow}>
            <Link to={tipsSection.path} className={styles.chipButton}>
              <BulbIcon size={14} />
              수행평가 꿀팁
            </Link>
          </div>

          <dl className={styles.props}>
            <div className={styles.propRow}>
              <dt>
                <StatusIcon size={15} />
                진행 상태
              </dt>
              <dd>
                <span className={styles.statusValue}>
                  <StatusSelect status={item.status} assessmentTitle={item.title} pending={pendingStatus} onChange={onStatusChange} />
                  <span className={styles.hint}>내가 관리하는 상태예요. 되돌리기는 정책 확정 전이라 아직 안 돼요.</span>
                </span>
              </dd>
            </div>
            <div className={styles.propRow}>
              <dt>
                <BookIcon size={15} />
                관련 과목
              </dt>
              <dd>{subjectName(item.subjectId)}</dd>
            </div>
            <div className={styles.propRow}>
              <dt>
                <BulbIcon size={15} />
                탐구 목표
              </dt>
              <dd>{item.goal ?? <span className={styles.unknown}>아직 적지 않았어요</span>}</dd>
            </div>
            <div className={styles.propRow}>
              <dt>
                <LinkIcon size={15} />
                연결된 수행평가
              </dt>
              <dd>
                {item.relatedAssessmentId ? (
                  <>
                    {related.data ? (
                      <Link to={schoolAssessmentDetailPath(related.data.assessmentId)} className={enrichmentStyles.textLink}>
                        {related.data.title}
                      </Link>
                    ) : related.status === 'error' ? (
                      <span className={styles.unknown}>연결된 수행평가를 불러오지 못했어요</span>
                    ) : (
                      <span className={styles.unknown}>불러오는 중…</span>
                    )}
                    <button type="button" className={enrichmentStyles.textLink} onClick={() => setLinking(true)}>
                      변경
                    </button>
                  </>
                ) : (
                  <button type="button" className={enrichmentStyles.textLink} onClick={() => setLinking(true)}>
                    <PlusIcon size={13} /> 학교 수행평가와 연결하기
                  </button>
                )}
              </dd>
            </div>
            <div className={styles.propRow}>
              <dt>
                <CalendarIcon size={15} />
                시작한 날
              </dt>
              <dd>{formatTaskDate(item.createdAt)}</dd>
            </div>
          </dl>

          <NoteEditor
            key={item.taskId}
            sourceType="ENRICHMENT_TASK"
            sourceId={item.taskId}
            notes={notes}
            onSaved={() => setNotesVersion((value) => value + 1)}
            onStateChange={setEditorState}
          />
          <MockDataNotice />
        </>,
        <EnrichmentPanel task={item} hasNote={note !== undefined} activeTab={panelTab} onTabChange={setPanelTab} />,
      )}

      {linking && (
        <LinkAssessmentModal
          task={item}
          options={termAssessments.data?.items ?? []}
          onClose={() => setLinking(false)}
          onSaved={() => {
            setLinking(false)
            setTaskVersion((value) => value + 1)
            notifyDataChanged()
            showToast('success', '연결한 수행평가를 저장했어요.')
          }}
        />
      )}
    </>
  )
}

interface LinkAssessmentModalProps {
  task: EnrichmentTask
  options: { assessmentId: string; title: string }[]
  onClose: () => void
  onSaved: () => void
}

// 학교 수행평가와 연결 (§18 PATCH relatedAssessmentId). 연결은 탐구 쪽 참조만 바꾸고 학교 과제 정보는 바꾸지 않는다.
function LinkAssessmentModal({ task, options, onClose, onSaved }: LinkAssessmentModalProps) {
  const [value, setValue] = useState(task.relatedAssessmentId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const savingRef = useRef(false)
  const selectRef = useRef<HTMLSelectElement>(null)

  const save = async () => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError(undefined)
    try {
      await updateEnrichmentTask(task.taskId, { relatedAssessmentId: value || null })
      onSaved()
    } catch (caught) {
      const apiError = toApiError(caught)
      setError(`${apiError.message} 다시 시도해 주세요. (${apiError.code})`)
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <Modal
      title="학교 수행평가와 연결"
      description="연결해도 학교 수행평가의 정보는 바뀌지 않아요."
      compact
      onRequestClose={() => !saving && onClose()}
      initialFocusRef={selectRef}
      footer={
        <>
          <button type="button" className={formStyles.ghostButton} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button
            type="button"
            className={formStyles.primaryButton}
            disabled={saving || value === (task.relatedAssessmentId ?? '')}
            aria-busy={saving}
            onClick={save}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </>
      }
    >
      <div className={formStyles.form}>
        {error && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {error}
          </p>
        )}
        <div className={formStyles.field}>
          <label htmlFor="link-assessment" className={formStyles.label}>
            연결할 학교 수행평가
          </label>
          <span className={enrichmentStyles.selectWrap}>
            <select
              ref={selectRef}
              id="link-assessment"
              className={enrichmentStyles.select}
              value={value}
              disabled={saving}
              onChange={(event) => setValue(event.target.value)}
            >
              <option value="">연결 안 함</option>
              {options.map((option) => (
                <option key={option.assessmentId} value={option.assessmentId}>
                  {option.title}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={16} className={enrichmentStyles.selectChevron} />
          </span>
          <p className={formStyles.hint}>선택한 학기의 수행평가만 보여요. 연결은 언제든 바꿀 수 있어요.</p>
        </div>
      </div>
    </Modal>
  )
}
