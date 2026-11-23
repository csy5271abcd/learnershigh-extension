import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router'
import { getAcademicContext, getAcademicTerms } from '../api/academicContextApi.ts'
import { listFeedbackRequests } from '../api/assessmentDetailApi.ts'
import { listResources } from '../api/resourcesApi.ts'
import { listSchoolAssessments } from '../api/schoolAssessmentApi.ts'
import type { AcademicContext, AcademicTermQuery } from '../api/types.ts'
import {
  ArchiveIcon,
  BookIcon,
  CalendarIcon,
  BooksIcon,
  OpenBookIcon,
  BulbIcon,
  CapIcon,
  ChatIcon,
  ClipboardIcon,
  FolderIcon,
  HomeIcon,
  MenuIcon,
  SproutIcon,
} from '../components/AssessmentIcons.tsx'
import { AddSubjectModal } from '../components/AddSubjectModal.tsx'
import { SidebarSubjects } from '../components/SidebarSubjects.tsx'
import { TermSelector } from '../components/TermSelector.tsx'
import { Toast, type ToastMessage } from '../components/Toast.tsx'
import { isNoAcademicRecord, isSameTerm, parseTermParam, termCandidates, termKey, termLabel } from '../model/academicTerm.ts'
import {
  AssessmentWorkspaceContext,
  type AcademicTerms,
  type AssessmentWorkspace,
  type TermAssessments,
} from '../model/assessmentWorkspace.ts'
import { countBySubject } from '../model/schoolAssessmentView.ts'
import { subjectCandidates } from '../model/subjectName.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import '../styles/assessmentTheme.css'
import styles from './AssessmentLayout.module.css'
import { isMockDataSource } from '../api/dataSource.ts'
import { isAssessmentReadOnlyView } from '../api/viewMode.ts'
import { devPanelEnabled } from '../dev/devContext.ts'

// 개발 서버(http 모드) 전용 시연 학생 전환 패널. Production 번들에서는 import.meta.env.DEV=false라 모듈째 빠진다.
const DevContextSwitcher = import.meta.env.DEV ? lazy(() => import('../dev/DevContextSwitcher.tsx')) : null
import {
  academicInfoPath,
  archiveSection,
  assessmentPath,
  enrichmentSection,
  evaluationPlansPath,
  monthlyPlanPath,
  feedbackSection,
  growthSection,
  tipsSection,
  resourcesSection,
  referenceLinksSection,
  schoolAssessmentsPath,
  subjectAssessmentsPath,
} from './paths.ts'

/** 메뉴 건수 계산용으로 한 학기 전체를 한 번에 조회하는 크기 (Stage 1 가정, 넘으면 건수는 totalElements만 정확) */
const termItemsPageSize = 100

async function loadTerms(): Promise<AcademicTerms> {
  const [current, listed] = await Promise.all([
    getAcademicContext(),
    // A28-29 §9-1-c: 학적이 있는 학기 목록(서버가 확인). 없으면(Mock·이전 서버) null → 3개 학년도 후보를 §9-1 로 하나씩 확인
    getAcademicTerms().then(
      (response) => response.terms,
      () => null,
    ),
  ])
  const currentTerm = { academicYear: current.academicYear, semester: current.semester }
  const others = (listed ?? termCandidates(currentTerm)).filter((term) => !isSameTerm(term, currentTerm))
  const results = await Promise.allSettled(others.map((term) => getAcademicContext(term)))
  const contexts: AcademicContext[] = [current]
  const failedTerms: AcademicTermQuery[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') contexts.push(result.value)
    // 서버 목록에 있던 학기는 어떤 실패든 '불러오지 못한 학기'. 후보로 확인한 학기는 학적 없음(§9-1 400·Mock 404)이면 조용히 뺀다
    else if (listed || !isNoAcademicRecord(result.reason)) failedTerms.push(others[index])
  })
  return { currentTerm, contexts, failedTerms }
}

// Assessment 내부 Layout: 좌측 Assessment 메뉴 + 학기 선택 + 과목 바로가기 (Mockup 공통 Shell, screen-map S1).
// 기존 Student 상단 Navigation은 StudentAppShell이 그대로 그린다.
export function AssessmentLayout() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dataVersion, setDataVersion] = useState(0)
  const [chosenTerm, setChosenTerm] = useState<AcademicTermQuery>()
  const [navOpen, setNavOpen] = useState(false)
  // 2026-11-21 복원(부록 M 요청): 데스크톱 메뉴 전체 접기(부록 E S1)를 없애고 기존 고정 너비 Shell 로 되돌린다.
  // 좁은 화면 Drawer 는 그대로. 예전에 저장된 접힘 기억(lh.assessment.student.sidebarCollapsed)은 읽지 않는다.
  const sidebarRef = useRef<HTMLElement>(null)
  const mobileButtonRef = useRef<HTMLButtonElement>(null)

  const terms = useApiQuery(`terms:${dataVersion}`, loadTerms)
  // A28-34: 고른 학기를 주소(?term=2026-2)에 남겨 새로고침·직접 링크에서도 유지한다. 서버 학기 목록(학적 있는 학기)에 있을 때만 쓰고,
  //   없으면 현재 학기로 보이며 알린다. 다른 메뉴로 옮겨 주소에 값이 없으면 이 탭에서 마지막으로 고른 학기(chosenTerm)를 쓴다.
  const urlTerm = parseTermParam(searchParams.get('term'))
  const urlTermKnown = Boolean(urlTerm && terms.data?.contexts.some((context) => isSameTerm(context, urlTerm)))
  const urlTermRejected = Boolean(searchParams.get('term')) && terms.status === 'success' && !urlTermKnown
  const selectedTerm = (urlTermKnown && urlTerm ? urlTerm : chosenTerm) ?? terms.data?.currentTerm
  const chooseTerm = (term: AcademicTermQuery) => {
    setChosenTerm(term)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('term', termKey(term))
        return next
      },
      { replace: true },
    )
  }
  const selectedContext = terms.data?.contexts.find((context) => selectedTerm && isSameTerm(context, selectedTerm))

  const termAssessments = useApiQuery<TermAssessments>(
    selectedTerm ? `term-items:${termKey(selectedTerm)}:${dataVersion}` : 'term-items:pending',
    () =>
      selectedTerm
        ? listSchoolAssessments({ ...selectedTerm, page: 0, size: termItemsPageSize }).then((response) => ({
            items: response.items,
            totalElements: response.page.totalElements,
          }))
        : // 학기를 알기 전에는 조회하지 않는다 (학기 확인 후 key가 바뀌면 다시 조회).
          new Promise<TermAssessments>(() => {}),
  )

  // 선생님 피드백 메뉴의 "대기 N" (Mockup TF-LIST: 답변 대기 건수). §31 목록의 totalElements에서 계산한다.
  const pendingFeedback = useApiQuery(`feedback-pending:${dataVersion}`, () =>
    listFeedbackRequests({ status: 'PENDING', page: 0, size: 1 }).then((response) => response.page.totalElements),
  )

  // 심화 탐구 메뉴 건수는 2026-11-11 범위 축소로 없앴다(학생 Task가 없는 읽기 전용 참고자료).
  // 자료함 메뉴 건수 = 내 자료 수 (§22 목록 totalElements)
  const myResources = useApiQuery(`resources-count:${dataVersion}`, () =>
    listResources({ page: 0, size: 1 }).then((response) => response.page.totalElements),
  )
  const menuCounts: Record<string, { count: number | undefined; label?: string }> = {
    [resourcesSection.path]: { count: myResources.data },
    [feedbackSection.path]: { count: pendingFeedback.data, label: '대기' },
  }

  const notifyDataChanged = useCallback(() => setDataVersion((value) => value + 1), [])
  // 과목 추가 Modal (2026-10-28): 진입점이 여러 곳이어도 Modal·등록 로직은 여기 하나다. Sidebar overflow에 잘리지 않게 Sidebar 밖에서 그린다.
  const [addSubjectFor, setAddSubjectFor] = useState<AcademicContext>()
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const workspace = useMemo<AssessmentWorkspace>(
    () => ({
      terms,
      selectedTerm,
      selectTerm: setChosenTerm,
      selectedContext,
      termAssessments,
      dataVersion,
      notifyDataChanged,
      requestAddSubject: setAddSubjectFor,
    }),
    [terms, selectedTerm, selectedContext, termAssessments, dataVersion, notifyDataChanged],
  )

  const subjectCounts = termAssessments.data ? countBySubject(termAssessments.data.items) : undefined
  const pathname = location.pathname
  const subjectFilter = pathname === schoolAssessmentsPath ? searchParams.get('subject') : null
  const closeNav = () => setNavOpen(false)

  // 좁은 화면 Drawer: 열리면 첫 항목에 Focus·Tab 가두기·배경 스크롤 잠금, Esc 로 닫고 메뉴 버튼으로 Focus 를 돌려준다
  useEffect(() => {
    if (!navOpen) return
    const sidebar = sidebarRef.current
    const focusables = () =>
      sidebar ? Array.from(sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null) : []
    // 열 때는 visibility 를 바로 보이게 둔다(CSS .sidebarOpen) — 그래서 여기서 바로 Focus 를 옮길 수 있다
    focusables()[0]?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setNavOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const button = mobileButtonRef.current
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      button?.focus()
    }
  }, [navOpen])

  return (
    <AssessmentWorkspaceContext.Provider value={workspace}>
      <div className={`lh-assessment ${styles.root}`} data-sidebar="fixed">
        <div
          className={`${styles.scrim} ${navOpen ? styles.scrimVisible : ''}`}
          aria-hidden="true"
          onClick={closeNav}
        />
        <aside
          id="assessment-sidebar"
          ref={sidebarRef}
          className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`}
          aria-label="Assessment"
        >
          <div className={styles.termArea}>
            <TermSelector terms={terms} selectedTerm={selectedTerm} onSelect={chooseTerm} onNavigate={closeNav} />
            {urlTermRejected && (
              <p className={styles.termNote} role="note" data-testid="term-param-rejected">
                주소의 학기({searchParams.get('term')})는 학적 기록이 없어 현재 학기로 보여요.
              </p>
            )}
          </div>

          <nav className={styles.nav} id="assessment-sidebar-menu" aria-label="Assessment 메뉴">
            <ul className={styles.menu}>
              <MenuLink to={assessmentPath} icon={HomeIcon} active={pathname === assessmentPath} onNavigate={closeNav}>
                홈
              </MenuLink>
              <MenuLink
                to={schoolAssessmentsPath}
                icon={ClipboardIcon}
                active={pathname.startsWith(schoolAssessmentsPath) && !subjectFilter}
                count={termAssessments.data?.totalElements}
                onNavigate={closeNav}
              >
                학교 수행평가
              </MenuLink>
              <MenuLink to={evaluationPlansPath} icon={BookIcon} active={pathname.startsWith(evaluationPlansPath)} onNavigate={closeNav}>
                학교 평가 정보
              </MenuLink>
              <MenuLink to={monthlyPlanPath} icon={CalendarIcon} active={pathname.startsWith(monthlyPlanPath)} onNavigate={closeNav}>
                월별 운영계획
              </MenuLink>
              {pendingMenu.map((item) => (
                <MenuLink
                  key={item.path}
                  to={item.path}
                  icon={item.icon}
                  active={pathname.startsWith(item.path)}
                  count={menuCounts[item.path]?.count}
                  countLabel={menuCounts[item.path]?.label}
                  onNavigate={closeNav}
                >
                  {item.label}
                </MenuLink>
              ))}
            </ul>

            {selectedContext ? (
              // 과목 9개 이하는 기존 목록 그대로, 10개 이상이면 검색·접기 (2026-10-28). 과목 식별은 subjectId로 한다.
              // 학기를 바꿔도 검색어·접힘은 유지하고 새 학기 과목에 다시 적용한다 (없는 과목으로 이동하지 않음).
              <SidebarSubjects
                subjects={selectedContext.subjects}
                onAddSubject={() => setAddSubjectFor(selectedContext)}
                renderSubject={(subject) => (
                  <MenuLink
                    key={subject.subjectId}
                    to={subjectAssessmentsPath(subject.subjectId)}
                    icon={FolderIcon}
                    active={subjectFilter === subject.subjectId}
                    count={subjectCounts?.get(subject.subjectId) ?? (subjectCounts ? 0 : undefined)}
                    onNavigate={closeNav}
                  >
                    {subject.name}
                  </MenuLink>
                )}
              />
            ) : (
              <>
                <p className={styles.groupLabel}>과목</p>
                <p className={styles.groupEmpty}>{terms.status === 'loading' ? '불러오는 중…' : '학업 정보 없음'}</p>
              </>
            )}
          </nav>

          <div className={styles.sidebarFooter}>
            <ul className={styles.menu}>
              <MenuLink
                to={academicInfoPath}
                icon={CapIcon}
                active={pathname.startsWith(academicInfoPath)}
                onNavigate={closeNav}
              >
                학교·학업 정보
              </MenuLink>
            </ul>
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.mobileBar}>
            <button
              type="button"
              ref={mobileButtonRef}
              className={styles.mobileMenuButton}
              aria-controls="assessment-sidebar"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((value) => !value)}
            >
              <MenuIcon size={18} />
              Assessment 메뉴
            </button>
            {selectedContext && <span className={styles.mobileTerm}>{termLabel(selectedContext)}</span>}
          </div>
          <Outlet />
        </div>
        {addSubjectFor && (
          <AddSubjectModal
            context={addSubjectFor}
            candidates={subjectCandidates(terms.data?.contexts ?? [], addSubjectFor)}
            onClose={() => setAddSubjectFor(undefined)}
            onAdded={(subject, origin) => {
              setAddSubjectFor(undefined)
              notifyDataChanged()
              setToast((previous) => ({
                id: (previous?.id ?? 0) + 1,
                tone: 'success',
                text:
                  origin === 'CREATED'
                    ? `'${subject.name}' 과목을 추가했어요. 시연용이라 이 브라우저에만 저장돼요.`
                    : `다른 학기에서 쓰던 '${subject.name}' 과목을 이 학기에 추가했어요.`,
              }))
            }}
          />
        )}
        <Toast message={toast} onDismiss={dismissToast} />
        {DevContextSwitcher && !isMockDataSource && !isAssessmentReadOnlyView() && devPanelEnabled() && (
          <Suspense fallback={null}>
            <DevContextSwitcher kind="student" landingPath="/assessment" />
          </Suspense>
        )}
      </div>
    </AssessmentWorkspaceContext.Provider>
  )
}

// 학교 수행평가 아래 메뉴
const pendingMenu: { path: string; label: string; icon: ComponentType<{ className?: string; size?: number }> }[] = [
  { ...enrichmentSection, icon: BulbIcon },
  { ...feedbackSection, icon: ChatIcon },
  { ...resourcesSection, icon: BooksIcon },
  { ...referenceLinksSection, icon: OpenBookIcon },
  { ...growthSection, icon: SproutIcon },
  { ...archiveSection, icon: ArchiveIcon },
  { ...tipsSection, icon: BulbIcon },
]

interface MenuLinkProps {
  to: string
  icon: ComponentType<{ className?: string; size?: number }>
  active: boolean
  count?: number
  /** 건수 앞 짧은 설명 (예: "대기 2") */
  countLabel?: string
  onNavigate: () => void
  children: ReactNode
}

function MenuLink({ to, icon: Icon, active, count, countLabel, onNavigate, children }: MenuLinkProps) {
  return (
    <li>
      <Link
        to={to}
        className={`${styles.menuItem} ${active ? styles.menuItemActive : ''}`}
        aria-current={active ? 'page' : undefined}
        // 접힌 메뉴(아이콘만)에서도 마우스를 올리면 이름이 보인다. 읽기 이름은 숨김 처리된 글자로 그대로 남는다
        title={typeof children === 'string' ? children : undefined}
        onClick={onNavigate}
      >
        <Icon className={styles.menuIcon} size={17} />
        <span className={styles.menuLabel}>{children}</span>
        {count !== undefined && (
          <span className={styles.menuCount}>
            {countLabel && `${countLabel} `}
            {count}
            <span className="lh-visually-hidden">개</span>
          </span>
        )}
      </Link>
    </li>
  )
}
