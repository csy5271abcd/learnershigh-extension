import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { listEnrichmentTasks } from '../api/enrichmentApi.ts'
import { changeSchoolAssessmentStatus, getSchoolAssessment } from '../api/schoolAssessmentApi.ts'
import type { Artifact, ArtifactVersion, AssessmentNote, EnrichmentTask, FeedbackRequest, SchoolAssessmentStatus } from '../api/types.ts'
import {
  BookIcon,
  BulbIcon,
  CalendarIcon,
  GridIcon,
  PercentIcon,
  UserIcon,
  ClipboardIcon,
  LinkIcon,
  PencilIcon,
  SlidersIcon,
  SourceIcon,
  SparkleIcon,
  StatusIcon,
} from '../components/AssessmentIcons.tsx'
import { ArtifactSection, type ArtifactWithVersions } from '../components/detail/ArtifactSection.tsx'
import { CriteriaTab } from '../components/detail/CriteriaTab.tsx'
import { DetailPanel, type DetailPanelTab } from '../components/detail/DetailPanel.tsx'
import { DetailTopBar } from '../components/detail/DetailTopBar.tsx'
import { schoolAssessmentMenuItems } from '../components/detail/detailMenuItems.ts'
import { FeedbackSentModal } from '../components/detail/FeedbackSentModal.tsx'
import { FeedbackTab, type FeedbackHistory, type SelectedArtifactVersion } from '../components/detail/FeedbackTab.tsx'
import { ResourcesTab } from '../components/detail/ResourcesTab.tsx'
import { TopicSuggestionModal } from '../components/detail/TopicSuggestionModal.tsx'
import { TipsModal } from '../components/tips/TipsBrowser.tsx'
import { UploadArtifactModal } from '../components/detail/UploadArtifactModal.tsx'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { NoticeAttachments } from '../components/detail/NoticeAttachments.tsx'
import { LinkedTasks } from '../components/notes/NoteContextPanel.tsx'
import { NoteEditor, NoteSaveStatusLabel, type NoteEditorState, type NoteInsertRequest } from '../components/notes/NoteEditor.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { StatusSelect } from '../components/StatusSelect.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { latestVersion } from '../model/assessmentDetailView.ts'
import { loadEvaluationItemCandidate } from '../model/evaluationItemCandidate.ts'
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
import type { EvaluationItemLookup } from '../model/evaluationItemCandidate.ts'
import { useApiQuery, type QueryResult } from '../model/useApiQuery.ts'
import { enrichmentPath, mockExamMaterialsPath, resourcesPath, schoolAssessmentsPath } from './paths.ts'
import styles from './SchoolAssessmentDetailRoute.module.css'

type ModalState =
  | { kind: 'upload'; target?: { artifact: Artifact; latest: ArtifactVersion | undefined } }
  | { kind: 'topic' }
  | { kind: 'tips' }
  | { kind: 'sent'; request: FeedbackRequest }

/** 이 수행평가에 연결된 심화 탐구 (AUD-013). §18 목록에 연결 필터가 없어 받은 목록에서 relatedAssessmentId로 고른다. */
async function loadLinkedTasks(assessmentId: string): Promise<EnrichmentTask[]> {
  const { items } = await listEnrichmentTasks({ page: 0, size: 100 })
  return items.filter((task) => task.relatedAssessmentId === assessmentId)
}

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
// Mockup의 계약 밖 속성(평가 유형·평가일·반영비율·담당 선생님)과 안내문·첨부는 MM-03 결정 전 속성 목록에 넣지 않는다.
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
  const linkedTasks = useApiQuery(`sa-linked-tasks|${assessmentId}|${dataVersion}`, () => loadLinkedTasks(assessmentId))
  const history = useApiQuery(
    notes.data ? `sa-feedback|${assessmentId}|${note?.noteId ?? 'none'}|${detailVersion}` : 'sa-feedback|pending',
    () => (notes.data ? loadFeedbackHistory(note) : new Promise<FeedbackHistory>(() => {})),
  )

  const [pending, setPending] = useState(false)
  // 선생님 피드백 목록에서 돌아오면(`?panel=feedback`), 홈 빠른 실행 "AI 도우미"에서 오면(`?panel=ai`) 그 탭을 연다.
  const [searchParams] = useSearchParams()
  const [panelTab, setPanelTab] = useState<DetailPanelTab>(() => {
    const panel = searchParams.get('panel')
    return panel === 'feedback' || panel === 'ai' ? panel : 'criteria'
  })
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({})
  const [modal, setModal] = useState<ModalState>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const showToast = useCallback(
    (tone: ToastMessage['tone'], text: string) => setToast((previous) => ({ id: (previous?.id ?? 0) + 1, tone, text })),
    [],
  )
  const panelRef = useRef<HTMLDivElement>(null)
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
  // 평가계획서 항목 후보 (AUD-015). 과목 이름으로 분석 결과의 과목을 찾으므로 학기 정보를 받은 뒤 조회한다.
  const refKey = item?.evaluationItemRef ? `${item.evaluationItemRef.documentRevisionId}|${item.evaluationItemRef.subjectId}|${item.evaluationItemRef.itemKey}` : 'none'
  const criteria = useApiQuery(terms.data && item ? `sa-criteria|${assessmentId}|${refKey}` : 'sa-criteria|pending', () =>
    terms.data && item
      ? loadEvaluationItemCandidate(item.evaluationItemRef, subjectNameOf(subjects, item.subjectId))
      : new Promise<never>(() => {}),
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
      initialHistoryOpen={searchParams.get('history') === '1'}
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

  const openCriteria = () => {
    setPanelTab('criteria')
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const panel = (
    <DetailPanel
      activeTab={panelTab}
      onTabChange={setPanelTab}
      assessmentTitle={item.title}
      hasNote={note !== undefined}
      criteriaContent={<CriteriaTab lookup={criteria} onUnavailable={(message) => showToast('info', message)} />}
      resourcesContent={
        <ResourcesTab
          subjectId={item.subjectId}
          subjectName={subjectName(item.subjectId)}
          topic={item.title}
          canInsert={editorState !== undefined}
          onInsert={(resource) => {
            setInsertRequest((previous) => ({ nonce: (previous?.nonce ?? 0) + 1, resource }))
            showToast('success', `'${resource.title}'을(를) 노트에 출처 카드로 넣었어요.`)
          }}
          onNotify={showToast}
        />
      }
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
          {/* 즐겨찾기 별표는 목록에서만 조작한다 (2026-10-28 사용자 요청). "AI 글쓰기 도움 제한" 배지는 계약 필드가 없어 두지 않는다 (MM-10). */}
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
            <button type="button" className={styles.chipButton} onClick={() => setModal({ kind: 'tips' })}>
              <BulbIcon size={14} />
              수행평가 꿀팁
            </button>
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
            <PropertyRow icon={<GridIcon size={15} />} label="평가 유형">
              <span className={styles.unknown}>미등록</span>
            </PropertyRow>
            <PropertyRow icon={<CalendarIcon size={15} />} label="평가일">
              <CandidateValue lookup={criteria} value={(found) => found.item.timing} emptyHint="학교 공지로 확인해 주세요" />
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
            <PropertyRow icon={<PercentIcon size={15} />} label="반영비율">
              <CandidateValue lookup={criteria} value={(found) => (found.item.weightPercent === null ? null : `${found.item.weightPercent}%`)} />
            </PropertyRow>
            <PropertyRow icon={<SourceIcon size={15} />} label="정보 출처">
              <span className={styles.sourceBadge} data-linked={item.evaluationItemRef !== null}>
                {item.evaluationItemRef ? <LinkIcon size={12} /> : <PencilIcon size={12} />}
                {sourceLabel(item)}
              </span>
              {criteria.data?.kind === 'found' && criteria.data.analysisStatus !== 'COMPLETED' && (
                <span className={styles.candidateTag}>PDF 분석 후보 · 확인 필요</span>
              )}
              {criteria.data?.kind === 'found' && criteria.data.source && (
                <button
                  type="button"
                  className={styles.sourcePage}
                  aria-label={`원본 근거 PDF ${criteria.data.source.pdfPageNumber}쪽 보기 (평가 기준 탭)`}
                  onClick={openCriteria}
                >
                  PDF p.{criteria.data.source.pdfPageNumber}
                </button>
              )}
            </PropertyRow>
            <PropertyRow icon={<UserIcon size={15} />} label="담당 선생님">
              {/* 학교 담당 선생님. 계약 필드가 없어 학원·관리자 정보로 대체하지 않는다 (MM-49). */}
              <span className={styles.unknown}>미등록 · 확인 필요</span>
            </PropertyRow>
            <PropertyRow icon={<BulbIcon size={15} />} label="연결된 심화 탐구">
              <LinkedTasks linkedTasks={linkedTasks} />
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

          <NoticeAttachments assessmentId={item.assessmentId} assessmentTitle={item.title} />

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

          {/* 과제 정보는 위 속성 목록에서 보여준다. 노트 위에 같은 정보를 다시 두지 않는다 (2026-10-28 사용자 요청). */}
          <NoteEditor
            key={item.assessmentId}
            sourceType="SCHOOL_ASSESSMENT"
            sourceId={item.assessmentId}
            notes={notes}
            onSaved={refreshDetail}
            onStateChange={setEditorState}
            insertRequest={insertRequest}
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
      {modal?.kind === 'tips' && (
        <TipsModal
          onClose={() => setModal(undefined)}
          resolveAction={(action) => {
            switch (action) {
              case 'TOPIC_SUGGESTION':
                return { run: () => setModal({ kind: 'topic' }) }
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

/**
 * 평가계획서 분석 값 (evaluationItemRef → §11). 값이 있으면 "후보 · 확인 필요"를 붙인다.
 * 직접 등록이거나 원본에 없으면 "미등록", 조회 중이면 "불러오는 중…", 실패하면 그 사실을 보여준다.
 */
function CandidateValue({
  lookup,
  value,
  emptyHint,
}: {
  lookup: QueryResult<EvaluationItemLookup>
  value: (found: Extract<EvaluationItemLookup, { kind: 'found' }>) => string | null
  emptyHint?: string
}) {
  if (lookup.status === 'error') return <span className={styles.unknown}>평가계획서 정보를 불러오지 못했어요</span>
  if (!lookup.data) return <span className={styles.unknown}>불러오는 중…</span>
  const text = lookup.data.kind === 'found' ? value(lookup.data) : null
  if (text === null)
    return (
      <>
        <span className={styles.unknown}>미등록</span>
        {emptyHint && <span className={styles.hint}>{emptyHint}</span>}
      </>
    )
  return (
    <>
      {text}
      <span className={styles.candidateTag}>평가계획서 후보 · 확인 필요</span>
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
