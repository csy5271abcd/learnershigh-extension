import { useRef, useState } from 'react'
import type { SchoolFinalService } from '../fixtures/schoolFinalArtifact.fixture.ts'
import { restoreFocus } from '../model/focus.ts'
import type { TaskFinalArtifact, TaskVersion } from '../model/types.ts'
import { FilePreviewDialog } from './EvidenceDialogs.tsx'
import { FinalSubmitDialog } from './FinalArtifactParts.tsx'

const nowHeadingId = 'task-now-heading'

// 최종 제출 확인 / 최종 결과물 미리보기 / 학부모 공유 동의 흐름 (Task Detail).
// 저장이 끝난 뒤에 화면을 바꾼다. 저장 중에는 같은 요청을 다시 보내지 않는다.
export function useFinalManager({ service, onChanged }: { service: SchoolFinalService; onChanged: () => void }) {
  const [confirm, setConfirm] = useState<{ taskId: string; version: TaskVersion; submitting: boolean; failed: boolean } | null>(null)
  const [preview, setPreview] = useState<TaskFinalArtifact | null>(null)
  const [sharePending, setSharePending] = useState(false)
  const [shareFailed, setShareFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const triggerRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)

  const openConfirm = (taskId: string, version: TaskVersion, trigger: HTMLElement | null) => {
    triggerRef.current = trigger
    setAnnouncement('')
    setConfirm({ taskId, version, submitting: false, failed: false })
  }

  const closeConfirm = () => {
    if (busyRef.current) return
    setConfirm(null)
    restoreFocus(triggerRef.current, nowHeadingId)
  }

  const submit = () => {
    if (!confirm || busyRef.current) return
    busyRef.current = true
    setConfirm({ ...confirm, submitting: true, failed: false })
    service.finalize(confirm.taskId).then(
      () => {
        busyRef.current = false
        setConfirm(null)
        setAnnouncement('최종 제출했어요. 수행평가를 완료했어요.')
        onChanged()
        // 최종 제출 버튼은 사라지고 지금 할 일이 완료로 바뀐다 → 지금 할 일 제목으로
        restoreFocus(null, nowHeadingId)
      },
      () => {
        // 실패: 단계 · 결과물은 그대로. 창을 유지하고 다시 시도할 수 있다.
        busyRef.current = false
        setConfirm((current) => (current ? { ...current, submitting: false, failed: true } : current))
      },
    )
  }

  const changeShare = (taskId: string, consented: boolean) => {
    if (busyRef.current) return
    busyRef.current = true
    setSharePending(true)
    setShareFailed(false)
    service.setParentShare(taskId, consented).then(
      () => {
        busyRef.current = false
        setSharePending(false)
        onChanged()
      },
      () => {
        busyRef.current = false
        setSharePending(false)
        setShareFailed(true)
      },
    )
  }

  const openPreview = (artifact: TaskFinalArtifact, trigger: HTMLElement | null) => {
    triggerRef.current = trigger
    setPreview(artifact)
  }

  const dialogs = (
    <>
      {announcement && (
        <p className="lh-visually-hidden" role="status">
          {announcement}
        </p>
      )}
      {confirm && (
        <FinalSubmitDialog
          version={confirm.version}
          submitting={confirm.submitting}
          failed={confirm.failed}
          onConfirm={submit}
          onClose={closeConfirm}
        />
      )}
      {preview && (
        <FilePreviewDialog
          fileName={preview.fileName}
          file={preview.file}
          subtitle={`최종 결과물 · ${preview.sourceVersionLabel} 최종본`}
          onClose={() => {
            setPreview(null)
            restoreFocus(triggerRef.current, nowHeadingId)
          }}
        />
      )}
    </>
  )

  return { openConfirm, openPreview, changeShare, sharePending, shareFailed, dialogs }
}
