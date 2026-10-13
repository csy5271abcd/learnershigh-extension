import { useEffect, useState } from 'react'
import type { CaseMaterialPreview, FileBacking } from '../fixtures/types.ts'

/* 파일 미리보기 판정 (Student EvidenceDialogs.tsx previewKind와 같은 규칙) · 원본 Text 불러오기 */

export interface PreviewFile {
  name: string
  /** 형식 표시 (없으면 확장자) */
  format?: string
  /** 부제 (단계 Tag · Version · 자료 설명 등) */
  subtitle?: string
  backing?: FileBacking
  /** Mentor Case 자료의 표시용 View Model */
  viewModel?: CaseMaterialPreview
  /** 다운로드를 허용하는 자료인지 (Mentor Record 원본처럼 공개하지 않는 자료는 false) */
  downloadable?: boolean
  /** 자료 역할 (계획서 · 조사 자료 · 초안 V1 · 수정본 V2 · 최종 제출본 등, read-model/materialRole.ts) */
  role?: string
  /** 현재 검토 대상 자료만 Accent */
  roleAccent?: boolean
}

export type PreviewKind = 'image' | 'pdf' | 'text' | 'csv' | 'unsupported'

const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
const textExtensions = ['txt', 'py', 'md', 'json']

export const extensionOf = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
export const formatLabelOf = (file: Pick<PreviewFile, 'name' | 'format'>) => (file.format ?? extensionOf(file.name)).toUpperCase()

export function previewKind(name: string): PreviewKind {
  const extension = extensionOf(name)
  if (imageExtensions.includes(extension)) return 'image'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'csv') return 'csv'
  if (textExtensions.includes(extension)) return 'text'
  return 'unsupported'
}

/** 원본을 Browser에서 직접 보여줄 수 있는지 (이미지 · PDF · CSV · Text + 원본 있음) */
export const hasNativePreview = (file: PreviewFile) => Boolean(file.backing) && previewKind(file.name) !== 'unsupported'

export type PreviewAvailability = 'available' | 'unsupported' | 'no-original'

export function previewAvailability(file: PreviewFile): PreviewAvailability {
  if (file.viewModel) return 'available'
  if (previewKind(file.name) === 'unsupported') return 'unsupported'
  return file.backing ? 'available' : 'no-original'
}

export const availabilityLabel: Record<PreviewAvailability, string> = {
  available: '미리보기 가능',
  unsupported: '미리보기 미지원',
  'no-original': '원본 없음',
}

export const forceFileError = () => import.meta.env.DEV && new URLSearchParams(window.location.search).get('fixture') === 'file-error'

/** CSV 간단 표시 (Student와 같은 규칙: 줄 · 쉼표로만 나눈다) */
export const parseCsv = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .slice(0, 200)
    .map((line) => line.split(','))

/** 원본 Text를 불러온다. (CSV · Text 미리보기, Version 내용 비교가 같이 쓴다) */
export function useFileText(backing: FileBacking | undefined, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; state: { status: 'ready'; text: string } | { status: 'error' } } | null>(null)
  const key = `${backing?.url ?? ''}|${attempt}`
  useEffect(() => {
    if (!backing || !enabled) return
    let active = true
    const load = forceFileError() ? Promise.reject(new Error('fixture file error')) : fetch(backing.url).then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
    load.then(
      (text) => active && setResult({ key, state: { status: 'ready', text } }),
      () => active && setResult({ key, state: { status: 'error' } }),
    )
    return () => {
      active = false
    }
  }, [backing, enabled, key])
  const state = result && result.key === key ? result.state : { status: 'loading' as const }
  return { state, retry: () => setAttempt((value) => value + 1) }
}
