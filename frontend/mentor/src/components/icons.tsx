// Mentor Workspace Icon (inline SVG, 새 Icon Library 없이). 장식이므로 aria-hidden이고, 이름은 옆 글자나 aria-label이 맡는다.

import type { ReactNode } from 'react'

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

export const HomeIcon = () => (
  <Icon>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Icon>
)

export const ContentIcon = () => (
  <Icon>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </Icon>
)

export const DiscoverIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="8" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </Icon>
)

export const QuestionIcon = () => (
  <Icon>
    <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <path d="M10 9.2a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9v.2M12 14h.01" />
  </Icon>
)

export const CreateIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8.5v7M8.5 12h7" />
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

/** Content 유형 Icon (작성 Launcher) */
export const TypeIcon = ({ type }: { type: 'PLAN' | 'ROUTINE' | 'STORY' | 'RECORD' | 'CASE' }) => {
  switch (type) {
    case 'PLAN':
      return (
        <Icon size={22}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M9 3v4M15 3v4" />
        </Icon>
      )
    case 'ROUTINE':
      return (
        <Icon size={22}>
          <path d="M5 12a7 7 0 0 1 12-4.9L19 9M19 4v5h-5" />
          <path d="M19 12a7 7 0 0 1-12 4.9L5 15M5 20v-5h5" />
        </Icon>
      )
    case 'STORY':
      return (
        <Icon size={22}>
          <path d="M4 6.5C6.5 5 9.5 5 12 6.5 14.5 5 17.5 5 20 6.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z" />
          <path d="M12 6.5V19" />
        </Icon>
      )
    case 'RECORD':
      return (
        <Icon size={22}>
          <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z" />
          <path d="M14 3.5V8h4M9 12h6M9 15.5h6" />
        </Icon>
      )
    case 'CASE':
      return (
        <Icon size={22}>
          <path d="m12 4 8 4-8 4-8-4z" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
        </Icon>
      )
  }
}
