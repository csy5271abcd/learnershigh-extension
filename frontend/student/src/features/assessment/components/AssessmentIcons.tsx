// Assessment 화면용 Line Icon (Dependency 없는 Inline SVG). 장식이므로 aria-hidden.
import type { ReactNode } from 'react'

interface IconProps {
  className?: string
  size?: number
}

function Svg({ className, size = 18, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4z" />
    </Svg>
  )
}

export function ClipboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 3h6v3H9zM8.5 11h7M8.5 15h5" />
    </Svg>
  )
}

export function BulbIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 17h6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2V17h4v-1.3c0-.9.5-1.7 1.2-2.2A5.5 5.5 0 0 0 12 3.5Z" />
    </Svg>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 1 3.4 6.3L4.5 19.5l1.1-3.3A7.4 7.4 0 0 1 4.5 12Z" />
    </Svg>
  )
}

export function BooksIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4.5h3.5v15H5zM10.5 4.5H14v15h-3.5zM15.5 5.5l3.3-.9 2.7 14.4-3.3.9z" />
    </Svg>
  )
}

export function SproutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20v-7M12 13c0-3.5-2.5-6-7-6 0 4 2.5 6 7 6ZM12 11c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6ZM7 20h10" />
    </Svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="4" rx="1" />
      <path d="M5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-10M10 12.5h4" />
    </Svg>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
    </Svg>
  )
}

export function CapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m2.5 9.5 9.5-4.5 9.5 4.5-9.5 4.5zM6.5 11.5v4c1.5 1.3 3.5 2 5.5 2s4-.7 5.5-2v-4M21.5 9.5v5" />
    </Svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function ChevronUpDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" />
    </Svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </Svg>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 3 19.5h18zM12 10v4.5M12 17h.01" />
    </Svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  )
}

export function FileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 3.5h7l4 4v13h-11zM13.5 3.5v4h4" />
    </Svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 5 4 4L8.5 19.5H4.5v-4z" />
    </Svg>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />
    </Svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M10.3 3.5h3.4l.5 2.3 1.6.9 2.2-.8 1.7 2.9-1.7 1.6v1.8l1.7 1.6-1.7 2.9-2.2-.8-1.6.9-.5 2.3h-3.4l-.5-2.3-1.6-.9-2.2.8-1.7-2.9 1.7-1.6v-1.8L4.3 8.9 6 6l2.2.8 1.6-.9z" />
    </Svg>
  )
}

export function StatusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 1-6 2.5" strokeDasharray="2.6 2.6" />
      <circle cx="12" cy="12" r="2" />
    </Svg>
  )
}

export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5.5c2.7-1 5.3-1 8 .8v13.2c-2.7-1.8-5.3-1.8-8-.8zM20 5.5c-2.7-1-5.3-1-8 .8v13.2c2.7-1.8 5.3-1.8 8-.8z" />
    </Svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </Svg>
  )
}

export function SourceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h6.5l4 4V13M13.5 3.5v4h4M7 3.5v17h6" />
      <path d="M16 16.5h4.5M18.5 14.5l2 2-2 2" />
    </Svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
    </Svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5v11M7.5 11 12 15.5l4.5-4.5M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
    </Svg>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 3.5 10 14M20.5 3.5 14 20.5l-4-6.5-6.5-4z" />
    </Svg>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4.5 11.6 9 16 10.5 11.6 12 10 16.5 8.4 12 4 10.5 8.4 9zM17.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </Svg>
  )
}

export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.5H8M12 8v4.5l3 1.8" />
    </Svg>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1" fill="currentColor" />
    </Svg>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4v6M6 14v6M12 4v3M12 11v9M18 4v9M18 17v3M4 10h4M10 7h4M16 13h4" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />
    </Svg>
  )
}

export function NoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Svg>
  )
}

export function TemplateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.5h16M10 9.5V20" />
    </Svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </Svg>
  )
}
