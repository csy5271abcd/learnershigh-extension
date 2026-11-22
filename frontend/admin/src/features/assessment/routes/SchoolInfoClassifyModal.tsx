import { useRef, useState } from 'react'
import { classifySchoolInfoSource, downloadSchoolInfoSource, listSchoolInfoSources } from '../api/assessmentAdminApi.ts'
import type { SchoolInfoSourceItem } from '../api/types.ts'
import { Modal } from '../components/canonicalUi.ts'
import { fileSizeLabel } from '../model/adminFormat.ts'
import { reasonLabel, yearStatusLabel } from '../model/schoolInfoSync.ts'
import { useRemote } from '../model/useRemote.ts'
import review from '../review/review.module.css'
import slots from './planSlots.module.css'

// §38-14 (A27-UX 부록 F): 분류하지 못한 학교알리미 원본.
// ① 출처·학년도 확인 필요 — 관리자가 학년·학기를 골라도 등록할 수 없다(서버가 막는다).
// ② 학년·학기 미분류 — 출처·학년도는 확인됨. 관리자가 학년·학기를 정하면 그 칸들에 등록된다(분석 결과 확정·학생 공개가 아님).

const GRADES = [1, 2, 3]
const SEMESTERS = [1, 2]

export function SchoolInfoClassifyModal({ schoolId, onClose, onChanged }: { schoolId: string; onClose: () => void; onChanged: () => void }) {
  const list = useRemote(() => listSchoolInfoSources(schoolId), [schoolId])
  const closeRef = useRef<HTMLButtonElement>(null)
  const items = list.state.status === 'success' ? list.state.data.items : []
  const groups = {
    CLASSIFICATION: items.filter((i) => i.group === 'CLASSIFICATION'),
    SOURCE_VERIFICATION: items.filter((i) => i.group === 'SOURCE_VERIFICATION'),
    OTHER: items.filter((i) => i.group === 'OTHER'),
    AUTO_ALL_GRADES: items.filter((i) => i.group === 'AUTO_ALL_GRADES'),
  }
  return (
    <Modal
      wide
      title="학교알리미 원본 분류"
      initialFocusRef={closeRef}
      onRequestClose={onClose}
      footer={
        <button type="button" ref={closeRef} className={review.button} onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className={review.dialogBody} data-testid="schoolinfo-classify-dialog">
        <div className={slots.modalStack}>
        <p className={review.muted}>
          학년·학기를 정하는 것은 이 원본이 어느 칸 문서인지 정하는 일이에요. 분석 결과 확정·학생 공개는 &lsquo;분석&rsquo; 탭의 검토·확정 그대로예요.
        </p>
        {list.state.status === 'loading' && <p className={review.muted}>불러오는 중…</p>}
        {list.state.status === 'error' && (
          <p className={slots.syncError} role="alert">
            원본 목록을 불러오지 못했어요. {list.state.error.message}{' '}
            <button type="button" className={slots.textButton} onClick={list.reload}>
              다시 시도
            </button>
          </p>
        )}
        {list.state.status === 'success' && items.length === 0 && <p className={review.muted}>분류할 원본이 없어요.</p>}
        {groups.CLASSIFICATION.length > 0 && (
          <section className={slots.classifyGroup} data-testid="schoolinfo-classify-group-classification">
            <h3>학년·학기 미분류 {groups.CLASSIFICATION.length}개 — 출처·학년도 확인됨</h3>
            {groups.CLASSIFICATION.map((item) => (
              <ClassifyCard
                // 저장 뒤 새 분류 버전이 오면 카드를 새로 만들어 최신 분류로 맞춘다
                key={`${item.sourceFileId}-${item.classification?.version ?? 0}`}
                schoolId={schoolId}
                item={item}
                onSaved={() => {
                  list.reload()
                  onChanged()
                }}
              />
            ))}
          </section>
        )}
        {groups.AUTO_ALL_GRADES.length > 0 && (
          <section className={slots.classifyGroup} data-testid="schoolinfo-classify-group-auto">
            <h3>학년 미표기 → 고1·고2·고3 공통 적용 {groups.AUTO_ALL_GRADES.length}개 — 공시 4월/9월 근거</h3>
            <p className={review.muted}>문서 관리 칸을 정한 것이지 학생 개설 과목을 정한 것이 아니에요. 그 학년 문서가 아니면 평가계획서 칸에서 그 문서를 삭제해 주세요(다시 넣지 않아요).</p>
            <ul className={slots.syncUnresolved}>
              {groups.AUTO_ALL_GRADES.map((item) => (
                <li key={item.sourceFileId} data-testid="schoolinfo-classify-auto-row">
                  <span className={slots.docName} title={item.fileName}>
                    {item.fileName}
                  </span>
                  <span className={slots.historyMeta}>
                    {item.academicYear}학년도 · {item.reason ? reasonLabel(item.reason) : ''} · 연결 칸 {item.linkedSlots.map((s) => `고${s.grade} ${s.semester}학기`).join(', ') || '없음'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {groups.SOURCE_VERIFICATION.length > 0 && (
          <section className={slots.classifyGroup} data-testid="schoolinfo-classify-group-source">
            <h3>출처·학년도 확인 필요 {groups.SOURCE_VERIFICATION.length}개 — 학년·학기를 골라도 등록되지 않아요</h3>
            <ul className={slots.syncUnresolved}>
              {groups.SOURCE_VERIFICATION.map((item) => (
                <li key={item.sourceFileId} data-testid="schoolinfo-classify-source-row">
                  <span className={slots.docName} title={item.fileName}>
                    {item.fileName}
                  </span>
                  <span className={slots.historyMeta}>
                    {item.academicYear}학년도 요청{item.resolvedSourceYear ? ` · 공시연도 ${item.resolvedSourceYear}` : ''} · {yearStatusLabel(item.verification)}
                    {item.reason ? ` · ${reasonLabel(item.reason)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {groups.OTHER.length > 0 && (
          <section className={slots.classifyGroup}>
            <h3>등록 대상이 아닌 파일 {groups.OTHER.length}개</h3>
            <ul className={slots.syncUnresolved}>
              {groups.OTHER.map((item) => (
                <li key={item.sourceFileId}>
                  <span className={slots.docName}>{item.fileName}</span>
                  <span className={slots.historyMeta}>{reasonLabel(item.verification)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        </div>
      </div>
    </Modal>
  )
}

function ClassifyCard({ schoolId, item, onSaved }: { schoolId: string; item: SchoolInfoSourceItem; onSaved: () => void }) {
  const locked = new Set(item.linkedSlots.map((s) => `${s.grade}-${s.semester}`))
  const initialGrades = item.classification?.grades ?? item.evidence.grades
  const initialSemesters = item.classification?.semesters ?? item.evidence.semesters
  const [grades, setGrades] = useState<number[]>(initialGrades)
  const [semesters, setSemesters] = useState<number[]>(initialSemesters)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null)
  const lockedGrade = (g: number) => SEMESTERS.some((s) => locked.has(`${g}-${s}`))
  const lockedSemester = (s: number) => GRADES.some((g) => locked.has(`${g}-${s}`))
  const toggle = (list: number[], value: number) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value].sort())
  const slotsPreview = grades.flatMap((g) => semesters.map((s) => `고${g} ${s}학기${locked.has(`${g}-${s}`) ? '(등록됨)' : ''}`))
  const adds = grades.flatMap((g) => semesters.filter((s) => !locked.has(`${g}-${s}`)))
  const valid = grades.length > 0 && semesters.length > 0 && adds.length > 0
  const download = () =>
    downloadSchoolInfoSource(schoolId, item.sourceFileId).then(
      (blob) => {
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = item.fileName
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
      },
      (cause: Error) => setMessage({ tone: 'error', text: `원본을 내려받지 못했어요. ${cause.message}` }),
    )
  const save = () => {
    setPending(true)
    setMessage(null)
    classifySchoolInfoSource(item.sourceFileId, {
      schoolId,
      academicYear: item.academicYear,
      grades,
      semesters,
      note: note.trim() || null,
      expectedVersion: item.classification?.version ?? 0,
    }).then(
      () => {
        setPending(false)
        setNote('')
        setMessage({ tone: 'ok', text: '분류를 저장하고 칸에 등록했어요. 분석은 서버가 차례로 진행해요.' })
        onSaved()
      },
      (cause: unknown) => {
        setPending(false)
        setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : '분류를 저장하지 못했어요.' })
      },
    )
  }
  return (
    <article className={slots.classifyCard} data-testid="schoolinfo-classify-card">
      <div className={slots.docTop}>
        <span className={slots.docName} title={item.fileName}>
          {item.fileName}
        </span>
        <button type="button" className={slots.textButton} onClick={download} disabled={!item.originalAvailable}>
          원문 내려받기
        </button>
      </div>
      <p className={slots.docMeta}>
        {item.format ?? '형식 미확인'} · {fileSizeLabel(item.sizeBytes)} · {item.academicYear}학년도 · 공시연도 {item.resolvedSourceYear ?? '확인 안 됨'} · {item.reason ? reasonLabel(item.reason) : ''}
      </p>
      <fieldset className={slots.classifyChoices}>
        <legend>학년</legend>
        {GRADES.map((g) => (
          <label key={g}>
            <input type="checkbox" checked={grades.includes(g)} disabled={lockedGrade(g) || pending} onChange={() => setGrades(toggle(grades, g))} data-testid={`classify-grade-${g}`} />
            고{g}
          </label>
        ))}
      </fieldset>
      <fieldset className={slots.classifyChoices}>
        <legend>학기</legend>
        {SEMESTERS.map((s) => (
          <label key={s}>
            <input type="checkbox" checked={semesters.includes(s)} disabled={lockedSemester(s) || pending} onChange={() => setSemesters(toggle(semesters, s))} data-testid={`classify-semester-${s}`} />
            {s}학기
          </label>
        ))}
      </fieldset>
      <label className={slots.selectField}>
        <span>분류 근거 메모(선택)</span>
        <input className={review.input} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="예: 목차 3쪽 '1학기'" data-testid="classify-note" />
      </label>
      <p className={review.muted} data-testid="classify-preview">
        연결될 칸: {slotsPreview.length ? `${item.academicYear}학년도 ${slotsPreview.join(', ')}` : '학년과 학기를 하나 이상 골라 주세요'}
      </p>
      {item.history.length > 0 && (
        <p className={slots.historyMeta} data-testid="classify-history">
          분류 이력 {item.history.length}회 · 최근 v{item.classification?.version} ({item.classification?.decidedBy})
        </p>
      )}
      <div className={slots.docActions}>
        <button type="button" className={review.buttonPrimary} onClick={save} disabled={!valid || pending} aria-busy={pending} data-testid="classify-save" title={valid ? undefined : '새로 더할 칸이 없어요'}>
          {pending ? '저장 중…' : '이 원본 분류 확정'}
        </button>
      </div>
      {message && (
        <p className={message.tone === 'error' ? slots.syncError : review.muted} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </article>
  )
}
