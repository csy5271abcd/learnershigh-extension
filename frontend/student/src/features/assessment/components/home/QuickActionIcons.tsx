import type { ReactNode } from 'react'

// Assessment 홈 빠른 실행 전용 플랫 컬러 아이콘 (Daglo 홈 빠른 실행 아이콘의 시각 언어를 참고해 직접 그림).
// 32×32 그리드에서 그래픽이 약 26~28px를 차지한다 (Daglo 실측: 원 대비 약 40~45%).
// 면 채움 단색 1~2색, 그라데이션·그림자 없음. 배지 테두리는 원 배경색(--as-color-fill)으로 끊어 보이게 한다.
// 장식이므로 aria-hidden (버튼 이름은 글자로 읽는다).

const green = '#00AD64'
const yellow = '#FFCF25'
const blue = '#4F90FC'
const purple = '#8E81F6'
const orange = '#FF8A3D'
const gray = '#A0A4AB'
/** 배지와 그림 사이를 원 배경색으로 끊는다 (hover·다크 모드에서도 원 색을 따른다, home.module.css --quick-icon-bg) */
const cutout = { fill: 'var(--quick-icon-bg, var(--as-color-fill))' }

interface ArtProps {
  size?: number
}

function Art({ size = 32, children }: ArtProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

/** PDF 가져오기: 초록 문서 + 떨어진 접힌 모서리 + 흰 PDF 글자 */
export function PdfImportArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path d="M6.5 2H17.8V8.6A3 3 0 0 0 20.8 11.6H28.5V27A3 3 0 0 1 25.5 30H6.5A3 3 0 0 1 3.5 27V5A3 3 0 0 1 6.5 2Z" fill={green} />
      <path d="M19.8 2.3L28.2 10.6H21.8A2 2 0 0 1 19.8 8.6Z" fill={green} />
      <text x="16" y="24.2" textAnchor="middle" fontSize="8.6" fontWeight="800" fill="#fff" fontFamily="inherit" letterSpacing=".1">
        PDF
      </text>
    </Art>
  )
}

/** 수행평가 추가: 노란 폴더 + 파란 플러스 배지 */
export function AddAssessmentArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path d="M5 4.5H11.4C12.2 4.5 12.9 4.8 13.5 5.4L15.6 7.5H26.5A3 3 0 0 1 29.5 10.5V24.5A3 3 0 0 1 26.5 27.5H5A3 3 0 0 1 2 24.5V7.5A3 3 0 0 1 5 4.5Z" fill={yellow} />
      <circle cx="25" cy="24" r="7.2" style={cutout} />
      <circle cx="25" cy="24" r="5.8" fill={blue} />
      <path d="M25 21v6M22 24h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </Art>
  )
}

/** 평가 기준 보기: 보라 평가표 + 주황 체크 칸 */
export function CriteriaArt(props: ArtProps) {
  return (
    <Art {...props}>
      <rect x="4.5" y="4" width="23" height="26" rx="3.5" fill={purple} />
      <rect x="10.5" y="1.8" width="11" height="5" rx="2" fill="#6A5AE0" />
      <rect x="8.5" y="11" width="4.2" height="4.2" rx="1.2" fill={orange} />
      <rect x="14.8" y="12" width="9" height="2.2" rx="1.1" fill="#fff" />
      <rect x="8.5" y="17.6" width="4.2" height="4.2" rx="1.2" fill={orange} />
      <rect x="14.8" y="18.6" width="7" height="2.2" rx="1.1" fill="#fff" />
      <rect x="8.5" y="24.2" width="4.2" height="2.2" rx="1.1" fill="#fff" fillOpacity=".7" />
      <rect x="14.8" y="24.2" width="8" height="2.2" rx="1.1" fill="#fff" fillOpacity=".7" />
    </Art>
  )
}

/** AI 도우미: 파란 큰 반짝임 + 보라 작은 반짝임 */
export function AiHelperArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path d="M14 5C14.9 12.5 16.5 14.1 26 17C16.5 19.9 14.9 21.5 14 29C13.1 21.5 11.5 19.9 2 17C11.5 14.1 13.1 12.5 14 5Z" fill={blue} />
      <path d="M25 2.5C25.4 5.4 26.1 6.1 29.5 7C26.1 7.9 25.4 8.6 25 11.5C24.6 8.6 23.9 7.9 20.5 7C23.9 6.1 24.6 5.4 25 2.5Z" fill={purple} />
    </Art>
  )
}

/** 심화 탐구: 노란 전구 + 회색 받침 */
export function EnrichmentArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path d="M16 2A10.8 10.8 0 0 1 22.5 21.4C21.6 22.1 21.1 22.9 21.1 23.8V24H10.9V23.8C10.9 22.9 10.4 22.1 9.5 21.4A10.8 10.8 0 0 1 16 2Z" fill={yellow} />
      <rect x="10.9" y="25.4" width="10.2" height="2.3" rx="1.15" fill={gray} />
      <rect x="12.8" y="28.5" width="6.4" height="2" rx="1" fill={gray} />
    </Art>
  )
}

/** 선생님 피드백: 파란 말풍선 + 주황 체크 배지 */
export function FeedbackArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path d="M8 4H24A5 5 0 0 1 29 9V18A5 5 0 0 1 24 23H15L9.4 27.4C8.7 28 7.7 27.4 7.8 26.5L8.2 23A5 5 0 0 1 3 18V9A5 5 0 0 1 8 4Z" fill={blue} />
      <rect x="8.5" y="9.5" width="13" height="2.4" rx="1.2" fill="#fff" />
      <rect x="8.5" y="14.5" width="8.5" height="2.4" rx="1.2" fill="#fff" />
      <circle cx="25" cy="24" r="7.2" style={cutout} />
      <circle cx="25" cy="24" r="5.8" fill={orange} />
      <path d="M22.4 24.1l1.8 1.8 3.4-3.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Art>
  )
}

/** 성장 기록: 초록 새싹 + 주황 화분 */
export function GrowthArt(props: ArtProps) {
  return (
    <Art {...props}>
      <path d="M16 21V13" stroke={green} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M15.5 14C9.5 14.2 6 11.2 5.9 5.4C11.7 5.2 15.2 8.2 15.5 14Z" fill={green} />
      <path d="M16.5 12.5C16.7 6.9 19.9 3.7 25.9 3.8C26 9.5 22.7 12.6 16.5 12.5Z" fill="#34C77B" />
      <path d="M8.5 20.5H23.5L21.9 28.3A2 2 0 0 1 19.9 29.9H12.1A2 2 0 0 1 10.1 28.3Z" fill={orange} />
    </Art>
  )
}
