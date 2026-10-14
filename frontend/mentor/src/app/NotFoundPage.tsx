import { Link } from 'react-router'
import { NotFoundState } from '../components/PageState.tsx'
import { PageTitle } from '../components/PageTitle.tsx'
import ui from '../components/ui.module.css'
import { contentListPath } from './paths.ts'

export function NotFoundPage() {
  return (
    <div className={ui.page}>
      <div className={ui.pageHeader}>
        <PageTitle>페이지를 찾을 수 없어요</PageTitle>
      </div>
      <NotFoundState title="주소가 바뀌었거나 없는 화면이에요.">
        <Link to={contentListPath} className={`${ui.button} ${ui.neutral}`}>
          내 콘텐츠로 가기
        </Link>
      </NotFoundState>
    </div>
  )
}
