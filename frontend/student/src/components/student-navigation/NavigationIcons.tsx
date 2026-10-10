// Student Global Navigation용 Line Icon (Dependency 없는 Inline SVG).
// 기존 LearnersHigh Student Header 아이콘의 의미와 형태를 참고해 단순화했다. 장식이므로 aria-hidden.
import type { ReactNode } from 'react'

interface IconProps {
  className?: string
}

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function TimerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.5M10 2.5h4M18.5 6.5l1.5-1.5" />
    </Svg>
  )
}

export function PlanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 16.5h.01M12 16.5h.01" />
    </Svg>
  )
}

export function LibraryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="10" width="17" height="10" rx="2" />
      <path d="M5.5 7h13M7.5 4h9" />
    </Svg>
  )
}

export function DiaryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 17c.8-2 2.2-3 4-3s3.2 1 4 3" />
    </Svg>
  )
}

export function ReportIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="4.5" width="15" height="16" rx="2" />
      <path d="M9 3h6v3H9zM9 17v-2M12 17v-5M15 17v-3" />
    </Svg>
  )
}

export function StatisticsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h16M6.5 20v-5M11 20v-9M15.5 20V8M20 20V4.5" />
    </Svg>
  )
}

export function RewardPenaltyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="10" cy="6" rx="6" ry="2.5" />
      <path d="M4 6v4c0 1.4 2.7 2.5 6 2.5M4 10v4c0 1.4 2.7 2.5 6 2.5M16 6v3" />
      <circle cx="17" cy="16" r="4" />
      <path d="M15.3 16h3.4" />
    </Svg>
  )
}

export function PerformanceTaskIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="4.5" width="15" height="16" rx="2" />
      <path d="M9 3h6v3H9zM8 11l1.2 1.2L11.5 10M8 16l1.2 1.2L11.5 15M13.5 11.5H16M13.5 16.5H16" />
    </Svg>
  )
}

export function DiagnosisIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20 20M8 12.5v-1.5M10.5 12.5V9M13 12.5V10.5" />
    </Svg>
  )
}

export function BlogIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="6" />
      <text
        x="12"
        y="14.2"
        textAnchor="middle"
        fontSize="6.4"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
        fontFamily="Arial, sans-serif"
      >
        blog
      </text>
    </Svg>
  )
}

export function RewardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 13h12l-1.5 7h-9z" />
      <path d="M12 13V8M12 9.5C12 6.5 9.5 5 7 5c0 2.8 2 4.5 5 4.5ZM12 9c0-2.6 2-4 4.5-4 0 2.5-1.8 4-4.5 4Z" />
    </Svg>
  )
}

export function MentorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5" />
      <path d="M16 4.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" />
    </Svg>
  )
}

export function SchoolActivityIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 10.5 12 5l9 5.5" />
      <path d="M5 9.5V20h14V9.5M10 20v-4.5h4V20M3 20h18" />
    </Svg>
  )
}

export function MessageIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4c-4.7 0-8.5 3.2-8.5 7.2 0 2 .9 3.8 2.5 5.1L5.3 20l4-1.7c.9.2 1.8.3 2.7.3 4.7 0 8.5-3.2 8.5-7.2S16.7 4 12 4Z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
    </Svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  )
}

export function CheckoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H13" />
      <path d="M16 8.5 19.5 12 16 15.5M19.5 12H10" />
    </Svg>
  )
}
