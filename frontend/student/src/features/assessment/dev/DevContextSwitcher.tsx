import { useEffect, useId, useMemo, useRef, useState } from 'react'
import roster from './demoContextRoster.json'
import { configuredDevContextId, devContextId, isDevContextOverridden, switchDevContext, type DevContextKind } from './devContext.ts'
import styles from './devContextSwitcher.module.css'

// 개발 서버 전용 시연 Context 선택 패널 (Student: 학생 / Admin: 관리자). 실제 로그인 화면이 아니다(API-OD-A01).
// 호출 측이 import.meta.env.DEV에서만 동적 import로 그린다 → Production 번들에 이 파일·명단이 들어가지 않는다.
// 고른 ID의 권한은 서버가 그대로 검사한다(학생 본인 자료 / 관리자 담당 지점). 전환하면 시작 화면을 새로 불러온다.

interface Props {
  kind: DevContextKind
  /** 전환 후 이동할 시작 화면 (이전 학생·관리자 상세 URL에 머물지 않게) */
  landingPath: string
}

export default function DevContextSwitcher({ kind, landingPath }: Props) {
  const [open, setOpen] = useState(false)
  const current = devContextId(kind)
  const configured = configuredDevContextId(kind)
  const overridden = isDevContextOverridden(kind)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const firstFieldRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (!open) return
    firstFieldRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const currentLabel =
    kind === 'student'
      ? (() => {
          const s = roster.students.find((item) => item.studentId === current)
          return s ? `${s.displayName} · ${s.schoolName} ${s.grade}학년` : (current ?? '미설정')
        })()
      : (() => {
          const a = roster.admins.find((item) => item.adminId === current)
          return a ? `${a.adminId} · ${a.label}` : (current ?? '미설정')
        })()

  return (
    <div className={styles.root} data-testid="dev-context-switcher">
      {open && (
        <div id={panelId} className={styles.panel} role="dialog" aria-label={kind === 'student' ? '시연 학생 전환' : '시연 관리자 전환'}>
          <p className={styles.caution}>
            개발 서버 전용 · <strong>실제 로그인 아님</strong> · 고른 계정의 권한은 서버가 그대로 검사해요. 전환하면 화면을 새로 불러와요.
          </p>
          {kind === 'student' ? (
            <StudentPicker current={current} firstFieldRef={firstFieldRef} onApply={(id) => switchDevContext('student', id, landingPath)} />
          ) : (
            <AdminPicker current={current} firstFieldRef={firstFieldRef} onApply={(id) => switchDevContext('admin', id, landingPath)} />
          )}
          {overridden && (
            <button type="button" className={styles.linkButton} onClick={() => switchDevContext(kind, null, landingPath)}>
              실행 설정({configured ?? '없음'})으로 되돌리기
            </button>
          )}
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.badge}>개발용</span>
        {kind === 'student' ? '시연 학생' : '시연 관리자'}: {currentLabel}
      </button>
    </div>
  )
}

function StudentPicker({ current, firstFieldRef, onApply }: { current: string | null; firstFieldRef: React.RefObject<HTMLSelectElement | null>; onApply: (id: string) => void }) {
  const ids = { branch: useId(), school: useId(), grade: useId(), student: useId() }
  const initial = roster.students.find((s) => s.studentId === current)
  const [branchId, setBranchId] = useState(initial?.branchId ?? roster.branches[0].branchId)
  const [schoolName, setSchoolName] = useState(initial?.schoolName ?? '')
  const [grade, setGrade] = useState(initial ? String(initial.grade) : '')
  const inBranch = useMemo(() => roster.students.filter((s) => s.branchId === branchId), [branchId])
  const schools = useMemo(() => [...new Set(inBranch.map((s) => s.schoolName))], [inBranch])
  const candidates = inBranch.filter((s) => (!schoolName || s.schoolName === schoolName) && (!grade || String(s.grade) === grade))
  const [studentId, setStudentId] = useState(initial?.studentId ?? '')
  const selected = candidates.find((s) => s.studentId === studentId) ?? candidates[0]

  return (
    <div className={styles.fields}>
      <label htmlFor={ids.branch}>지점</label>
      <select
        ref={firstFieldRef}
        id={ids.branch}
        value={branchId}
        onChange={(event) => {
          setBranchId(event.target.value)
          setSchoolName('')
          setGrade('')
          setStudentId('')
        }}
      >
        {roster.branches.map((b) => (
          <option key={b.branchId} value={b.branchId}>
            {b.name}
          </option>
        ))}
      </select>
      <label htmlFor={ids.school}>학교</label>
      <select id={ids.school} value={schoolName} onChange={(event) => setSchoolName(event.target.value)}>
        <option value="">전체 학교</option>
        {schools.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <label htmlFor={ids.grade}>학년</label>
      <select id={ids.grade} value={grade} onChange={(event) => setGrade(event.target.value)}>
        <option value="">전체 학년</option>
        {[1, 2, 3].map((g) => (
          <option key={g} value={String(g)}>
            {g}학년
          </option>
        ))}
      </select>
      <label htmlFor={ids.student}>학생</label>
      <select id={ids.student} value={selected?.studentId ?? ''} onChange={(event) => setStudentId(event.target.value)} disabled={candidates.length === 0}>
        {candidates.length === 0 && <option value="">해당 학생 없음</option>}
        {candidates.map((s) => (
          <option key={s.studentId} value={s.studentId}>
            {s.displayName} · {s.schoolName} {s.grade}학년 ({s.studentId})
          </option>
        ))}
      </select>
      <button type="button" className={styles.apply} disabled={!selected || selected.studentId === current} onClick={() => selected && onApply(selected.studentId)}>
        이 학생으로 보기
      </button>
    </div>
  )
}

function AdminPicker({ current, firstFieldRef, onApply }: { current: string | null; firstFieldRef: React.RefObject<HTMLSelectElement | null>; onApply: (id: string) => void }) {
  const id = useId()
  const [adminId, setAdminId] = useState(current ?? roster.admins[0].adminId)
  const selected = roster.admins.find((a) => a.adminId === adminId)
  return (
    <div className={styles.fields}>
      <label htmlFor={id}>관리자</label>
      <select ref={firstFieldRef} id={id} value={adminId} onChange={(event) => setAdminId(event.target.value)}>
        {roster.admins.map((a) => (
          <option key={a.adminId} value={a.adminId}>
            {a.adminId} · {a.label}
          </option>
        ))}
      </select>
      {selected && <p className={styles.scope}>범위: {selected.scope}</p>}
      <button type="button" className={styles.apply} disabled={!selected || adminId === current} onClick={() => onApply(adminId)}>
        이 관리자로 보기
      </button>
    </div>
  )
}
