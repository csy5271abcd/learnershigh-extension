import { createBrowserRouter } from 'react-router'
import { ContentDetailPage } from '../features/content/ContentDetailPage.tsx'
import { ContentEditPage } from '../features/content/ContentEditPage.tsx'
import { CreatePostPage } from '../features/content/CreatePostPage.tsx'
import { MyContentPage } from '../features/content/MyContentPage.tsx'
import { ReviewPendingPage } from '../features/content/ReviewPendingPage.tsx'
import { DiscoverContentPage } from '../features/discover/DiscoverContentPage.tsx'
import { DiscoverPage } from '../features/discover/DiscoverPage.tsx'
import { MentorPublicProfilePage } from '../features/discover/MentorPublicProfilePage.tsx'
import { HomePage } from '../features/home/HomePage.tsx'
import { ProfileEditPage } from '../features/profile/ProfileEditPage.tsx'
import { ProfilePage } from '../features/profile/ProfilePage.tsx'
import { AnswerPage } from '../features/qna/AnswerPage.tsx'
import { QuestionDetailPage } from '../features/qna/QuestionDetailPage.tsx'
import { QuestionInboxPage } from '../features/qna/QuestionInboxPage.tsx'
import { MentorShell } from './MentorShell.tsx'
import { NotFoundPage } from './NotFoundPage.tsx'

// Data Router를 쓰는 이유: Detail 왕복 시 ScrollRestoration으로 이전 Scroll 위치를 복원하기 위함. (Student App과 같은 방식)
export const mentorRouter = createBrowserRouter([
  {
    element: <MentorShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'content', element: <MyContentPage /> },
      { path: 'content/:contentId', element: <ContentDetailPage /> },
      { path: 'content/:contentId/edit', element: <ContentEditPage /> },
      { path: 'content/:contentId/review-pending', element: <ReviewPendingPage /> },
      { path: 'create', element: <CreatePostPage /> },
      { path: 'discover', element: <DiscoverPage /> },
      { path: 'discover/content/:contentId', element: <DiscoverContentPage /> },
      { path: 'discover/mentors/:mentorId', element: <MentorPublicProfilePage /> },
      { path: 'questions', element: <QuestionInboxPage /> },
      { path: 'questions/:questionId', element: <QuestionDetailPage /> },
      { path: 'questions/:questionId/answer', element: <AnswerPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/edit', element: <ProfileEditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
