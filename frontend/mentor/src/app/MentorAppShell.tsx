import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { mentorApi } from '../api/mentorApi.ts'
import { ToastProvider } from '../components/Toast.tsx'
import { useResource } from '../lib/useResource.ts'
import styles from './MentorAppShell.module.css'
import { contentListPath, createPath, profilePath, questionListPath } from './paths.ts'

const navItems = [
  { to: contentListPath, label: '내 콘텐츠' },
  { to: questionListPath, label: 'Q&A' },
  { to: profilePath, label: '프로필' },
]

// Mentor Surface Shell: Header Navigation + 화면 하나(main) + Scroll 복원.
// 화면 Component는 <main>을 만들지 않는다. (페이지마다 main 하나)
export function MentorAppShell() {
  // 인증(OD-10)이 없어 Header 이름은 현재 Mentor Profile 응답에서 가져온다. 실패하면 이름 없이 둔다.
  const { state: profile } = useResource('profile', () => mentorApi.getProfile())

  return (
    <ToastProvider>
      <a className={styles.skipLink} href="#main">
        본문으로 건너뛰기
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link to={contentListPath} className={styles.brand}>
            LEARNERS HIGH <span className={styles.surface}>Mentor</span>
          </Link>
          <nav className={styles.nav} aria-label="Mentor 메뉴">
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.end}>
            <NavLink to={createPath} className={({ isActive }) => `${styles.create} ${isActive ? styles.createActive : ''}`}>
              새 글 쓰기
            </NavLink>
            {profile.status === 'success' && <span className={styles.user}>{profile.data.name} 멘토</span>}
          </div>
        </div>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </ToastProvider>
  )
}
