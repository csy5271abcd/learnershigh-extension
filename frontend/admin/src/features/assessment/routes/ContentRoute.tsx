import { navigate } from '../../../app/adminLocation.ts'
import styles from '../styles/assessmentAdmin.module.css'
import { paths, type AssessmentRoute } from './paths.ts'
import {
  RetiredContentAction,
  StaticLibraryDetail,
  StaticLibraryView,
  StaticMockExamDetail,
  StaticMockExamListView,
  StaticSourcesView,
  StaticUniversityDetail,
  StaticUniversityListView,
} from './StaticContentRoutes.tsx'

const subTabs = [
  { view: 'tasks', label: '탐구 라이브러리', path: paths.tasks },
  { view: 'mock-exams', label: '모의고사 지문', path: paths.mockExams },
  { view: 'universities', label: '대학별 자료', path: paths.universities },
  { view: 'sources', label: '참고자료원', path: paths.contentSources },
] as const

// 심화 탐구 콘텐츠 (AD-06·09·10, 2026-11-12 읽기 전용 정적 콘텐츠로 전환 — assessment-enrichment-content.md §4).
// Student 심화 탐구와 같은 정적 원천을 읽고 Backend를 호출하지 않는다. 등록·수정·공개·Task 생성 주소는 안내 화면으로 바꿨다.
// 이전 편집 화면 코드(CatalogTaskRoutes·MockExamRoutes·UniversityRoutes)는 사용처 정리(명세 §10) 전이라 지우지 않고 Route에서만 뺐다.
// 관리자 참고자료실(references 탭, 실제 Resource API)은 이 Route와 별개다.
export function ContentRoute({ route, search }: { route: Extract<AssessmentRoute, { tab: 'content' }>; search: URLSearchParams }) {
  switch (route.view) {
    case 'task-edit':
      return route.catalogTaskId ? (
        <StaticLibraryDetail key={route.catalogTaskId} catalogTaskId={route.catalogTaskId} />
      ) : (
        <RetiredContentAction backTo={paths.tasks} backLabel="탐구 라이브러리로" />
      )
    case 'mock-exam-detail':
      return <StaticMockExamDetail key={route.materialId} materialId={route.materialId} />
    case 'mock-exam-edit':
      return <RetiredContentAction backTo={route.materialId ? paths.mockExam(route.materialId) : paths.mockExams} backLabel={route.materialId ? '이 지문 자료 보기' : '모의고사 지문 목록으로'} />
    case 'university-detail':
      return <StaticUniversityDetail key={route.documentId} documentId={route.documentId} search={search} />
    case 'university-ai':
      return <RetiredContentAction backTo={paths.universities} backLabel="대학별 자료 목록으로" />
    default:
      return (
        <>
          <div className={styles.segmentBar}>
            <nav className={styles.segmented} aria-label="심화 탐구 콘텐츠 종류">
              {subTabs.map((tab) => (
                <button key={tab.view} type="button" className={styles.segment} aria-current={route.view === tab.view ? 'page' : undefined} onClick={() => navigate(tab.path)}>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {route.view === 'tasks' && <StaticLibraryView search={search} />}
          {route.view === 'mock-exams' && <StaticMockExamListView search={search} />}
          {route.view === 'universities' && <StaticUniversityListView search={search} />}
          {route.view === 'sources' && <StaticSourcesView search={search} />}
        </>
      )
  }
}
