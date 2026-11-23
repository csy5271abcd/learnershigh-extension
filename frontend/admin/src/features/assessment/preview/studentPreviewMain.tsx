import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Student 앱과 같은 기본 Style(Token·body·리셋)을 그대로 쓴다 (Student 파일을 import만 하고 고치지 않는다)
import '../../../../../student/src/index.css'
import { StudentPreviewRoot } from './StudentPreviewRoot.tsx'
import './studentPreview.css'

// Admin "학생 Desktop 화면 미리보기" iframe 안 페이지.
// - iframe의 창 폭이 Student Desktop 폭(1600px)이라 Student의 @media·@container·100dvh 규칙이 Student 앱 Desktop과 같은 조건으로 계산된다.
//   부모 Admin 화면이 이 iframe 전체를 축소해서 보여준다 (Student 코드 수정 없음).
// - 학생 기록은 부모 Admin 화면이 담당 범위 검사 뒤 postMessage로 넘긴 것만 쓴다. 이 페이지는 혼자 열면 아무것도 그리지 않는다.
// - Student 화면은 읽기 전용 모드로만 그린다 (쓰기 API는 viewMode Guard가 403으로 막는다).

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudentPreviewRoot />
  </StrictMode>,
)
