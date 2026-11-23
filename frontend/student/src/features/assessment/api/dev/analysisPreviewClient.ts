// 평가계획서 분석 미리보기 — **개발 전용** 로컬 분석기 Client (2026-11-11).
//
// - 호출 대상: 계정 B `curriculum-analysis` 로컬 서비스(127.0.0.1:8765)의 `POST /analyze-preview`.
//   응답 계약은 그 서비스 내부 계약 `analyze-preview-0.1-dev`이며 LearnersHigh 공식 API(`api-contract.md`)가 **아니다**.
//   그래서 Assessment Domain Type(`api/types.ts`)에 넣지 않고 이 파일 안의 최소 읽기 Type만 쓴다.
// - 브라우저는 같은 Origin의 `/dev-analysis/*`만 부른다. 토큰은 개발 서버 Proxy(Node)가 붙인다.
//   토큰·서비스 주소를 이 파일이나 번들에 넣지 않는다(`VITE_` 환경 변수 사용 금지).
// - `import.meta.env.DEV` + `VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW=true`일 때만 켜진다. 기본 시연 환경과 Production Build에서는 꺼져 있다.
// - 결과는 **저장하지 않는다**. 학생 수행평가·평가계획서 Revision·관리자 확정 상태를 만들지 않는다.
// - 결과 전체 페이지에서 문서 학기·운영표 정보를 보이려고 `includeAnalysis=true`로 분석기 전체 결과도 받는다(원문 일부 포함).
//   결과는 **메모리(model/analysisPreviewSession.ts)에만** 두고 localStorage·sessionStorage·서버에 남기지 않는다. 새로고침하면 사라진다.

// Flag 판단은 화면에서 `import.meta.env.DEV && import.meta.env.VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW === 'true'`를 직접 쓴다.
// 빌드 시점 상수라 Production Build에서는 분기·Modal·이 Client가 번들에서 빠진다(함수로 감싸면 Minifier가 지우지 못했다).

const basePath = '/dev-analysis'
/** 분석기 기본 상한(20MB)과 같은 값. 서버가 최종 판단한다. */
export const analysisPreviewMaxBytes = 20 * 1024 * 1024
/** 서버 기본 시간 제한(120초)보다 길게 기다린다 (계정 B 안내 §6-7). */
const clientTimeoutMs = 150_000

export type PreviewFormat = 'PDF' | 'HWP' | 'HWPX'
export const previewExtensions: Record<string, PreviewFormat> = { pdf: 'PDF', hwp: 'HWP', hwpx: 'HWPX' }

/** 파일 앞부분 바이트로 본 형식 (확장자와 별개). HWPX는 ZIP 서명만 보므로 최종 판별은 분석기가 한다. */
export async function sniffFormat(file: File): Promise<PreviewFormat | 'UNKNOWN'> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const starts = (...bytes: number[]) => bytes.every((value, index) => head[index] === value)
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return 'PDF' // %PDF-
  if (starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)) return 'HWP' // OLE 복합 문서 (HWP 5.x)
  if (starts(0x50, 0x4b, 0x03, 0x04)) return 'HWPX' // ZIP (HWPX 패키지 후보)
  return 'UNKNOWN'
}

export interface PreviewSource {
  pdfPageNumber?: number
  printedPageLabel?: string | null
  documentLocator?: { kind?: string; section?: number; table?: number; row?: number; col?: number; path?: string } | null
  extractedText?: string | null
}

export interface PreviewRubric {
  element?: string | null
  levels?: { description?: string | null; score?: number | null }[]
  sources?: PreviewSource[]
}

export interface PreviewPerformanceItem {
  itemKey?: string
  label?: string | null
  area?: string | null
  timing?: string | null
  weightPercent?: number | null
  maxScore?: number | null
  content?: string | null
  submissions?: string[]
  conditions?: string[]
  rubric?: PreviewRubric[]
  sources?: PreviewSource[]
}

export interface PreviewWrittenExam {
  itemKey?: string
  round?: number | null
  weightPercent?: number | null
  timing?: string | null
  questionTypes?: string[]
  sources?: PreviewSource[]
}

export interface PreviewSubject {
  subjectName?: string | null
  pageRange?: { from?: number; to?: number } | null
  writtenEvaluation?: { weightPercent?: number | null; exams?: PreviewWrittenExam[] } | null
  performanceEvaluation?: { weightPercent?: number | null; items?: PreviewPerformanceItem[] } | null
}

/** 분석기 전체 결과(`analysis`) 중 화면이 읽는 부분만. 없는 필드는 화면에서 "미추출"로 표시한다. */
export interface PreviewAnalysisSegment {
  segmentId?: string
  status?: string
  context?: {
    academicYear?: number | null
    grades?: number[] | null
    semesters?: number[] | null
    subject?: string | null
    contextStatus?: string
  } | null
  teaching?: { tables?: unknown[]; inClassEvaluationMentions?: number } | null
}

export interface AnalysisPreviewResponse {
  service?: { name?: string; version?: string; contract?: string }
  requestId?: string
  ok?: boolean
  status?: string
  analyzerVersion?: string
  analyzerChannel?: string
  analyzer?: { name?: string; version?: string }
  analysisMode?: { llmCalls?: boolean; method?: string }
  source?: {
    sha256?: string
    sizeBytes?: number
    detectedFormat?: string
    declaredExtension?: string | null
    extensionMatchesFormat?: boolean | null
    pageCount?: number | null
    sectionCount?: number | null
  }
  reviewState?: { status?: string; humanReviews?: number }
  summary?: { subjects?: string[]; assessments?: number; written?: number; performance?: number; locatorsUnresolved?: number }
  backendImport?: {
    variant?: string
    adapter?: string
    requiresBackendFlag?: string | null
    importable?: boolean
    blockers?: unknown[]
    payload?: { status?: string; subjects?: PreviewSubject[]; warnings?: unknown[] } | null
  } | null
  warnings?: unknown[]
  errors?: { code?: string; message?: string }[]
  elapsedMs?: number
  analysis?: { status?: string; statusReasons?: unknown[]; segments?: PreviewAnalysisSegment[] } | null
}

/** 브라우저에서 원본 파일 SHA-256 (분석기가 받은 바이트와 대조용) */
export async function fileSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 화면이 구분해서 보여주는 실패 종류 */
export type PreviewFailureKind =
  | 'CONNECTION' // 분석기 연결 실패 (서비스 꺼짐·Proxy 오류·인증 설정)
  | 'UNSUPPORTED' // 지원하지 않는 문서 (PDF·HWP·HWPX 아님, 암호화)
  | 'EXTRACTION' // 원문 추출 실패 (손상·위험 파일, 파싱 실패)
  | 'TOO_LARGE'
  | 'BUSY'
  | 'ANALYSIS' // 분석 실패 (시간 초과·분석기 내부 오류)
  | 'REQUEST' // 요청 오류 (개발 설정 문제 가능)

export class AnalysisPreviewError extends Error {
  readonly kind: PreviewFailureKind
  readonly httpStatus: number
  readonly code: string
  readonly response: AnalysisPreviewResponse | null

  constructor(kind: PreviewFailureKind, httpStatus: number, code: string, message: string, response: AnalysisPreviewResponse | null) {
    super(message)
    this.name = 'AnalysisPreviewError'
    this.kind = kind
    this.httpStatus = httpStatus
    this.code = code
    this.response = response
  }
}

function isServiceBody(value: unknown): value is AnalysisPreviewResponse {
  return typeof value === 'object' && value !== null && typeof (value as AnalysisPreviewResponse).service === 'object'
}

function classify(httpStatus: number, code: string): PreviewFailureKind {
  if (httpStatus === 401 || httpStatus === 403) return 'CONNECTION'
  if (httpStatus === 413 || code === 'FILE_TOO_LARGE') return 'TOO_LARGE'
  if (httpStatus === 415) return 'UNSUPPORTED'
  if (httpStatus === 422) return 'EXTRACTION'
  if (httpStatus === 503 && code === 'BUSY') return 'BUSY'
  if (httpStatus === 504 || httpStatus >= 500) return 'ANALYSIS'
  return 'REQUEST'
}

async function readBody(response: Response): Promise<unknown> {
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('application/json')) return undefined
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export interface AnalyzerHealth {
  reachable: boolean
  formats: string[]
  defaultAnalyzerVersion: string | null
  llmCalls: boolean | null
  message: string | null
}

/** GET /health (비밀·원문 없음). 연결 안 되면 reachable=false로 돌려준다. */
export async function checkAnalyzerHealth(): Promise<AnalyzerHealth> {
  try {
    const response = await fetch(`${basePath}/health`, { cache: 'no-store' })
    const body = await readBody(response)
    if (!response.ok || !isServiceBody(body)) {
      return { reachable: false, formats: [], defaultAnalyzerVersion: null, llmCalls: null, message: `분석기 응답 없음 (HTTP ${response.status})` }
    }
    const health = body as AnalysisPreviewResponse & { formats?: string[]; defaultAnalyzerVersion?: string }
    return {
      reachable: true,
      formats: Array.isArray(health.formats) ? health.formats : [],
      defaultAnalyzerVersion: health.defaultAnalyzerVersion ?? null,
      llmCalls: health.analysisMode?.llmCalls ?? null,
      message: null,
    }
  } catch {
    return { reachable: false, formats: [], defaultAnalyzerVersion: null, llmCalls: null, message: '개발 서버 Proxy에 연결하지 못했어요' }
  }
}

/**
 * 실제 파일 바이트를 분석기에 보낸다 (`file` + `includeAnalysis=true`. `analyzerVersion` 미지정 = 기본 v21.1, v21.2-quality 자동 전환 없음).
 * 성공(HTTP 200)이면 분석 결과를, 그 밖에는 AnalysisPreviewError를 던진다. 실패를 Mock 결과로 바꾸지 않는다.
 */
export async function requestAnalysisPreview(
  file: File,
  signal?: AbortSignal,
  options: { includeAnalysis?: boolean } = {},
): Promise<AnalysisPreviewResponse> {
  const form = new FormData()
  form.append('file', file)
  // Admin 등록 흐름은 공식 수신 payload만 쓰므로 원문이 든 전체 결과를 받지 않는다(includeAnalysis=false).
  if (options.includeAnalysis ?? true) form.append('includeAnalysis', 'true')
  const timeout = AbortSignal.timeout(clientTimeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  let response: Response
  try {
    // Content-Type은 지정하지 않는다 (브라우저가 multipart boundary를 붙인다).
    response = await fetch(`${basePath}/analyze-preview`, { method: 'POST', body: form, signal: combined })
  } catch (caught) {
    if (timeout.aborted) throw new AnalysisPreviewError('ANALYSIS', 0, 'CLIENT_TIMEOUT', '분석이 너무 오래 걸려 기다리기를 멈췄어요.', null)
    if (signal?.aborted) throw caught
    throw new AnalysisPreviewError('CONNECTION', 0, 'NETWORK_ERROR', '개발 서버 Proxy에 연결하지 못했어요.', null)
  }
  const body = await readBody(response)
  if (!isServiceBody(body)) {
    // Proxy가 분석기에 닿지 못하면(서비스 꺼짐) JSON이 아닌 오류를 돌려준다.
    throw new AnalysisPreviewError('CONNECTION', response.status, 'ANALYZER_UNREACHABLE', `분석기 서비스가 응답하지 않아요. (HTTP ${response.status})`, null)
  }
  if (!response.ok) {
    const first = body.errors?.[0]
    const code = first?.code ?? body.status ?? 'UNKNOWN'
    throw new AnalysisPreviewError(classify(response.status, code), response.status, code, first?.message ?? '분석기가 요청을 거절했어요.', body)
  }
  return body
}
