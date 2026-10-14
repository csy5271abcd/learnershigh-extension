import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { mentorApi } from '../api/mentorApi.ts'
import { Avatar } from '../components/Avatar.tsx'
import { ContentIcon, DiscoverIcon, HomeIcon, QuestionIcon } from '../components/icons.tsx'
import { ToastProvider } from '../components/Toast.tsx'
import { useResource } from '../lib/useResource.ts'
import { CreateLauncher } from './CreateLauncher.tsx'
import styles from './MentorShell.module.css'
import { contentListPath, discoverPath, homePath, profilePath, questionListPath } from './paths.ts'

// Icon은 기본 Outline, 현재 화면에서만 Solid로 바뀐다.
const railItems = [
  { to: homePath, label: '홈', Icon: HomeIcon, end: true },
  { to: contentListPath, label: '내 콘텐츠', Icon: ContentIcon, end: false },
  { to: discoverPath, label: '둘러보기', Icon: DiscoverIcon, end: false },
  { to: questionListPath, label: 'Q&A', Icon: QuestionIcon, end: false },
]

/**
 * Mentor Workspace Shell: 얇은 Global Left Rail + 화면(main) 하나.
 * Secondary Sidebar는 필요한 화면(Workspace Component)만 직접 그린다.
 * Mobile에서는 Rail이 아래 Tab Bar로 바뀐다.
 */
export function MentorShell() {
  // 인증(OD-10)이 없어 현재 Mentor는 Profile 응답에서 가져온다. 실패하면 이름 첫 글자 없이 기본 Avatar를 쓴다.
  const { state: profile } = useResource('profile', () => mentorApi.getProfile())
  const me = profile.status === 'success' ? profile.data : null

  return (
    <ToastProvider>
      <a className={styles.skipLink} href="#main">
        본문으로 건너뛰기
      </a>
      <div className={styles.shell}>
        <aside className={styles.rail} aria-label="Mentor Workspace">
          <Link to={homePath} className={styles.brand} aria-label="LearnersHigh Mentor 홈">
            LH
          </Link>
          <nav className={styles.nav} aria-label="주 메뉴">
            <ul className={styles.navList}>
              {railItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
                  >
                    {({ isActive }) => (
                      <>
                        <item.Icon active={isActive} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
              <li className={styles.createItem}>
                <CreateLauncher itemClassName={styles.item} activeClassName={styles.active} />
              </li>
            </ul>
          </nav>
          <NavLink
            to={profilePath}
            className={({ isActive }) => `${styles.me} ${isActive ? styles.meActive : ''}`}
            aria-label={me ? `내 프로필 (${me.name})` : '내 프로필'}
          >
            <Avatar name={me?.name ?? '나'} imageUrl={me?.profileImageUrl} size={36} decorative />
            <span className={styles.meLabel}>프로필</span>
          </NavLink>
        </aside>
        <main id="main" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </ToastProvider>
  )
}
