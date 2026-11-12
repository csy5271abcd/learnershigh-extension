// 생활 레포트 칸 머리에 쓰는 선 아이콘(장식, 읽기 도구는 건너뜀)
import type { ReactNode } from 'react'
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const wrap = (d: ReactNode, size = 22) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P}>{d}</svg>

export const Ico = {
  cal: (s?: number) => wrap(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>, s),
  check: (s?: number) => wrap(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM9 13l2 2 4-4" /></>, s),
  clip: (s?: number) => wrap(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM9 11h6M9 15h4" /></>, s),
  book: (s?: number) => wrap(<path d="M3 5.5C5 4.5 8 4.5 12 6.5c4-2 7-2 9-1v13c-2-1-5-1-9 1-4-2-7-2-9-1z M12 6.5v13" />, s),
  clock: (s?: number) => wrap(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>, s),
  enter: (s?: number) => wrap(<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M4 12h11M11 8l4 4-4 4" />, s),
  alert: (s?: number) => wrap(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5M12 16v.5" /></>, s),
  warn: (s?: number) => wrap(<path d="M12 3.5 21.5 20h-19zM12 10v4.5M12 17v.5" />, s),
  target: (s?: number) => wrap(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>, s),
  eye: (s?: number) => wrap(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>, s),
  phone: (s?: number) => wrap(<><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></>, s),
  sleep: (s?: number) => wrap(<path d="M4 14h5l-5 6h5M13 5h4l-4 5h4M18 13h3l-3 4h3" />, s),
  away: (s?: number) => wrap(<><circle cx="14" cy="4.5" r="1.8" /><path d="M9 21l3-6 3 2v5M7 12l3-4 4 1 2 4 3 1M10 8l-2 5" /></>, s),
  people: (s?: number) => wrap(<><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3 3-5 5.5-5s5 2 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14c2.5 0 4.2 1.6 4.5 4.5" /></>, s),
  flag: (s?: number) => wrap(<path d="M5 21V4M5 4h11l-2 4 2 4H5" />, s),
  chat: (s?: number) => wrap(<path d="M4 5h16v11H9l-5 4z" />, s),
  bars: (s?: number) => wrap(<path d="M6 20V12M12 20V6M18 20v-9" />, s),
  crown: (s?: number) => wrap(<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />, s),
}
