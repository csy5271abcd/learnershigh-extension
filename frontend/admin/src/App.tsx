import { StudentCarePage } from './features/student-care/StudentCarePage.tsx'

// 개발용 App Shell이다. Product 화면이 아니며 Feature는 src/features/<feature>/에 추가한다.
// 실제 Admin 콘솔에서는 학습관리 › [지점]학생 케어 메뉴에 연결된다.
function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-header__product">LearnersHigh Admin</p>
        <div>
          <h1 className="app-header__title">학생 케어</h1>
          <p className="app-header__breadcrumb">학습관리 › [지점]학생 케어</p>
        </div>
      </header>
      <StudentCarePage />
    </div>
  )
}

export default App
