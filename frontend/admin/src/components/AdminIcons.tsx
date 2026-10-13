/*
 * Admin Inline SVG Icon (새 Icon Package를 설치하지 않는다)
 * - 기본은 장식용(aria-hidden)이다. 의미는 항상 옆의 글자가 전달한다. (색 · 모양만으로 의미를 전달하지 않는다)
 * - 24 × 24 viewBox, currentColor 1.8 stroke. 크기는 size로만 바꾼다.
 */

export type AdminIconName =
  | 'compass'
  | 'comment'
  | 'refresh'
  | 'note'
  | 'clock'
  | 'alert'
  | 'check'
  | 'calendar'
  | 'message'
  | 'bell'
  | 'link'
  | 'user'
  | 'file'
  | 'sparkle'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-down'
  | 'chevron-right'
  | 'filter'
  | 'plan'
  | 'routine'
  | 'story'
  | 'record'
  | 'case'
  | 'book'
  | 'lock'
  | 'eye'
  | 'study'
  | 'history'
  | 'plus'

const paths: Record<AdminIconName, string[]> = {
  compass: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'm15.5 8.5-2 5-5 2 2-5 5-2Z'],
  comment: ['M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z'],
  refresh: ['M19 12a7 7 0 1 1-2.05-4.95', 'M19 4v4h-4'],
  note: ['M7 4h7l4 4v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z', 'M14 4v4h4', 'M9 13h6', 'M9 16.5h4'],
  clock: ['M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z', 'M12 7.5V12l3 2'],
  alert: ['M12 4 3 19.5h18L12 4Z', 'M12 10v4', 'M12 17h.01'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  calendar: ['M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z', 'M4 10h16', 'M8 4v4', 'M16 4v4'],
  message: ['M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 3V6.5Z', 'M8 10h8', 'M8 13h5'],
  bell: ['M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z', 'M10 20.5a2 2 0 0 0 4 0'],
  link: ['M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1', 'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  file: ['M7 3.5h7l4.5 4.5v12a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Z', 'M14 3.5V8h4.5'],
  sparkle: ['M12 4v4', 'M12 16v4', 'M4 12h4', 'M16 12h4', 'm7 7 2 2', 'm15 15 2 2', 'm17 7-2 2', 'm9 15-2 2'],
  'arrow-up': ['M12 19V5', 'm6 11 6-6 6 6'],
  'arrow-down': ['M12 5v14', 'm6 13 6 6 6-6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 6 6 6-6 6'],
  filter: ['M4 6h16', 'M7 12h10', 'M10 18h4'],
  plan: ['M5 5h14v15H5z', 'M5 9.5h14', 'M9 5v15'],
  routine: ['M12 3.5a8.5 8.5 0 1 0 8.5 8.5', 'M12 7v5h4', 'm17.5 3.5 3 3-3 3'],
  story: ['M4 5.5c2.5-1 5-1 8 1 3-2 5.5-2 8-1v13c-2.5-1-5-1-8 1-3-2-5.5-2-8-1v-13Z', 'M12 6.5v13'],
  record: ['M6 3.5h12v17H6z', 'M9 8h6', 'M9 11.5h6', 'M9 15h3'],
  case: ['M4 8h16v11H4z', 'M9 8V5.5h6V8', 'M4 13h16'],
  book: ['M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z', 'M5 17a3 3 0 0 1 3-3h11'],
  lock: ['M6.5 11h11v9h-11z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  eye: ['M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  study: ['M12 4 3 8.5 12 13l9-4.5L12 4Z', 'M7 10.5V15c3 2 7 2 10 0v-4.5'],
  history: ['M4 12a8 8 0 1 0 2.35-5.65', 'M4 4v4h4', 'M12 8v4.5l3 1.5'],
  plus: ['M12 5v14', 'M5 12h14'],
}

export function AdminIcon({ name, size = 16, label }: { name: AdminIconName; size?: number; /** 글자 없이 Icon만 의미를 가질 때만 준다 */ label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={{ flex: 'none' }}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
