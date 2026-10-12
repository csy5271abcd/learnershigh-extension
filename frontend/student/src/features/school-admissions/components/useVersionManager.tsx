import { useRef, useState } from 'react'
import { VersionFixtureError, type SchoolVersionService } from '../fixtures/schoolVersion.fixture.ts'
import { restoreFocus } from '../model/focus.ts'
import { formatDateTime } from '../model/taskDetail.ts'
import type { TaskVersion } from '../model/types.ts'
import { FilePreviewDialog } from './EvidenceDialogs.tsx'

/** 다시 시도 결과 안내 (Version별). 기술 오류 코드는 학생에게 보여주지 않는다. */
export interface AiRetryNotice {
  versionId: string
  message: string
  /** 이 Version은 더 이상 다시 시도할 수 없다. (AI_ANALYSIS_RETRY_NOT_ALLOWED / VERSION_NOT_FOUND) */
  blocked: boolean
}

const retryMessage = (error: unknown): Omit<AiRetryNotice, 'versionId'> => {
  const code = error instanceof VersionFixtureError ? error.code : undefined
  switch (code) {
    case 'AI_ANALYSIS_ALREADY_PROCESSING':
      return { message: '이미 AI 사전 점검을 진행하고 있어요. 끝나면 이 화면에서 결과를 보여드릴게요.', blocked: true }
    case 'AI_ANALYSIS_RETRY_NOT_ALLOWED':
      return { message: '지금은 다시 시도할 수 없어요. 학원에서 확인한 뒤 알려드릴게요.', blocked: true }
    case 'VERSION_NOT_FOUND':
      return { message: '이 버전을 찾지 못했어요. 화면을 새로 불러온 뒤 다시 확인해주세요.', blocked: true }
    default:
      return { message: '다시 시도하지 못했어요. 잠시 후 다시 시도해주세요.', blocked: false }
  }
}

const nowHeadingId = 'task-now-heading'

// AI 사전 점검 다시 시도 / Version 미리보기 흐름 (Task Detail). Version 제출은 Route의 Modal(?version=submit)이 맡는다.
// 성공하면 onChanged로 화면이 Canonical Version을 다시 읽는다. 다시 시도 후에는 바뀐 분석 중 안내로 Focus를 옮긴다.
export function useVersionManager({ service, onChanged }: { service: SchoolVersionService; onChanged: () => void }) {
  const [preview, setPreview] = useState<TaskVersion | null>(null)
  const [retryingId, setRetryingId] = useState<string>()
  const [retryNotice, setRetryNotice] = useState<AiRetryNotice>()
  const [announcement, setAnnouncement] = useState('')
  const triggerRef = useRef<HTMLElement | null>(null)
  const busyRef = useRef(false)

  /**
   * 실패한 AI 사전 점검을 같은 Version으로 다시 시도한다. (새 Version을 만들지 않는다)
   * focusId: 다시 시도한 뒤 Focus를 옮길 곳 (지금 할 일 제목 / 피드백 Tab의 AI 사전 점검 제목)
   */
  const retry = (version: TaskVersion, focusId: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setRetryingId(version.versionId)
    setRetryNotice(undefined)
    setAnnouncement('')
    service.retryAnalysis(version.taskId, version.versionId).then(
      () => {
        busyRef.current = false
        setRetryingId(undefined)
        setAnnouncement(`${version.label} AI 사전 점검을 다시 시작했어요.`)
        onChanged()
        restoreFocus(null, focusId)
      },
      (error: unknown) => {
        busyRef.current = false
        setRetryingId(undefined)
        setRetryNotice({ versionId: version.versionId, ...retryMessage(error) })
        // 이미 분석 중으로 바뀌었을 수 있어 다시 읽는다.
        onChanged()
      },
    )
  }

  const openPreview = (version: TaskVersion, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setPreview(version)
  }

  const dialogs = (
    <>
      {/* 다시 시도 결과 안내. 기다림 화면에 빈 live region을 두지 않도록 안내가 있을 때만 그린다. */}
      {announcement && (
        <p className="lh-visually-hidden" role="status">
          {announcement}
        </p>
      )}
      {preview && (
        <FilePreviewDialog
          fileName={preview.fileName}
          file={preview.file}
          subtitle={`${preview.label} · ${formatDateTime(preview.submittedAt)} 제출`}
          onClose={() => {
            setPreview(null)
            restoreFocus(triggerRef.current, nowHeadingId)
          }}
        />
      )}
    </>
  )

  return { retry, retryingId, retryNotice, openPreview, dialogs }
}
