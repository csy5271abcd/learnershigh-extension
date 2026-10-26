import { useCallback, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router'
import { getAcademicContext } from '../api/academicContextApi.ts'
import { listFeedbackRequests } from '../api/assessmentDetailApi.ts'
import { listEnrichmentTasks } from '../api/enrichmentApi.ts'
import { listSchoolAssessments } from '../api/schoolAssessmentApi.ts'
import type { AcademicContext, AcademicTermQuery } from '../api/types.ts'
import {
  ArchiveIcon,
  BooksIcon,
  BulbIcon,
  CapIcon,
  ChatIcon,
  ClipboardIcon,
  FolderIcon,
  HomeIcon,
  MenuIcon,
  SproutIcon,
} from '../components/AssessmentIcons.tsx'
import { TermSelector } from '../components/TermSelector.tsx'
import { isSameTerm, termCandidates, termKey, termLabel } from '../model/academicTerm.ts'
import {
  AssessmentWorkspaceContext,
  type AcademicTerms,
  type AssessmentWorkspace,
  type TermAssessments,
} from '../model/assessmentWorkspace.ts'
import { countBySubject } from '../model/schoolAssessmentView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import '../styles/assessmentTheme.css'
import styles from './AssessmentLayout.module.css'
import {
  academicInfoPath,
  assessmentPath,
  enrichmentSection,
  feedbackSection,
  pendingAssessmentSections,
  schoolAssessmentsPath,
  subjectAssessmentsPath,
} from './paths.ts'

/** 메뉴 건수 계산용으로 한 학기 전체를 한 번에 조회하는 크기 (Stage 1 가정, 넘으면 건수는 totalElements만 정확) */
const termItemsPageSize = 100

async function loadTerms(): Promise<AcademicTerms> {
  const current = await getAcademicContext()
  const currentTerm = { academicYear: current.academicYear, semester: current.semester }
  const others = termCandidates(currentTerm).filter((term) => !isSameTerm(term, currentTerm))
  const results = await Promise.allSettled(others.map((term) => getAcademicContext(term)))
  const contexts: AcademicContext[] = [current]
  const failedTerms: AcademicTermQuery[] = []
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') contexts.push(result.value)
    else failedTerms.push(others[index])
  })
  return { currentTerm, contexts, failedTerms }
}

// Assessment 내부 Layout: 좌측 Assessment 메뉴 + 학기 선택 + 과목 바로가기 (Mockup 공통 Shell, screen-map S1).
// 기존 Student 상단 Navigation은 StudentAppShell이 그대로 그린다.
export function AssessmentLayout() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [dataVersion, setDataVersion] = useState(0)
  const [chosenTerm, setChosenTerm] = useState<AcademicTermQuery>()
  const [navOpen, setNavOpen] = useState(false)

  const terms = useApiQuery(`terms:${dataVersion}`, loadTerms)
  const selectedTerm = chosenTerm ?? terms.data?.currentTerm
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

  // 심화 탐구 메뉴 건수 = 진행 중인 학생 심화 Task 수 (domain.md "Enrichment Active Count"). §18 목록 totalElements에서 계산한다.
  const activeEnrichment = useApiQuery(`enrichment-active:${dataVersion}`, () =>
    listEnrichmentTasks({ status: 'IN_PROGRESS', page: 0, size: 1 }).then((response) => response.page.totalElements),
  )
  const menuCounts: Record<string, { count: number | undefined; label?: string }> = {
    [enrichmentSection.path]: { count: activeEnrichment.data },
    [feedbackSection.path]: { count: pendingFeedback.data, label: '대기' },
  }

  const notifyDataChanged = useCallback(() => setDataVersion((value) => value + 1), [])
  const workspace = useMemo<AssessmentWorkspace>(
    () => ({
      terms,
      selectedTerm,
      selectTerm: setChosenTerm,
      selectedContext,
      termAssessments,
      dataVersion,
      notifyDataChanged,
    }),
    [terms, selectedTerm, selectedContext, termAssessments, dataVersion, notifyDataChanged],
  )

  const subjectCounts = termAssessments.data ? countBySubject(termAssessments.data.items) : undefined
  const pathname = location.pathname
  const subjectFilter = pathname === schoolAssessmentsPath ? searchParams.get('subject') : null
  const closeNav = () => setNavOpen(false)

  return (
    <AssessmentWorkspaceContext.Provider value={workspace}>
      <div className={`lh-assessment ${styles.root}`}>
        <div
          className={`${styles.scrim} ${navOpen ? styles.scrimVisible : ''}`}
          aria-hidden="true"
          onClick={closeNav}
        />
        <aside
          id="assessment-sidebar"
          className={`${styles.sidebar} ${navOpen ? styles.sidebarOpen : ''}`}
          aria-label="Assessment"
        >
          <div className={styles.termArea}>
            <TermSelector terms={terms} selectedTerm={selectedTerm} onSelect={setChosenTerm} onNavigate={closeNav} />
          </div>

          <nav className={styles.nav} aria-label="Assessment 메뉴">
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

            <p className={styles.groupLabel} id="assessment-subject-group">
              과목
            </p>
            {selectedContext && selectedContext.subjects.length > 0 ? (
              <ul className={styles.menu} aria-labelledby="assessment-subject-group">
                {selectedContext.subjects.map((subject) => (
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
                ))}
              </ul>
            ) : (
              <p className={styles.groupEmpty}>
                {terms.status === 'loading' ? '불러오는 중…' : selectedContext ? '등록된 과목이 없어요' : '학업 정보 없음'}
              </p>
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
      </div>
    </AssessmentWorkspaceContext.Provider>
  )
}

// 학교 수행평가 아래 메뉴 (심화 탐구·선생님 피드백 외에는 아직 준비 중 화면)
const pendingMenu: { path: string; label: string; icon: ComponentType<{ className?: string; size?: number }> }[] = [
  { ...enrichmentSection, icon: BulbIcon },
  { ...feedbackSection, icon: ChatIcon },
  { ...pendingAssessmentSections.resources, icon: BooksIcon },
  { ...pendingAssessmentSections.growth, icon: SproutIcon },
  { ...pendingAssessmentSections.archive, icon: ArchiveIcon },
  { ...pendingAssessmentSections.tips, icon: BulbIcon },
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
