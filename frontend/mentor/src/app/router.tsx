import { createBrowserRouter, Navigate } from 'react-router'
import { ContentDetailPage } from '../features/content/ContentDetailPage.tsx'
import { ContentEditPage } from '../features/content/ContentEditPage.tsx'
import { CreatePostPage } from '../features/content/CreatePostPage.tsx'
import { MyContentPage } from '../features/content/MyContentPage.tsx'
import { ReviewPendingPage } from '../features/content/ReviewPendingPage.tsx'
import { ProfileEditPage } from '../features/profile/ProfileEditPage.tsx'
import { ProfilePage } from '../features/profile/ProfilePage.tsx'
import { AnswerPage } from '../features/qna/AnswerPage.tsx'
import { QuestionDetailPage } from '../features/qna/QuestionDetailPage.tsx'
import { QuestionInboxPage } from '../features/qna/QuestionInboxPage.tsx'
import { MentorAppShell } from './MentorAppShell.tsx'
import { NotFoundPage } from './NotFoundPage.tsx'
import { contentListPath } from './paths.ts'

// Data Router를 쓰는 이유: Detail 왕복 시 ScrollRestoration으로 이전 Scroll 위치를 복원하기 위함. (Student App과 같은 방식)
export const mentorRouter = createBrowserRouter([
  {
    element: <MentorAppShell />,
    children: [
      { index: true, element: <Navigate to={contentListPath} replace /> },
      { path: 'content', element: <MyContentPage /> },
      { path: 'content/:contentId', element: <ContentDetailPage /> },
      { path: 'content/:contentId/edit', element: <ContentEditPage /> },
      { path: 'content/:contentId/review-pending', element: <ReviewPendingPage /> },
      { path: 'create', element: <CreatePostPage /> },
      { path: 'questions', element: <QuestionInboxPage /> },
      { path: 'questions/:questionId', element: <QuestionDetailPage /> },
      { path: 'questions/:questionId/answer', element: <AnswerPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/edit', element: <ProfileEditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
