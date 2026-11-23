import { isMockDataSource } from '../api/dataSource.ts'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { toApiError } from '../api/apiError.ts'
import {
  getFeedbackReply,
  listArtifacts,
  listArtifactVersions,
  listFeedbackRequests,
  listNoteRevisions,
  listNotes,
  trashArtifact,
  exportNotePdf,
  trashSchoolAssessment,
} from '../api/assessmentDetailApi.ts'
import { assessmentToday } from '../api/runtimeInfo.ts'
import { changeSchoolAssessmentStatus, getSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { Artifact, ArtifactVersion, AssessmentNote, FeedbackRequest, SchoolAssessmentStatus } from '../api/types.ts'
import {
  BookIcon,
  BulbIcon,
  CalendarIcon,
  GridIcon,
  PercentIcon,
  ClipboardIcon,
  PencilIcon,
  SlidersIcon,
  StatusIcon,
} from '../components/AssessmentIcons.tsx'
import { ArtifactSection, type ArtifactWithVersions } from '../components/detail/ArtifactSection.tsx'
import { NoticeSection, OfficialCriteriaSection, OfficialSourceSection } from '../components/detail/DetailSections.tsx'
import sectionStyles from '../components/detail/detailSections.module.css'
import { DateEditor, InlineRow, SubmissionEditor, TypeEditor, WeightEditor } from '../components/detail/InlineMeta.tsx'
import { dateDisplay, inlineSaver, typeDisplay } from '../model/inlineMeta.ts'
import { Modal } from '../components/Modal.tsx'
import { contextOf, loadOfficialCriteria } from '../model/officialCriteria.ts'
import { DetailTopBar } from '../components/detail/DetailTopBar.tsx'
import { EditSchoolAssessmentModal } from '../components/EditSchoolAssessmentModal.tsx'
import { schoolAssessmentMenuItems } from '../components/detail/detailMenuItems.ts'
import { DeleteSchoolAssessmentModal } from '../components/detail/DeleteSchoolAssessmentModal.tsx'
import { noteExportRequest, pdfFileName } from '../model/noteExport.ts'
import { FeedbackSentModal } from '../components/detail/FeedbackSentModal.tsx'
import { FeedbackTab, type FeedbackHistory, type SelectedArtifactVersion } from '../components/detail/FeedbackTab.tsx'
import { ResourcesTab } from '../components/detail/ResourcesTab.tsx'
import { TipsModal } from '../components/tips/TipsBrowser.tsx'
import { UploadArtifactModal } from '../components/detail/UploadArtifactModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { NoteEditor, NoteSaveStatusLabel, type NoteEditorState, type NoteInsertRequest } from '../components/notes/NoteEditor.tsx'
import { NoteReadOnlyView } from '../components/notes/NoteReadOnlyView.tsx'
import { isAssessmentReadOnlyView } from '../api/viewMode.ts'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { StatusSelect } from '../components/StatusSelect.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { latestVersion } from '../model/assessmentDetailView.ts'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import {
  daysUntil,
  formatDday,
  statusLabels,
  subjectNameOf,
  urgentDays,
} from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { archivePath, enrichmentPath, mockExamMaterialsPath, resourcesPath, schoolAssessmentsPath } from './paths.ts'
import styles from './SchoolAssessmentDetailRoute.module.css'

/** A28-49 노트 내보내기 시각(렌더 밖에서만 부른다) */
const exportClock = () => new Date()

type ModalState =
  | { kind: 'upload'; target?: { artifact: Artifact; latest: ArtifactVersion | undefined } }
  | { kind: 'topic' }
  | { kind: 'tips' }
  | { kind: 'sent'; request: FeedbackRequest }
  | { kind: 'edit' }
  | { kind: 'delete' }

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
// A27-UX: 오른쪽 고정 패널을 없애고 본문을 넓게 쓴다. 평가 기준은 본문 접이식 Section, 피드백은 상단 '선생님께 피드백 요청' Modal,
// 자료는 그 옆 '자료 찾기' Modal로 옮겼다. 학생 AI 도우미·주제명 추천은 제거했다. 정보 출처·담당 선생님은 학생 화면에 보이지 않는다(서버 기록은 보존).
// 평가 유형·평가일·반영 비율·제출물·개인 메모는 학생 개인 관리 정보(§12 DRAFT)로 보여 주고, 비어 있으면 평가계획서 확정 후보를 참고로 둔다.
// 노트 위 과제 정보는 평가계획서 분석 후보(반영비율·평가 시기)를 "후보 · 확인 필요"로, 나머지는 "미등록"으로 보여준다.
// 연결된 심화 탐구(AUD-013)는 §18 relatedAssessmentId로 찾는다.
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
  // 선생님 피드백 목록에서 돌아오면(`?panel=feedback`) 피드백 Modal을 연다.
  const [searchParams] = useSearchParams()
  const [sheet, setSheet] = useState<'feedback' | 'resources' | null>(() => (searchParams.get('panel') === 'feedback' ? 'feedback' : null))
  const [criteriaOpen, setCriteriaOpen] = useState(true)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({})
  const [modal, setModal] = useState<ModalState>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = useCallback(
    (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text })),
    [],
  )
  // 꿀팁 "탐구 노트 열기": Modal이 닫히며 Focus를 버튼으로 돌려준 뒤에 노트로 스크롤한다.
  const [noteScrollRequest, setNoteScrollRequest] = useState(0)
  useEffect(() => {
    if (noteScrollRequest > 0) document.getElementById('note-heading')?.scrollIntoView({ block: 'start' })
  }, [noteScrollRequest])
  const [editorState, setEditorState] = useState<NoteEditorState>()
  const [insertRequest, setInsertRequest] = useState<NoteInsertRequest>()
  // 피드백 Snapshot은 서버에 저장된 Revision만 가리켜야 한다. 편집기에 저장 안 된 변경이 있거나
  // 저장 직후 목록이 아직 최신 Revision을 받지 못했으면 요청을 막는다 (feedback §4, testing §9).
  const noteBlockedReason = editorState?.unsaved
    ? '노트에 저장되지 않은 변경이 있어요.'
    : editorState?.baseRevisionId && editorState.baseRevisionId !== note?.revisionId
      ? '노트 저장 상태를 확인하는 중이에요.'
      : undefined

  // 목록에서 들어왔으면 History로 돌아가 URL의 검색·필터와 Scroll을 그대로 복원한다.
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate(schoolAssessmentsPath))

  // §12 상세 응답에 학기가 없어 과목명은 불러온 학기들의 과목 목록에서 찾는다.
  const subjects = terms.data?.contexts.flatMap((context) => context.subjects) ?? []
  const subjectName = (subjectId: string) => (terms.status === 'loading' ? '…' : subjectNameOf(subjects, subjectId))
  const item = detail.data
  // A27-UX 학생(2026-11-19): 평가 기준은 관리자 확정·학생 공개값(§10-1)만. AI 분석 후보(§11)는 읽지도 요청하지도 않는다.
  const itemContext = item ? contextOf(terms.data?.contexts ?? [], item.subjectId) : undefined
  const criteria = useApiQuery(terms.data && item ? `sa-criteria|${assessmentId}|${item.title}|${itemContext ? `${itemContext.academicYear}-${itemContext.semester}` : 'none'}` : 'sa-criteria|pending', () =>
    terms.data && item ? loadOfficialCriteria(item, itemContext) : new Promise<never>(() => {}),
  )
  const saveInline = inlineSaver(
    assessmentId,
    () => {
      showToast('success', '저장했어요.')
      // 저장 응답을 그대로 쓰지 않고 상세·목록을 서버에서 다시 읽는다
      notifyDataChanged()
    },
  )

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

  // 관리자 읽기 전용 보기(P-28): 학생 화면과 같은 자리·같은 모양을 유지한다. 즉시 바뀌는 동작(상태·주제 적용)은 비활성,
  // 등록·업로드 Modal은 Modal이 읽기 전용 안내로 바뀐다. 노트는 저장본을 같은 틀로 보여준다. 쓰기 API는 viewMode Guard가 막는다.
  const readOnly = isAssessmentReadOnlyView()

  const openFeedback = () => setSheet('feedback')
  // A28-46: 휴지통 이동(소프트 삭제). 본문 버튼과 상단 더보기 메뉴가 같은 동작을 쓴다
  const moveToTrash = item && !readOnly && !isMockDataSource
    ? () => {
        if (!window.confirm(`'${item.title}' 수행평가를 휴지통으로 옮길까요? 노트·결과물·피드백 기록은 그대로 보관되고, 보관함 휴지통에서 복구할 수 있어요.`)) return
        trashSchoolAssessment(item.assessmentId).then(
          () => {
            notifyDataChanged()
            navigate(archivePath + '?tab=trash')
          },
          (error: Error) => showToast('error', `옮기지 못했어요. ${error.message}`),
        )
      }
    : undefined

  // A28-51 노트 내보내기(PDF): 서버(§20-1)가 저장된 최신 노트로 텍스트 PDF 를 만든다.
  // 저장 안 된 편집이 있으면 먼저 저장을 안내하고(그대로 진행하면 저장된 버전 기준), 만드는 동안 다시 누르지 못하게 한다.
  const [exporting, setExporting] = useState(false)
  const exportNote = () => {
    if (!item || exporting) return
    if (editorState?.unsaved && !window.confirm(
      `아직 저장하지 않은 편집이 있어요. PDF는 서버에 저장된 노트${note?.revisionNumber ? `(v${note.revisionNumber})` : ''} 기준으로 만들어져 지금 편집은 빠져요.

먼저 저장하려면 '취소'를 누르고 저장한 뒤 다시 내보내 주세요. 저장된 버전으로 내보낼까요?`,
    )) return
    setExporting(true)
    const exportedAt = exportClock()
    showToast('info', 'PDF를 만드는 중이에요…')
    exportNotePdf(item.assessmentId, noteExportRequest(subjectName(item.subjectId), [
      ['진행 상태', statusLabels[item.status] ?? item.status],
      ['평가 유형', typeDisplay(item)],
      ['평가일', dateDisplay(item.evaluationDate)],
      ['제출 마감', dateDisplay(item.deadlineDate)],
      ['반영 비율', item.weightPercent != null ? `${item.weightPercent}%` : null],
      ['제출물', item.submissions],
    ])).then(
      ({ blob, contentDisposition }) => {
        const href = URL.createObjectURL(blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' }))
        const anchor = document.createElement('a')
        anchor.href = href
        anchor.download = pdfFileName(contentDisposition, item.title, exportedAt)
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
        showToast('success', editorState?.unsaved ? '저장된 노트로 PDF를 내보냈어요(아직 저장 안 된 편집은 빠졌어요).' : '노트를 PDF 파일로 내보냈어요.')
      },
      (error: Error) => showToast('error', `PDF를 만들지 못했어요. ${error.message}`),
    ).finally(() => setExporting(false))
  }

  const topBar = (
    <DetailTopBar
      title={item?.title}
      subjectId={item?.subjectId}
      subjectName={item ? subjectName(item.subjectId) : ''}
      noteId={editorState?.noteId ?? note?.noteId}
      onBack={goBack}
      onRequestFeedback={readOnly ? undefined : openFeedback}
      onFindResources={() => setSheet('resources')}
      onUnavailable={(message) => showToast('info', message)}
      menuItems={schoolAssessmentMenuItems(assessmentId, {
        onEdit: item && !readOnly ? () => setModal({ kind: 'edit' }) : undefined,
        onExport: item && !readOnly && !isMockDataSource ? exportNote : undefined,
        exporting,
        onTrash: moveToTrash,
        onDelete: item && !readOnly && !isMockDataSource ? () => setModal({ kind: 'delete' }) : undefined,
        unavailable: readOnly ? '관리자 읽기 전용 보기에서는 사용할 수 없어요.' : isMockDataSource ? '시연 데이터에서는 사용할 수 없어요.' : '정보를 불러오는 중이에요.',
      })}
      saveStatus={<NoteSaveStatusLabel state={editorState} />}
      currentRevisionId={editorState?.baseRevisionId}
      hasUnsavedChanges={editorState?.unsaved}
      initialHistoryOpen={searchParams.get('history') === '1'}
    />
  )

  const frame = (content: ReactNode) => (
    <main className={styles.page}>
      {topBar}
      <div className={styles.body} data-layout="single">
        <div className={styles.main}>
          <article className={styles.column} data-wide="true">
            {content}
          </article>
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

  const resourcesContent = (
        <ResourcesTab
          subjectId={item.subjectId}
          subjectName={subjectName(item.subjectId)}
          topic={item.title}
          canInsert={!readOnly && editorState !== undefined}
          onInsert={(resource) => {
            setInsertRequest((previous) => ({ nonce: (previous?.nonce ?? 0) + 1, resource }))
            showToast('success', `'${resource.title}'을(를) 노트에 출처 카드로 넣었어요.`)
          }}
          onNotify={showToast}
          linked={editorState?.linkedResources}
          onUnlink={(resourceId, title) => {
            setInsertRequest((previous) => ({ nonce: (previous?.nonce ?? 0) + 1, removeResourceId: resourceId }))
            showToast('success', `'${title}' 출처 카드를 노트에서 뺐어요. 자료함의 자료는 그대로예요.`)
          }}
        />
  )
  const feedbackContent = (
        <FeedbackTab
          assessmentId={item.assessmentId}
          note={note}
          noteBlockedReason={noteBlockedReason}
          selections={selections}
          artifactsStatus={artifacts.status}
          versionsById={versionsById}
          history={history}
          onSent={(request) => {
            setSheet(null)
            setModal({ kind: 'sent', request })
            refreshDetail()
            // 메뉴의 "대기 N"도 다시 계산한다.
            notifyDataChanged()
          }}
        />
  )

  const artifactSection = (
    <ArtifactSection
      artifacts={artifacts}
      selectedVersions={selectedVersions}
      onSelectVersion={(artifactId, versionId) =>
        setSelectedVersions((previous) => ({ ...previous, [artifactId]: versionId }))
      }
      onRegister={readOnly ? undefined : () => setModal({ kind: 'upload' })}
      onNewVersion={readOnly ? undefined : (artifact, latest) => setModal({ kind: 'upload', target: { artifact, latest } })}
      onTrash={
        readOnly || isMockDataSource
          ? undefined
          : (artifact) => {
              // 소프트 삭제: 버전·파일·피드백 요청 당시 기록은 지우지 않는다. 보관함 휴지통에서 복구할 수 있다.
              if (!window.confirm(`'${artifact.title}' 결과물을 휴지통으로 옮길까요? 버전과 파일은 지워지지 않고, 보관함 휴지통에서 복구할 수 있어요.`)) return
              trashArtifact(artifact.artifactId).then(
                () => {
                  showToast('success', '휴지통으로 옮겼어요.')
                  refreshDetail()
                  notifyDataChanged()
                },
                (error: Error) => showToast('error', `옮기지 못했어요. ${error.message}`),
              )
            }
      }
      onUnavailable={(message) => showToast('info', message)}
    />
  )

  return (
    <>
      {frame(
        <>
          {/* 즐겨찾기 별표는 목록에서만 조작한다 (2026-10-28 사용자 요청). "AI 글쓰기 도움 제한" 배지는 계약 필드가 없어 두지 않는다 (MM-10). */}
          <p className={styles.eyebrow}>
            <ClipboardIcon size={14} />
            학교 수행평가
          </p>
          <h1 className={styles.title}>{item.title}</h1>
          <div className={styles.chipRow}>
            <button type="button" className={styles.chipButton} onClick={() => setModal({ kind: 'tips' })}>
              <BulbIcon size={14} />
              수행평가 꿀팁
            </button>
          </div>
          <MockDataNotice />

          <dl className={styles.props}>
            <PropertyRow icon={<StatusIcon size={15} />} label="진행 상태">
              <span className={styles.statusValue}>
                <StatusSelect status={item.status} assessmentTitle={item.title} pending={pending} onChange={onStatusChange} disabled={readOnly} />
              </span>
            </PropertyRow>
            <PropertyRow icon={<BookIcon size={15} />} label="과목">
              {subjectName(item.subjectId)}
            </PropertyRow>
            {/* A28-20: 관리자 최종 승인으로 자동 등록된 학교 확정 수행평가 — 공식 값(학생이 바꿀 수 없음). 날짜는 아래 내 일정에서 따로 넣는다 */}
            {item.official && (
              <PropertyRow icon={<BookIcon size={15} />} label="학교 확정">
                <span data-testid="detail-official" data-official-status={item.official.status}>
                  {[
                    item.official.status === 'WITHDRAWN' ? '최신 확정본에서 빠졌어요(내 기록은 그대로)' : '선생님 확정 평가계획서',
                    item.official.timing ? `시기 ${item.official.timing}` : '시기 미정',
                    item.official.weightPercent != null ? `반영 ${item.official.weightPercent}%` : null,
                    item.official.maxScore != null ? `만점 ${item.official.maxScore}점` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </PropertyRow>
            )}
            {/* A27-UX 학생(이미지 09): 값 자리를 눌러 그 자리에서 추가·수정 (Notion형). 한 필드씩 저장한다 */}
            <InlineRow
              label="평가 유형"
              icon={<GridIcon size={15} />}
              testId="meta-type"
              display={typeDisplay(item)}
              empty={!item.assessmentType}
              emptyText="평가 유형 추가"
              readOnly={readOnly}
              saver={saveInline}
              editor={({ save, cancel }) => <TypeEditor item={item} save={save} cancel={cancel} />}
            />
            <InlineRow
              label="평가일"
              icon={<CalendarIcon size={15} />}
              testId="meta-evaluation-date"
              display={dateDisplay(item.evaluationDate)}
              empty={!item.evaluationDate}
              emptyText="평가일 추가"
              readOnly={readOnly}
              saver={saveInline}
              editor={({ save, cancel }) => <DateEditor field="evaluationDate" label="평가일" value={item.evaluationDate} save={save} cancel={cancel} />}
            />
            <InlineRow
              label="제출 마감"
              icon={<CalendarIcon size={15} />}
              testId="meta-deadline"
              display={
                <>
                  {dateDisplay(item.deadlineDate)}
                  {days !== undefined && item.status !== 'COMPLETED' && days >= 0 && (
                    <span className={styles.dday} data-urgent={days <= urgentDays}>
                      {formatDday(days)}
                    </span>
                  )}
                </>
              }
              empty={!item.deadlineDate}
              emptyText="제출 마감 추가"
              readOnly={readOnly}
              saver={saveInline}
              editor={({ save, cancel }) => <DateEditor field="deadlineDate" label="제출 마감" value={item.deadlineDate} save={save} cancel={cancel} />}
            />
            <InlineRow
              label="반영 비율"
              icon={<PercentIcon size={15} />}
              testId="meta-weight"
              display={item.weightPercent != null ? `${item.weightPercent}%` : null}
              empty={item.weightPercent == null}
              emptyText="반영 비율 추가"
              readOnly={readOnly}
              saver={saveInline}
              editor={({ save, cancel }) => <WeightEditor value={item.weightPercent} save={save} cancel={cancel} />}
            />
            <InlineRow
              label="제출물"
              icon={<ClipboardIcon size={15} />}
              testId="meta-submissions"
              display={item.submissions}
              empty={!item.submissions}
              emptyText="제출물 추가"
              readOnly={readOnly}
              saver={saveInline}
              editor={({ save, cancel }) => <SubmissionEditor value={item.submissions} save={save} cancel={cancel} />}
            />
            {item.description && (
              <PropertyRow icon={<BookIcon size={15} />} label="수행 내용">
                <span style={{ whiteSpace: 'pre-wrap' }}>{item.description}</span>
              </PropertyRow>
            )}
            {item.personalMemo && (
              <PropertyRow icon={<PencilIcon size={15} />} label="개인 메모">
                <span style={{ whiteSpace: 'pre-wrap' }}>{item.personalMemo}</span>
              </PropertyRow>
            )}
          </dl>
          <button
            type="button"
            className={styles.editInfoButton}
            disabled={readOnly}
            title={readOnly ? '관리자 읽기 전용 보기에서는 사용할 수 없어요' : '평가 유형·날짜·반영 비율·제출물·메모를 바꿀 수 있어요'}
            data-testid="edit-assessment-open"
            onClick={() => setModal({ kind: 'edit' })}
          >
            <SlidersIcon size={13} />
            평가 정보 수정
          </button>
          {!readOnly && !isMockDataSource && (
            <button
              type="button"
              className={styles.editInfoButton}
              data-testid="trash-assessment"
              title="노트·결과물·피드백 기록은 지우지 않고 함께 휴지통에 들어가요"
              onClick={() => moveToTrash?.()}
            >
              휴지통으로 이동
            </button>
          )}

          {/* A27-UX 학생(이미지 10·11): 다섯 Section을 같은 위계로 — 안내문·첨부 / 평가계획서 원본 / 평가 기준 / 수행평가 결과물 / 탐구 노트 */}
          <NoticeSection assessmentId={item.assessmentId} assessmentTitle={item.title} />
          <OfficialSourceSection context={itemContext} />
          <OfficialCriteriaSection query={criteria} open={criteriaOpen} onToggle={() => setCriteriaOpen((value) => !value)} />

          <div className={sectionStyles.section} data-testid="detail-artifacts">{artifactSection}</div>

          {/* 과제 정보는 위 속성 목록에서 보여준다. 노트 위에 같은 정보를 다시 두지 않는다 (2026-10-28 사용자 요청). */}
          <div className={`${sectionStyles.section} ${sectionStyles.noteWrap}`} data-testid="detail-note">
          {readOnly ? (
            <NoteReadOnlyView notes={notes} />
          ) : (
          <NoteEditor
            key={item.assessmentId}
            sourceType="SCHOOL_ASSESSMENT"
            sourceId={item.assessmentId}
            notes={notes}
            onSaved={refreshDetail}
            onStateChange={setEditorState}
            insertRequest={insertRequest}
          />
          )}
          </div>
        </>,
      )}

      {sheet === 'feedback' && (
        <Modal title="선생님께 피드백 요청" wide onRequestClose={() => setSheet(null)} footer={<button type="button" className={styles.sheetClose} onClick={() => setSheet(null)}>닫기</button>}>
          <div data-testid="feedback-modal">{feedbackContent}</div>
        </Modal>
      )}
      {sheet === 'resources' && (
        <Modal title="자료 찾기" description="참고자료를 검색해 보고, 탐구 노트에 출처 카드로 넣을 수 있어요." wide onRequestClose={() => setSheet(null)} footer={<button type="button" className={styles.sheetClose} onClick={() => setSheet(null)}>닫기</button>}>
          <div data-testid="find-resources-modal">{resourcesContent}</div>
        </Modal>
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
      {modal?.kind === 'edit' && (
        <EditSchoolAssessmentModal
          assessment={item}
          onClose={() => setModal(undefined)}
          onSaved={() => {
            setModal(undefined)
            showToast('success', '평가 정보를 저장했어요.')
            // 저장 응답을 그대로 쓰지 않고 상세·목록을 서버에서 다시 읽는다.
            notifyDataChanged()
          }}
        />
      )}
      {modal?.kind === 'delete' && item && (
        <DeleteSchoolAssessmentModal
          assessmentId={item.assessmentId}
          title={item.title}
          onClose={() => setModal(undefined)}
          onDeleted={() => {
            setModal(undefined)
            notifyDataChanged()
            navigate(schoolAssessmentsPath)
          }}
        />
      )}
      {modal?.kind === 'tips' && (
        <TipsModal
          onClose={() => setModal(undefined)}
          resolveAction={(action) => {
            switch (action) {
              case 'NOTE':
                return {
                  run: () => {
                    setModal(undefined)
                    setNoteScrollRequest((value) => value + 1)
                  },
                }
              case 'RESOURCES':
                return { run: () => navigate(resourcesPath) }
              case 'ENRICHMENT':
                return { run: () => navigate(enrichmentPath) }
              case 'MOCK_EXAM':
                return { run: () => navigate(mockExamMaterialsPath) }
            }
          }}
        />
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
