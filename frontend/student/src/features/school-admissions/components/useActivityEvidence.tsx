import { useCallback, useRef, useState } from 'react'
import type { SchoolActivityService } from '../fixtures/schoolActivity.fixture.ts'
import type { ActivityEvidence, GrowthActivity } from '../model/activity.ts'
import { activityTypeLabel } from '../model/activity.ts'
import { restoreFocus } from '../model/focus.ts'
import { useGuideFileReader } from '../model/useGuideFileReader.ts'
import { EvidenceAddDialog, EvidenceDeleteDialog, FilePreviewDialog } from './EvidenceDialogs.tsx'

const addButtonId = 'activity-evidence-add'

// Activity 과정 자료 추가 / 미리보기 / 삭제. Task 과정 자료와 같은 창(파일 준비 진행률 · 미리보기 · 삭제 확인)을 쓰되,
// Task 단계 Tag는 묻지 않고 Activity 저장소에만 저장한다. (Task Evidence와 섞지 않는다)
export function useActivityEvidence({ service, onChanged }: { service: SchoolActivityService; onChanged: () => void }) {
  const [add, setAdd] = useState<{ activity: GrowthActivity; file: File | null; error?: string; submitting: boolean; failed: boolean } | null>(null)
  const [preview, setPreview] = useState<ActivityEvidence | null>(null)
  const [deleting, setDeleting] = useState<{ evidence: ActivityEvidence; pending: boolean } | null>(null)
  const [deleteErrorId, setDeleteErrorId] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const triggerRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)

  const fileReader = useGuideFileReader(
    useCallback((file: File) => setAdd((current) => (current ? { ...current, file, error: undefined } : current)), []),
  )

  const openAdd = (activity: GrowthActivity, trigger: HTMLElement) => {
    triggerRef.current = trigger
    fileReader.reset()
    setAnnouncement('')
    setAdd({ activity, file: null, submitting: false, failed: false })
  }

  const closeAdd = () => {
    if (busyRef.current) return
    fileReader.reset()
    setAdd(null)
    restoreFocus(triggerRef.current, addButtonId)
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
    busyRef.current = true
    const { activity, file } = add
    setAdd({ ...add, submitting: true, failed: false })
    service.addEvidence(activity.activityId, file).then(
      () => {
        busyRef.current = false
        setAdd(null)
        setAnnouncement(`${file.name}을(를) 추가했어요.`)
        onChanged()
        restoreFocus(triggerRef.current, addButtonId)
      },
      () => {
        busyRef.current = false
        setAdd((current) => (current ? { ...current, submitting: false, failed: true } : current))
      },
    )
  }

  const openDelete = (evidence: ActivityEvidence, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setDeleteErrorId(undefined)
    setAnnouncement('')
    setDeleting({ evidence, pending: false })
  }

  const confirmDelete = () => {
    if (!deleting || busyRef.current) return
    busyRef.current = true
    const { evidence } = deleting
    setDeleting({ evidence, pending: true })
    service.removeEvidence(evidence.activityId, evidence.evidenceId).then(
      () => {
        busyRef.current = false
        setDeleting(null)
        setAnnouncement(`${evidence.fileName}을(를) 삭제했어요.`)
        onChanged()
        restoreFocus(null, addButtonId)
      },
      () => {
        // 실패: 파일은 그대로 두고 그 줄에 이유를 보여준다.
        busyRef.current = false
        setDeleting(null)
        setDeleteErrorId(evidence.evidenceId)
        restoreFocus(triggerRef.current, addButtonId)
      },
    )
  }

  const dialogs = (
    <>
      {announcement && (
        <p className="lh-visually-hidden" role="status">
          {announcement}
        </p>
      )}
      {add && (
        <EvidenceAddDialog
          context={`${add.activity.title} · ${activityTypeLabel(add.activity.type)}`}
          file={add.file}
          fileState={fileReader.state}
          onFileSelect={(file) => {
            setAdd({ ...add, file: null, error: undefined, failed: false })
            fileReader.read(file)
          }}
          onFileRemove={() => {
            fileReader.reset()
            setAdd({ ...add, file: null })
          }}
          error={add.error}
          submitting={add.submitting}
          submitFailed={add.failed}
          onSubmit={submitAdd}
          onClose={closeAdd}
        />
      )}
      {preview && (
        <FilePreviewDialog
          fileName={preview.fileName}
          file={preview.file}
          subtitle="활동 자료"
          onClose={() => {
            setPreview(null)
            restoreFocus(triggerRef.current, addButtonId)
          }}
        />
      )}
      {deleting && (
        <EvidenceDeleteDialog
          evidence={deleting.evidence}
          description={`${deleting.evidence.fileName}을(를) 삭제하면 이 활동 기록에서 사라져요.`}
          deleting={deleting.pending}
          onConfirm={confirmDelete}
          onClose={() => {
            if (busyRef.current) return
            setDeleting(null)
            restoreFocus(triggerRef.current, addButtonId)
          }}
        />
      )}
    </>
  )

  return {
    addButtonId,
    openAdd,
    openPreview: (evidence: ActivityEvidence, trigger: HTMLElement) => {
      triggerRef.current = trigger
      setPreview(evidence)
    },
    openDelete,
    deleteErrorId,
    dialogs,
  }
}
