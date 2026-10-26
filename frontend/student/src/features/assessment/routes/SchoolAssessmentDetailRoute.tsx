import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import {
  getFeedbackReply,
  listArtifacts,
  listArtifactVersions,
  listFeedbackRequests,
  listNoteRevisions,
  listNotes,
} from '../api/assessmentDetailApi.ts'
import { assessmentToday } from '../api/runtimeInfo.ts'
import { changeSchoolAssessmentStatus, getSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { Artifact, ArtifactVersion, AssessmentNote, FeedbackRequest, SchoolAssessmentStatus } from '../api/types.ts'
import {
  BookIcon,
  BulbIcon,
  CalendarIcon,
  ClipboardIcon,
  LinkIcon,
  PencilIcon,
  SlidersIcon,
  SourceIcon,
  SparkleIcon,
  StatusIcon,
} from '../components/AssessmentIcons.tsx'
import { ArtifactSection, type ArtifactWithVersions } from '../components/detail/ArtifactSection.tsx'
import { DetailPanel, type DetailPanelTab } from '../components/detail/DetailPanel.tsx'
import { DetailTopBar } from '../components/detail/DetailTopBar.tsx'
import { schoolAssessmentMenuItems } from '../components/detail/detailMenuItems.ts'
import { FeedbackSentModal } from '../components/detail/FeedbackSentModal.tsx'
import { FeedbackTab, type FeedbackHistory, type SelectedArtifactVersion } from '../components/detail/FeedbackTab.tsx'
import { TopicSuggestionModal } from '../components/detail/TopicSuggestionModal.tsx'
import { UploadArtifactModal } from '../components/detail/UploadArtifactModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { NoteEditor, NoteSaveStatusLabel, type NoteEditorState } from '../components/notes/NoteEditor.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { StatusSelect } from '../components/StatusSelect.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { latestVersion } from '../model/assessmentDetailView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import {
  daysUntil,
  formatDateWithWeekday,
  formatDday,
  sourceLabel,
  statusLabels,
  subjectNameOf,
  urgentDays,
} from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { pendingAssessmentSections, schoolAssessmentsPath } from './paths.ts'
import styles from './SchoolAssessmentDetailRoute.module.css'

type ModalState =
  | { kind: 'upload'; target?: { artifact: Artifact; latest: ArtifactVersion | undefined } }
  | { kind: 'topic' }
  | { kind: 'sent'; request: FeedbackRequest }

async function loadArtifacts(assessmentId: string): Promise<ArtifactWithVersions[]> {
  const { items } = await listArtifacts('SCHOOL_ASSESSMENT', assessmentId)
  return Promise.all(
    items.map(async (artifact) => ({ artifact, versions: (await listArtifactVersions(artifact.artifactId)).items })),
  )
}

// 과제별 피드백 목록 Query가 계약에 없어(§31 목록에 source 필터 없음, MM-19) 이 과제 노트의 Revision을 가리키는
// 요청만 골라낸다. 답변 완료 요청은 §32로 답변을 함께 불러온다.
async function loadFeedbackHistory(note: AssessmentNote | undefined): Promise<FeedbackHistory> {
  if (!note) return { items: [], revisionNumbers: {} }
  const revisions = (await listNoteRevisions(note.noteId)).items
  const revisionNumbers = Object.fromEntries(revisions.map((revision) => [revision.revisionId, revision.revisionNumber]))
  const page = await listFeedbackRequests({ page: 0, size: 100 })
  const mine = page.items.filter((request) => request.snapshot.noteRevisionId in revisionNumbers)
  const items = await Promise.all(
    mine.map(async (request) => ({
      request,
      reply: request.status === 'DELIVERED' ? await getFeedbackReply(request.requestId) : null,
    })),
  )
  return { items, revisionNumbers }
}

// 수행평가 상세 (screen-map S7·S8·S10~S13, Mockup SA-DETAIL-01~14·SN-DETAIL-01·SN-TEMPLATE-01).
// 상단 바 + 가운데 본문(기본 정보·결과물·탐구 노트) + 오른쪽 패널(평가 기준·AI 도우미·피드백·자료).
// Mockup의 계약 밖 속성(평가 유형·평가일·반영비율·담당 선생님·연결된 심화 탐구)과 안내문·첨부는 MM-03 결정 전 표시하지 않는다.
export function SchoolAssessmentDetailRoute() {
  const { assessmentId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { terms, dataVersion, notifyDataChanged } = useAssessmentWorkspace()
  const [detailVersion, setDetailVersion] = useState(0)
  const refreshDetail = useCallback(() => setDetailVersion((value) => value + 1), [])

  const detail = useApiQuery(`sa-detail|${assessmentId}|${dataVersion}`, () => getSchoolAssessment(assessmentId))
  const notes = useApiQuery(`sa-notes|${assessmentId}|${detailVersion}`, () => listNotes('SCHOOL_ASSESSMENT', assessmentId))
  const artifacts = useApiQuery(`sa-artifacts|${assessmentId}|${detailVersion}`, () => loadArtifacts(assessmentId))
  const note = notes.data?.items[0]
  const history = useApiQuery(
    notes.data ? `sa-feedback|${assessmentId}|${note?.noteId ?? 'none'}|${detailVersion}` : 'sa-feedback|pending',
    () => (notes.data ? loadFeedbackHistory(note) : new Promise<FeedbackHistory>(() => {})),
  )

  const [pending, setPending] = useState(false)
  // 선생님 피드백 목록에서 과제로 돌아오면(`?panel=feedback`) 피드백 탭을 연다.
  const [searchParams] = useSearchParams()
  const [panelTab, setPanelTab] = useState<DetailPanelTab>(() =>
    searchParams.get('panel') === 'feedback' ? 'feedback' : 'criteria',
  )
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({})
  const [modal, setModal] = useState<ModalState>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = useCallback(
    (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text })),
    [],
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const [editorState, setEditorState] = useState<NoteEditorState>()
  // 피드백 Snapshot은 서버에 저장된 Revision만 가리켜야 한다. 편집기에 저장 안 된 변경이 있거나
  // 저장 직후 목록이 아직 최신 Revision을 받지 못했으면 요청을 막는다 (feedback §4, testing §9).
  const noteBlockedReason = editorState?.unsaved
    ? '노트에 저장되지 않은 변경이 있어요. 저장된 뒤 요청할 수 있어요.'
    : editorState?.baseRevisionId && editorState.baseRevisionId !== note?.revisionId
      ? '노트 저장 상태를 확인하는 중이에요.'
      : undefined

  // 목록에서 들어왔으면 History로 돌아가 URL의 검색·필터와 Scroll을 그대로 복원한다.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(schoolAssessmentsPath))

  // §12 상세 응답에 학기가 없어 과목명은 불러온 학기들의 과목 목록에서 찾는다.
  const subjects = terms.data?.contexts.flatMap((context) => context.subjects) ?? []
  const subjectName = (subjectId: string) => (terms.status === 'loading' ? '…' : subjectNameOf(subjects, subjectId))
  const item = detail.data

  // 결과물마다 피드백에 보낼 버전 (UI 선택 상태, 기본은 최신)
  const selections = useMemo<SelectedArtifactVersion[]>(
    () =>
      (artifacts.data ?? []).flatMap(({ artifact, versions }) => {
        const version = versions.find((entry) => entry.versionId === selectedVersions[artifact.artifactId]) ?? latestVersion(versions)
        return version ? [{ artifact, version }] : []
      }),
    [artifacts.data, selectedVersions],
  )
  const versionsById = useMemo(
    () =>
      Object.fromEntries(
        (artifacts.data ?? []).flatMap(({ artifact, versions }) =>
          versions.map((version) => [version.versionId, { artifact, version }] as const),
        ),
      ),
    [artifacts.data],
  )

  const openFeedback = () => {
    setPanelTab('feedback')
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const topBar = (
    <DetailTopBar
      title={item?.title}
      subjectId={item?.subjectId}
      subjectName={item ? subjectName(item.subjectId) : ''}
      noteId={editorState?.noteId ?? note?.noteId}
      onBack={goBack}
      onRequestFeedback={openFeedback}
      onUnavailable={(message) => showToast('info', message)}
      menuItems={schoolAssessmentMenuItems(assessmentId)}
      saveStatus={<NoteSaveStatusLabel state={editorState} />}
      currentRevisionId={editorState?.baseRevisionId}
      hasUnsavedChanges={editorState?.unsaved}
    />
  )

  const frame = (content: ReactNode, panel?: ReactNode) => (
    <main className={styles.page}>
      {topBar}
      <div className={styles.body}>
        <div className={styles.main}>
          <article className={styles.column}>{content}</article>
        </div>
        <div ref={panelRef} className={styles.panelArea}>
          {panel}
        </div>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </main>
  )

  if (detail.status === 'loading') return frame(<LoadingRows rows={3} label="수행평가를 불러오는 중" />)
  if (detail.status === 'error' && detail.error) {
    return frame(
      detail.error.code === 'ASSESSMENT_NOT_FOUND' ? (
        <EmptyState
          title="수행평가를 찾을 수 없어요"
          description="삭제되었거나 접근할 수 없는 수행평가예요."
          action={<Link to={schoolAssessmentsPath}>목록으로 가기</Link>}
        />
      ) : (
        <ErrorState title="수행평가를 불러오지 못했어요" error={detail.error} onRetry={detail.retry} />
      ),
    )
  }
  if (!item) return null

  const days = item.deadlineDate ? daysUntil(item.deadlineDate, assessmentToday()) : undefined
  const currentSubjects = terms.data?.contexts.find((context) =>
    context.subjects.some((subject) => subject.subjectId === item.subjectId),
  )?.subjects ?? [{ subjectId: item.subjectId, name: subjectName(item.subjectId) }]

  const onStatusChange = async (next: SchoolAssessmentStatus) => {
    if (next === item.status || pending) return
    setPending(true)
    try {
      await changeSchoolAssessmentStatus(item.assessmentId, next)
      showToast('success', `상태를 ${statusLabels[next]}(으)로 바꿨어요.`)
      notifyDataChanged()
    } catch (error) {
      const apiError = toApiError(error)
      showToast('error', `상태를 바꾸지 못했어요. ${apiError.message} (${apiError.code})`)
    } finally {
      setPending(false)
    }
  }

  const panel = (
    <DetailPanel
      activeTab={panelTab}
      onTabChange={setPanelTab}
      assessmentTitle={item.title}
      hasNote={note !== undefined}
      onUnavailable={(message) => showToast('info', message)}
      feedbackContent={
        <FeedbackTab
          assessmentId={item.assessmentId}
          note={note}
          noteBlockedReason={noteBlockedReason}
          selections={selections}
          artifactsStatus={artifacts.status}
          versionsById={versionsById}
          history={history}
          onSent={(request) => {
            setModal({ kind: 'sent', request })
            refreshDetail()
            // 메뉴의 "대기 N"도 다시 계산한다.
            notifyDataChanged()
          }}
        />
      }
    />
  )

  return (
    <>
      {frame(
        <>
          <p className={styles.eyebrow}>
            <ClipboardIcon size={14} />
            학교 수행평가
          </p>
          <h1 className={styles.title}>{item.title}</h1>
          <div className={styles.chipRow}>
            <button type="button" className={styles.chipButton} onClick={() => setModal({ kind: 'topic' })}>
              <SparkleIcon size={14} className={styles.chipIconBlue} />
              주제명 추천받기
            </button>
            <Link to={pendingAssessmentSections.tips.path} className={styles.chipButton}>
              <BulbIcon size={14} />
              수행평가 꿀팁
            </Link>
          </div>
          <MockDataNotice />

          <dl className={styles.props}>
            <PropertyRow icon={<StatusIcon size={15} />} label="진행 상태">
              <span className={styles.statusValue}>
                <StatusSelect status={item.status} assessmentTitle={item.title} pending={pending} onChange={onStatusChange} />
                <span className={styles.hint}>내가 관리하는 상태예요. 되돌리기는 정책 확정 전이라 아직 안 돼요.</span>
              </span>
            </PropertyRow>
            <PropertyRow icon={<BookIcon size={15} />} label="과목">
              {subjectName(item.subjectId)}
            </PropertyRow>
            <PropertyRow icon={<CalendarIcon size={15} />} label="제출 마감">
              {item.deadlineDate ? (
                <>
                  {formatDateWithWeekday(item.deadlineDate)}
                  {days !== undefined && item.status !== 'COMPLETED' && days >= 0 && (
                    <span className={styles.dday} data-urgent={days <= urgentDays}>
                      {formatDday(days)}
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.unknown}>날짜 미정</span>
              )}
            </PropertyRow>
            <PropertyRow icon={<SourceIcon size={15} />} label="정보 출처">
              <span className={styles.sourceBadge} data-linked={item.evaluationItemRef !== null}>
                {item.evaluationItemRef ? <LinkIcon size={12} /> : <PencilIcon size={12} />}
                {sourceLabel(item)}
              </span>
            </PropertyRow>
          </dl>
          <button
            type="button"
            className={styles.editInfoButton}
            aria-disabled="true"
            onClick={() => showToast('info', '평가 정보 수정은 수정 가능한 항목이 계약으로 정해진 뒤 제공돼요.')}
          >
            <SlidersIcon size={13} />
            평가 정보 수정
          </button>

          <ArtifactSection
            artifacts={artifacts}
            selectedVersions={selectedVersions}
            onSelectVersion={(artifactId, versionId) =>
              setSelectedVersions((previous) => ({ ...previous, [artifactId]: versionId }))
            }
            onRegister={() => setModal({ kind: 'upload' })}
            onNewVersion={(artifact, latest) => setModal({ kind: 'upload', target: { artifact, latest } })}
            onUnavailable={(message) => showToast('info', message)}
          />

          <NoteEditor
            key={item.assessmentId}
            sourceType="SCHOOL_ASSESSMENT"
            sourceId={item.assessmentId}
            notes={notes}
            onSaved={refreshDetail}
            onStateChange={setEditorState}
          />
        </>,
        panel,
      )}

      {modal?.kind === 'upload' && (
        <UploadArtifactModal
          sourceId={item.assessmentId}
          target={modal.target}
          onClose={() => {
            setModal(undefined)
            // 결과물 생성 후 파일 업로드만 실패한 경우에도 서버의 실제 목록을 다시 보여준다.
            refreshDetail()
          }}
          onUploaded={(version, artifact) => {
            setModal(undefined)
            setSelectedVersions((previous) => ({ ...previous, [artifact.artifactId]: version.versionId }))
            refreshDetail()
            showToast('success', `'${artifact.title}' v${version.versionNumber}을(를) 올렸어요.`)
          }}
        />
      )}
      {modal?.kind === 'topic' && (
        <TopicSuggestionModal subjects={currentSubjects} initialSubjectId={item.subjectId} onClose={() => setModal(undefined)} />
      )}
      {modal?.kind === 'sent' && (
        <FeedbackSentModal
          assessmentTitle={item.title}
          request={modal.request}
          noteRevisionNumber={note?.revisionNumber}
          versions={modal.request.snapshot.artifactVersionIds.flatMap((id) => (versionsById[id] ? [versionsById[id]] : []))}
          onClose={() => setModal(undefined)}
        />
      )}
    </>
  )
}

function PropertyRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className={styles.propRow}>
      <dt>
        {icon}
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}
