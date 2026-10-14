// Mentor Workspace Icon (inline SVG, 새 Icon Library 없이). 장식이므로 aria-hidden이고, 이름은 옆 글자나 aria-label이 맡는다.
//
// 스타일 (references/daglo의 Icon 표현 방식만 참고, Asset은 직접 그림):
// - Rail Icon: 기본은 Outline, 현재 화면(active)은 Solid. Solid 안쪽 구멍은 Active 배경색으로 칠한다.
// - Glyph: 원형 Tile 안에 들어가는 다색 Icon. 색은 index.css의 --lh-glyph-* Token만 쓴다.

import type { ReactNode } from 'react'
import type { MentorContentType } from '../api/types.ts'
import tileStyles from './IconTile.module.css'

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Solid Icon 안쪽 구멍 / 선 색 (Active 배경과 같다) */
const HOLE = 'var(--lh-color-rail-active)'

interface RailIconProps {
  active?: boolean
}

export const HomeIcon = ({ active = false }: RailIconProps) => (
  <Icon>
    {active ? (
      <path d="M3.6 10.2 12 3.4l8.4 6.8V19.3c0 .9-.7 1.7-1.6 1.7h-4.2v-5.7H9.4V21H5.2c-.9 0-1.6-.8-1.6-1.7z" fill="currentColor" stroke="none" />
    ) : (
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    )}
  </Icon>
)

export const ContentIcon = ({ active = false }: RailIconProps) => (
  <Icon>
    {active ? (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" fill="currentColor" stroke="none" />
        <path d="M8 9h8M8 12.5h8M8 16h5" stroke={HOLE} strokeWidth={1.9} />
      </>
    ) : (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    )}
  </Icon>
)

export const DiscoverIcon = ({ active = false }: RailIconProps) => (
  <Icon>
    {active ? (
      <>
        <circle cx="12" cy="12" r="8.6" fill="currentColor" stroke="none" />
        <path d="m15.6 8.4-2.2 5-5 2.2 2.2-5z" fill={HOLE} stroke={HOLE} strokeWidth={1.2} />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m15.5 8.5-2 5-5 2 2-5z" />
      </>
    )}
  </Icon>
)

export const QuestionIcon = ({ active = false }: RailIconProps) => (
  <Icon>
    {active ? (
      <>
        <path d="M5 4.4h14c.9 0 1.6.7 1.6 1.6v9c0 .9-.7 1.6-1.6 1.6h-7.8l-4.4 3.8v-3.8H5c-.9 0-1.6-.7-1.6-1.6V6c0-.9.7-1.6 1.6-1.6z" fill="currentColor" stroke="none" />
        <path d="M10 8.9a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9v.2M12 13.9h.01" stroke={HOLE} strokeWidth={1.9} />
      </>
    ) : (
      <>
        <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
        <path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9v.2M12 14h.01" />
      </>
    )}
  </Icon>
)

export const CreateIcon = ({ active = false }: RailIconProps) => (
  <Icon>
    {active ? (
      <>
        <circle cx="12" cy="12" r="8.6" fill="currentColor" stroke="none" />
        <path d="M12 8.3v7.4M8.3 12h7.4" stroke={HOLE} strokeWidth={2} />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>
    )}
  </Icon>
)

export const SearchIcon = () => (
  <Icon size={18}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
)

export const SidebarIcon = () => (
  <Icon size={18}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M9.5 5v14" />
  </Icon>
)

export const PlusIcon = () => (
  <Icon size={18}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

/** 작은 단색 유형 Icon (목록의 유형 Label 옆) */
export const TypeIcon = ({ type, size = 14 }: { type: MentorContentType; size?: number }) => {
  switch (type) {
    case 'PLAN':
      return (
        <Icon size={size}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M9 3v4M15 3v4" />
        </Icon>
      )
    case 'ROUTINE':
      return (
        <Icon size={size}>
          <path d="M5 12a7 7 0 0 1 12-4.9L19 9M19 4v5h-5" />
          <path d="M19 12a7 7 0 0 1-12 4.9L5 15M5 20v-5h5" />
        </Icon>
      )
    case 'STORY':
      return (
        <Icon size={size}>
          <path d="M4 6.5C6.5 5 9.5 5 12 6.5 14.5 5 17.5 5 20 6.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z" />
          <path d="M12 6.5V19" />
        </Icon>
      )
    case 'RECORD':
      return (
        <Icon size={size}>
          <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z" />
          <path d="M14 3.5V8h4M9 12h6M9 15.5h6" />
        </Icon>
      )
    case 'CASE':
      return (
        <Icon size={size}>
          <path d="m12 4 8 4-8 4-8-4z" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
        </Icon>
      )
  }
}

// ---------- 다색 Glyph (원형 Tile 안) ----------

function Glyph({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

const color = (name: string) => `var(--lh-glyph-${name})`
const tint = (name: string) => `var(--lh-glyph-${name}-tint)`
const PAPER = 'var(--lh-glyph-paper)'

/** Content 유형 Glyph: Plan 달력 · Routine 반복 · Story 책 · Record 기록지 · Case 쌓인 단계 */
export const TypeGlyph = ({ type, size }: { type: MentorContentType; size?: number }) => {
  switch (type) {
    case 'PLAN':
      return (
        <Glyph size={size}>
          <rect x="5" y="7" width="22" height="20" rx="4" fill={tint('plan')} />
          <path d="M5 11a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v2H5z" fill={color('plan')} />
          <rect x="10" y="4.5" width="2.6" height="6" rx="1.3" fill={color('plan')} />
          <rect x="19.4" y="4.5" width="2.6" height="6" rx="1.3" fill={color('plan')} />
          <rect x="9.5" y="16.5" width="4" height="3.4" rx="1" fill={color('plan')} />
          <rect x="15" y="16.5" width="4" height="3.4" rx="1" fill={PAPER} />
          <rect x="9.5" y="21.6" width="4" height="3.4" rx="1" fill={PAPER} />
        </Glyph>
      )
    case 'ROUTINE':
      return (
        <Glyph size={size}>
          <circle cx="16" cy="16" r="11" fill={tint('routine')} />
          <path d="M9.6 14.4a6.6 6.6 0 0 1 11.3-3.6" stroke={color('routine')} strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M22.4 17.6a6.6 6.6 0 0 1-11.3 3.6" stroke={color('routine')} strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="m23.4 7.6-.2 5.4-5.2-1.1z" fill={color('routine')} />
          <path d="m8.6 24.4.2-5.4 5.2 1.1z" fill={color('routine')} />
        </Glyph>
      )
    case 'STORY':
      return (
        <Glyph size={size}>
          <path d="M4.5 8.5c3.8-1.8 7.6-1.6 11.5.6V26c-3.9-2.2-7.7-2.4-11.5-.6z" fill={color('story')} />
          <path d="M27.5 8.5c-3.8-1.8-7.6-1.6-11.5.6V26c3.9-2.2 7.7-2.4 11.5-.6z" fill={tint('story')} />
          <path d="M19 12.5c2.2-.8 4.4-.8 6 0M19 16.5c2.2-.8 4.4-.8 6 0M19 20.5c2.2-.8 4.4-.8 6 0" stroke={color('story')} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </Glyph>
      )
    case 'RECORD':
      return (
        <Glyph size={size}>
          <path d="M8.5 3.5h11l6 6v17a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-21a2 2 0 0 1 2-2z" fill={color('record')} />
          <path d="M19.5 3.5v4a2 2 0 0 0 2 2h4z" fill={tint('record')} />
          <path d="M10.5 15h11M10.5 19h11M10.5 23h7" stroke={PAPER} strokeWidth="1.8" strokeLinecap="round" />
        </Glyph>
      )
    case 'CASE':
      return (
        <Glyph size={size}>
          <path d="m16 17.5 11 5-11 5-11-5z" fill={tint('case')} />
          <path d="m16 12 11 5-11 5-11-5z" fill={tint('case')} stroke={color('case')} strokeWidth="1" />
          <path d="m16 4.5 11 5-11 5-11-5z" fill={color('case')} />
        </Glyph>
      )
  }
}

/** Home 빠른 작업 Glyph */
export const ActionGlyph = ({ kind, size }: { kind: 'write' | 'questions' | 'drafts' | 'discover'; size?: number }) => {
  switch (kind) {
    case 'write':
      return (
        <Glyph size={size}>
          <rect x="5" y="6" width="17" height="21" rx="3" fill={tint('plan')} />
          <path d="M9 12h9M9 16h7M9 20h5" stroke={color('plan')} strokeWidth="1.8" strokeLinecap="round" />
          <path d="m25.8 9.6 1.6 1.6a1.6 1.6 0 0 1 0 2.3l-8.7 8.7-4.3 1.1 1.1-4.3 8.7-8.7a1.6 1.6 0 0 1 2.3 0z" fill={color('plan')} />
        </Glyph>
      )
    case 'questions':
      return (
        <Glyph size={size}>
          <path d="M6 6h20a2.5 2.5 0 0 1 2.5 2.5v12A2.5 2.5 0 0 1 26 23h-9.5L10 28v-5H6a2.5 2.5 0 0 1-2.5-2.5v-12A2.5 2.5 0 0 1 6 6z" fill={color('routine')} />
          <path d="M13 12.2a3 3 0 1 1 3.9 2.9c-.6.2-.9.7-.9 1.3v.5" stroke={PAPER} strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="19.6" r="1.2" fill={PAPER} />
        </Glyph>
      )
    case 'drafts':
      return (
        <Glyph size={size}>
          <rect x="9" y="4.5" width="17" height="21" rx="3" fill={tint('story')} />
          <rect x="5.5" y="7.5" width="17" height="21" rx="3" fill={color('story')} />
          <path d="M9.5 14h9M9.5 18h9M9.5 22h5" stroke={PAPER} strokeWidth="1.8" strokeLinecap="round" />
        </Glyph>
      )
    case 'discover':
      return (
        <Glyph size={size}>
          <circle cx="16" cy="16" r="12" fill={tint('case')} />
          <path d="m21.5 10.5-3.2 7.8-7.8 3.2 3.2-7.8z" fill={color('case')} />
          <circle cx="16" cy="16" r="1.8" fill={PAPER} />
        </Glyph>
      )
  }
}

/** 원형 Tile (Glyph를 담는 연한 원). 선택적으로 개수 Badge를 위에 붙인다. */
export function IconTile({ children, badge, size = 52 }: { children: ReactNode; badge?: number; size?: number }) {
  return (
    <span className={tileStyles.tile} style={{ width: size, height: size }}>
      {children}
      {badge !== undefined && badge > 0 && <span className={tileStyles.badge}>{badge}</span>}
    </span>
  )
}
