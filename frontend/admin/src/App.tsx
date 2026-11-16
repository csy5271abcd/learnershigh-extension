import { useEffect } from 'react'
import { AdminShell, type AdminExtensionEntryId } from './app/AdminShell.tsx'
import { navigate, useAdminLocation } from './app/adminLocation.ts'
import { NoticeState } from './components/AdminUi.tsx'
import ui from './components/AdminUi.module.css'
import { studentCarePath, isStudentCarePath, studentCareX2Path, parentReportPath } from './app/studentCarePaths.ts'
import { VariantX2 } from './features/student-care/variants/x2/VariantX2.tsx'
import { ParentReportFrame } from './features/student-care/variants/x2/ParentReportFrame.tsx'
import { AssessmentAdminRoute } from './features/assessment/routes/AssessmentAdminRoute.tsx'
import { assessmentAdminPath, isAssessmentAdminPath } from './features/assessment/routes/paths.ts'

// Admin Extension App Shell. 주소(pathname)로 화면을 고른다. (Router Library 미확정 → app/adminLocation.ts)
// 실제 Extension 기능은 두 Feature다:
// - 학생 케어(features/student-care, Wangyu): /student-care(시안 X′) + 학부모 리포트 /parent-report. 관리자 기본 화면(/)은 학생 케어다(2026-11-16 사용자 결정).
// - Assessment 관리(features/assessment, Suyeon): /assessment/**
// 구형 Suyeon 관리 화면(Today Board · Feedback Dashboard/Review · Student 360 · Task/Activity 상세 · Connection · Interview · Operations · Mentor)은
// 실제 API 없이 로컬 Fixture로만 동작하던 화면이라 2026-11-16 제거했다(A21 조사, A22). 그 주소는 '페이지 없음'으로 간다.
// 학생 케어는 시안 X′(features/student-care/variants/x2) 하나다. 예전 화면(StudentCarePage·개선안·시안들)은 커밋 77ec091에 남겼다.
const entryPaths: Record<AdminExtensionEntryId, string> = {
  'student-care': studentCarePath,
  'parent-report': parentReportPath,
  assessment: assessmentAdminPath,
}

function App() {
  const location = useAdminLocation()
  const { pathname } = location
  const isRoot = pathname === '/'

  // 기본 주소(/)는 학생 케어 주소로 바꿔 둔다(History를 쌓지 않음). 메뉴 선택 표시·새로고침·공유 주소가 같은 화면을 가리키게 한다.
  useEffect(() => {
    if (!isRoot) return
    window.history.replaceState(window.history.state, '', `${studentCarePath}${location.search}${window.location.hash}`)
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
  }, [isRoot, location.search])

  let current: AdminExtensionEntryId | null = null
  let pageLabel: string
  let page
  if (isRoot || isStudentCarePath(pathname) || pathname === studentCareX2Path) {
    // 학생 케어는 시안 X′ 하나로 정했다(2026-11-12). 폐기한 시안 A–D·Z·Y·X·Z′·표시법·개선안 화면은 커밋 77ec091에 남겨 두었다
    current = 'student-care'
    pageLabel = '학생 케어'
    page = <div className={ui.page}><VariantX2 /></div>
  } else if (pathname === parentReportPath) {
    current = 'parent-report'
    pageLabel = '학부모 리포트'
    page = <div className={ui.page}><ParentReportFrame /></div>
  } else if (isAssessmentAdminPath(pathname)) {
    // Assessment 관리(Suyeon): 하위 화면 분기는 features/assessment/routes가 맡는다
    current = 'assessment'
    pageLabel = 'Assessment 관리'
    page = <AssessmentAdminRoute location={location} />
  } else {
    pageLabel = '페이지 없음'
    page = (
      <div className={ui.page}>
        <NoticeState title="페이지를 찾을 수 없어요." focus>
          <p>주소가 바뀌었거나 더 이상 제공하지 않는 화면이에요.</p>
          <button type="button" className={ui.secondaryButton} onClick={() => navigate(studentCarePath)}>
            학생 케어로 가기
          </button>
        </NoticeState>
      </div>
    )
  }

  return (
    <AdminShell current={current} pageLabel={pageLabel} surface={current === 'assessment' ? 'canvas' : 'plain'} onEntrySelect={(id) => navigate(entryPaths[id])}>
      {page}
    </AdminShell>
  )
}

export default App
