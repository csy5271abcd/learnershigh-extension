import { useCallback, useRef, useState } from 'react'
import type { SchoolEvidenceService } from '../fixtures/schoolEvidence.fixture.ts'
import { suggestedStageTag } from '../model/evidence.ts'
import { restoreFocus } from '../model/focus.ts'
import { taskStageNames } from '../model/tasks.ts'
import type { StudentTaskSummary, TaskEvidence, TaskProcessCategory } from '../model/types.ts'
import { useGuideFileReader } from '../model/useGuideFileReader.ts'
import { EvidenceAddDialog, EvidenceDeleteDialog, EvidencePreviewDialog } from './EvidenceDialogs.tsx'

interface AddState {
  task: StudentTaskSummary
  stageTag: TaskProcessCategory
  file: File | null
  error?: string
  submitting: boolean
  submitFailed: boolean
}

// 자료 추가 / 미리보기 / 삭제 흐름. Task Detail 과정 자료 Tab과 School Evidence가 같은 흐름 · 같은 Service를 쓴다.
// 성공하면 onChanged로 화면이 Canonical Evidence를 다시 읽는다. (화면별 복사본 없음)
export function useEvidenceManager({
  service,
  onChanged,
  focusFallbackId,
}: {
  service: SchoolEvidenceService
  onChanged: () => void
  /** 삭제한 자료의 버튼처럼 Focus를 돌려줄 곳이 사라졌을 때 옮길 요소 */
  focusFallbackId: string
}) {
  const [add, setAdd] = useState<AddState | null>(null)
  const [preview, setPreview] = useState<TaskEvidence | null>(null)
  const [deleting, setDeleting] = useState<{ evidence: TaskEvidence; pending: boolean } | null>(null)
  const [deleteErrorId, setDeleteErrorId] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const triggerRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)

  const fileReader = useGuideFileReader(
    useCallback((file: File) => setAdd((current) => (current ? { ...current, file, error: undefined } : current)), []),
  )

  const openAdd = (task: StudentTaskSummary, trigger: HTMLElement | null) => {
    triggerRef.current = trigger
    fileReader.reset()
    setAnnouncement('')
    setAdd({ task, stageTag: suggestedStageTag(task.currentStage), file: null, submitting: false, submitFailed: false })
  }

  const closeAdd = () => {
    if (busyRef.current) return
    fileReader.reset()
    setAdd(null)
    restoreFocus(triggerRef.current, focusFallbackId)
  }

  const submitAdd = () => {
    if (!add || busyRef.current) return
    let error: string | undefined
    if (fileReader.state.status === 'reading') error = '파일을 준비하고 있어요. 준비가 끝나면 추가할 수 있어요.'
    else if (!add.file) error = '추가할 파일을 선택해주세요.'
    if (error || !add.file) {
      setAdd({ ...add, error })
      document.getElementById('evidence-file-box')?.focus()
      return
    }
    // 중복 클릭 방지: 응답이 올 때까지 한 번만 보낸다.
    busyRef.current = true
    const { task, file, stageTag } = add
    setAdd({ ...add, submitting: true, submitFailed: false })
    service.add(task.taskId, file, stageTag).then(
      () => {
        busyRef.current = false
        setAdd(null)
        setAnnouncement(`${file.name}을(를) 추가했어요.`)
        onChanged()
        restoreFocus(triggerRef.current, focusFallbackId)
      },
      () => {
        busyRef.current = false
        setAdd((current) => (current ? { ...current, submitting: false, submitFailed: true } : current))
      },
    )
  }

  const openPreview = (evidence: TaskEvidence, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setPreview(evidence)
  }

  const closePreview = () => {
    setPreview(null)
    restoreFocus(triggerRef.current, focusFallbackId)
  }

  const openDelete = (evidence: TaskEvidence, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setDeleteErrorId(undefined)
    setAnnouncement('')
    setDeleting({ evidence, pending: false })
  }

  const closeDelete = () => {
    if (busyRef.current) return
    setDeleting(null)
    restoreFocus(triggerRef.current, focusFallbackId)
  }

  const confirmDelete = () => {
    if (!deleting || busyRef.current) return
    busyRef.current = true
    const { evidence } = deleting
    setDeleting({ evidence, pending: true })
    service.remove(evidence.taskId, evidence.evidenceId).then(
      () => {
        busyRef.current = false
        setDeleting(null)
        setAnnouncement(`${evidence.fileName}을(를) 삭제했어요.`)
        onChanged()
        restoreFocus(null, focusFallbackId)
      },
      () => {
        // 실패: 파일은 그대로 두고 그 줄에 이유를 보여준다.
        busyRef.current = false
        setDeleting(null)
        setDeleteErrorId(evidence.evidenceId)
        restoreFocus(triggerRef.current, focusFallbackId)
      },
    )
  }

  const dialogs = (
    <>
      {/* 추가 / 삭제 결과 안내. 기다림 상태 화면에 빈 live region을 두지 않도록 안내가 있을 때만 그린다. */}
      {announcement && (
        <p className="lh-visually-hidden" role="status">
          {announcement}
        </p>
      )}
      {add && (
        <EvidenceAddDialog
          context={`${add.task.title} · ${add.task.subject} · ${add.task.currentStage}단계 ${taskStageNames[add.task.currentStage]}`}
          file={add.file}
          fileState={fileReader.state}
          onFileSelect={(file) => {
            setAdd({ ...add, file: null, error: undefined, submitFailed: false })
            fileReader.read(file)
          }}
          onFileRemove={() => {
            fileReader.reset()
            setAdd({ ...add, file: null })
          }}
          stageTag={add.stageTag}
          onStageTagChange={(stageTag) => setAdd({ ...add, stageTag })}
          error={add.error}
          submitting={add.submitting}
          submitFailed={add.submitFailed}
          onSubmit={submitAdd}
          onClose={closeAdd}
        />
      )}
      {preview && <EvidencePreviewDialog evidence={preview} onClose={closePreview} />}
      {deleting && (
        <EvidenceDeleteDialog evidence={deleting.evidence} deleting={deleting.pending} onConfirm={confirmDelete} onClose={closeDelete} />
      )}
    </>
  )

  return { openAdd, openPreview, openDelete, deleteErrorId, dialogs }
}
