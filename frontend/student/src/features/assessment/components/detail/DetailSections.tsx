import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { getOfficialPlan } from '../../api/evaluationPlansApi.ts'
import { listNoticeFiles, noticeFileBlob, removeNoticeFile, uploadNoticeFile } from '../../api/studentUxApi.ts'
import { toApiError } from '../../api/apiError.ts'
import type { AcademicContext, NoticeFile } from '../../api/types.ts'
import { isAssessmentReadOnlyView } from '../../api/viewMode.ts'
import { formatFileSize } from '../../model/noteEditorModel.ts'
import type { OfficialCriteria } from '../../model/officialCriteria.ts'
import { officialEmptyText } from '../../model/officialEmptyText.ts'
import { useApiQuery, type QueryResult } from '../../model/useApiQuery.ts'
import { useOfficialEnsure } from '../../model/useOfficialEnsure.ts'
import { OfficialDocumentList, OfficialEnsureNotice } from '../official/OfficialDocuments.tsx'
import { ItemTable, ValueText } from '../../routes/EvaluationPlansRoute.tsx'
import { AlertIcon, BookIcon, ClipboardIcon, CloseIcon, FileIcon, ImageIcon } from '../AssessmentIcons.tsx'
import { ErrorState, LoadingRows } from '../StateViews.tsx'
import styles from './detailSections.module.css'

// A27-UX 학생 수행평가 상세(2026-11-19, 이미지 10·11): 안내문·첨부 / 평가계획서 원본 / 평가 기준 / 수행평가 결과물 / 탐구 노트를
// 같은 단계의 Section(같은 제목 크기·굵기·여백·구분선)으로 둔다. 이 파일은 앞의 세 Section이다.

/** 다섯 Section 공통 머리 (제목 16px Bold + 보조 설명 + 오른쪽 동작) */
export function SectionHead({ id, icon, title, count, description, action }: { id: string; icon: ReactNode; title: string; count?: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.head}>
      <div className={styles.headText}>
        <h2 id={id} className={styles.title}>
          {icon}
          {title}
          {count !== undefined && <span className={styles.count}>{count}</span>}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ---- 안내문·첨부 (§12-c 서버 저장) ----

const noticeAccept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png,image/gif,image/webp'

export function NoticeSection({ assessmentId, assessmentTitle }: { assessmentId: string; assessmentTitle: string }) {
  const headingId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const readOnly = isAssessmentReadOnlyView()
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>()
  const files = useApiQuery(readOnly ? 'notice|readonly' : `notice|${assessmentId}|${version}`, () =>
    readOnly ? Promise.resolve({ items: [] as NoticeFile[] }) : listNoticeFiles(assessmentId),
  )

  const upload = async (file: File) => {
    setBusy('upload')
    setError(undefined)
    try {
      await uploadNoticeFile(assessmentId, file)
      setVersion((value) => value + 1)
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(`'${file.name}'을(를) 올리지 못했어요. ${apiError.message}`)
    } finally {
      setBusy(null)
    }
  }
  const remove = async (file: NoticeFile) => {
    setBusy(file.fileId)
    setError(undefined)
    try {
      await removeNoticeFile(assessmentId, file.fileId)
      setVersion((value) => value + 1)
    } catch (cause) {
      setError(`빼지 못했어요. ${toApiError(cause).message}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className={styles.section} aria-labelledby={headingId} data-testid="detail-notice">
      <SectionHead
        id={headingId}
        icon={<ImageIcon size={15} />}
        title="안내문·첨부"
        count={files.data ? files.data.items.length : undefined}
        action={
          !readOnly && (
            <button type="button" className={styles.outlineButton} disabled={busy !== null} onClick={() => inputRef.current?.click()} data-testid="notice-add">
              {busy === 'upload' ? '올리는 중…' : '안내문 추가'}
            </button>
          )
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept={noticeAccept}
        className="lh-visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
        data-testid="notice-input"
      />
      {readOnly ? (
        <p className={styles.empty}>안내문은 학생 개인 파일이라 관리자 보기에서는 보여 주지 않아요.</p>
      ) : files.status === 'error' && files.error ? (
        <ErrorState title="안내문을 불러오지 못했어요" error={files.error} onRetry={files.retry} />
      ) : !files.data ? (
        <LoadingRows rows={1} label="안내문을 불러오는 중" />
      ) : files.data.items.length === 0 ? (
        <p className={styles.empty} data-testid="notice-empty">
          등록된 안내문이 없어요.
        </p>
      ) : (
        <ul className={styles.noticeGrid} aria-label={`${assessmentTitle} 안내문 목록`}>
          {files.data.items.map((file) => (
            <NoticeCard key={file.fileId} assessmentId={assessmentId} file={file} busy={busy === file.fileId} onRemove={() => void remove(file)} />
          ))}
        </ul>
      )}
      {error && (
        <p className={styles.error} role="alert">
          <AlertIcon size={13} />
          {error}
        </p>
      )}
    </section>
  )
}

function NoticeCard({ assessmentId, file, busy, onRemove }: { assessmentId: string; file: NoticeFile; busy: boolean; onRemove: () => void }) {
  const isImage = file.contentType.startsWith('image/')
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked = false
    let objectUrl: string | null = null
    noticeFileBlob(assessmentId, file.fileId).then(
      (blob) => {
        if (revoked) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      },
      () => undefined,
    )
    return () => {
      revoked = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assessmentId, file.fileId])
  return (
    <li className={styles.noticeCard} data-testid="notice-card">
      <a href={url ?? undefined} target="_blank" rel="noreferrer noopener" className={styles.noticeThumb} aria-label={`${file.fileName} 새 탭에서 보기`} aria-disabled={!url}>
        <span className={styles.kind}>{isImage ? '사진' : 'PDF'}</span>
        {isImage && url ? <img src={url} alt="" className={styles.noticeImage} /> : <FileIcon size={26} />}
      </a>
      <span className={styles.noticeName} title={file.fileName}>
        {file.fileName}
      </span>
      <span className={styles.noticeMeta}>{formatFileSize(file.sizeBytes)}</span>
      <button type="button" className={styles.remove} aria-label={`${file.fileName} 빼기`} disabled={busy} onClick={onRemove}>
        <CloseIcon size={13} />
      </button>
    </li>
  )
}

// ---- 평가계획서 원본 (§10-1-3 공식 공개 원문만) ----

export function OfficialSourceSection({ context }: { context: AcademicContext | undefined }) {
  const headingId = useId()
  const { ensure, version } = useOfficialEnsure()
  const query = useApiQuery(context ? `detail-official|${context.academicYear}|${context.semester}|${version}` : 'detail-official|none', () =>
    context ? getOfficialPlan(context.academicYear, context.semester) : Promise.resolve(null),
  )
  const slot = query.data
  return (
    <section className={styles.section} aria-labelledby={headingId} data-testid="detail-official-source">
      <SectionHead
        id={headingId}
        icon={<BookIcon size={15} />}
        title="평가계획서 원본"
        description="학교알리미에 학교가 공식 공개한 원문은 선생님 확인 전에도 볼 수 있어요."
      />
      <OfficialEnsureNotice ensure={ensure} />
      {!context ? (
        <p className={styles.empty}>이 수행평가의 학기 학업 정보를 찾지 못했어요.</p>
      ) : query.status === 'error' && query.error ? (
        <ErrorState title="원본 정보를 불러오지 못했어요" error={query.error} onRetry={query.retry} />
      ) : !slot ? (
        <LoadingRows rows={1} label="원본 정보를 불러오는 중" />
      ) : !slot.contextFound ? (
        <p className={styles.empty} data-testid="official-no-context">
          {slot.academicYear}학년도 {slot.semester}학기 학적 정보가 없어 원본을 찾지 않았어요.
        </p>
      ) : slot.documents.length === 0 ? (
        <p className={styles.empty} data-testid="official-empty">
          {slot.sourceConnected
            ? `${slot.academicYear}학년도 고${slot.grade} ${slot.semester}학기 · ${officialEmptyText(slot, ensure)}`
            : '공식 원본이 아직 확인되지 않았어요. 학교 공식 공개 자료 수집이 연결되면 여기에서 바로 볼 수 있어요.'}
        </p>
      ) : (
        <>
          <p className={styles.empty} data-testid="official-scope">
            {slot.academicYear}학년도 고{slot.grade} {slot.semester}학기 학교알리미 공개 원본 전체예요(과목별로 나누지 않았어요).
          </p>
          <OfficialDocumentList slot={slot} />
        </>
      )}
    </section>
  )
}

// ---- 평가 기준 (관리자 확정·학생 공개값만) ----

export function OfficialCriteriaSection({ query, open, onToggle }: { query: QueryResult<OfficialCriteria>; open: boolean; onToggle: () => void }) {
  const headingId = useId()
  const [showAll, setShowAll] = useState(false)
  const result = query.data
  const body = (() => {
    if (query.status === 'error' && query.error) return <ErrorState title="평가 기준을 불러오지 못했어요" error={query.error} onRetry={query.retry} />
    if (!result) return <LoadingRows rows={2} label="공개된 평가 기준을 찾는 중" />
    if (result.kind === 'noContext') return <p className={styles.empty}>이 수행평가의 학기 학업 정보를 찾지 못했어요.</p>
    if (result.kind === 'none') {
      return (
        <p className={styles.empty} data-testid="criteria-none">
          공개된 평가 기준이 없어요. 선생님이 평가계획서를 확정해 공개하면 여기에 자동으로 보여요.
        </p>
      )
    }
    const { plan, subject, matched } = result
    const others = subject.items.filter((entry) => entry !== matched)
    return (
      <div className={styles.criteria} data-testid="criteria-found">
        <p className={styles.criteriaMeta}>
          {plan.academicYear}학년도 고{plan.grade} {plan.semester}학기 · 선생님이 확정한 값 · 수행평가 반영 <ValueText value={subject.performanceWeight} unit="%" plan={plan} />
        </p>
        {matched ? (
          <>
            <p className={styles.matched}>이 수행평가와 이름이 같은 공개 항목</p>
            <ItemTable title="" items={[matched]} plan={plan} namePrefix="수행평가 항목" />
            {others.length > 0 && (
              <button type="button" className={styles.textButton} onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}>
                {showAll ? '이 과목의 다른 항목 접기' : `이 과목의 다른 공개 항목 ${others.length}개 보기`}
              </button>
            )}
            {showAll && others.length > 0 && <ItemTable title="" items={others} plan={plan} namePrefix="수행평가 항목" />}
          </>
        ) : subject.items.length > 0 ? (
          <>
            <p className={styles.matched} data-testid={result.ambiguous > 1 ? 'criteria-ambiguous' : undefined}>
              {result.ambiguous > 1
                ? `이름이 같은 공개 항목이 ${result.ambiguous}개라 자동으로 연결하지 않았어요 · 학교 안내로 확인 필요`
                : `이 과목에 공개된 수행평가 ${subject.items.length}개 · 이 수행평가와 같은 항목인지는 학교 안내로 확인해 주세요`}
            </p>
            <ItemTable title="" items={subject.items} plan={plan} namePrefix="수행평가 항목" />
          </>
        ) : (
          <p className={styles.empty}>이 과목의 세부 수행평가 항목은 아직 공개되지 않았어요.</p>
        )}
      </div>
    )
  })()
  return (
    <section className={styles.section} aria-labelledby={headingId} data-testid="detail-criteria">
      <SectionHead
        id={headingId}
        icon={<ClipboardIcon size={15} />}
        title="평가 기준"
        description="선생님이 확정해 공개한 평가 기준만 보여요."
        action={
          <button type="button" className={styles.textButton} aria-expanded={open} onClick={onToggle}>
            {open ? '접기' : '펼치기'}
          </button>
        }
      />
      {open && body}
    </section>
  )
}
