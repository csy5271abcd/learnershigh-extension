// 서버 분석 실패를 관리자가 구분할 수 있는 문장으로 바꾼다 (A7, api-contract.md §39-1).
// 원인을 단정하지 않는다: 평가항목 0건은 '평가계획서가 아님'과 같은 뜻이 아니다(표가 이미지이거나 형식이 특이하면 찾지 못할 수 있다).
// 구분: 문서 쪽 사유(422) · 일시 장애(503) · 계약 불일치/분석기 응답 오류(502) · 설정 문제 · 진행 중(409).

export type AnalysisFailureKind = 'document' | 'temporary' | 'contract' | 'configuration' | 'in-progress' | 'unknown'

export interface AnalysisFailure {
  kind: AnalysisFailureKind
  title: string
  /** 진단용 코드 (code · reason) */
  diagnostic: string
}

const noResult: Record<string, string> = {
  no_assessments_extracted: '문서에서 평가항목을 찾지 못했어요. 평가계획서가 맞는지, 원본 파일이 온전한지 확인해 주세요. 평가표가 이미지이거나 양식이 특이하면 평가계획서여도 찾지 못할 수 있어요.',
  no_segments: '문서에서 과목·평가 구간을 찾지 못했어요. 평가계획서가 맞는지, 원본 파일을 확인해 주세요.',
  needs_ocr: '스캔(이미지) 문서라 글자를 읽지 못했어요. 글자를 선택할 수 있는 원본(PDF·HWP)을 등록해 주세요.',
  unsupported_format: '분석기가 이 파일의 형식을 지원하지 않아요. 다른 형식의 원본이 있는지 확인해 주세요.',
}

const temporary: Record<string, string> = {
  busy: '분석기가 다른 문서를 처리하고 있어요. 잠시 뒤 다시 시도해 주세요.',
  timeout: '분석 시간이 너무 오래 걸려 멈췄어요. 잠시 뒤 다시 시도해 주세요.',
  connection_failed: '분석 서비스에 연결하지 못했어요. 일시적인 문제일 수 있어요. 잠시 뒤 다시 시도해 주세요.',
  analyzer_auth_failed: '분석 서비스 인증 설정이 맞지 않아요. 운영 담당자에게 알려 주세요.',
}

export function analysisFailureOf(error: { status?: number; code?: string; message?: string; details?: unknown }): AnalysisFailure {
  const fields = (error.details as { fields?: { reason?: string }[] } | undefined)?.fields
  const reason = fields?.[0]?.reason ?? ''
  const diagnostic = [error.code, reason].filter(Boolean).join(' · ')
  switch (error.code) {
    case 'PLAN_ANALYSIS_NO_RESULT':
      return { kind: 'document', title: noResult[reason] ?? noResult.no_assessments_extracted, diagnostic }
    case 'PLAN_ANALYZER_UNAVAILABLE':
      return { kind: reason === 'analyzer_auth_failed' ? 'configuration' : 'temporary', title: temporary[reason] ?? '분석 서비스를 지금 쓸 수 없어요. 잠시 뒤 다시 시도해 주세요.', diagnostic }
    case 'PLAN_ANALYZER_NOT_CONFIGURED':
      return { kind: 'configuration', title: '분석 서비스가 이 서버에 설정되지 않았어요. 운영 담당자에게 알려 주세요.', diagnostic }
    case 'PLAN_ANALYZER_BAD_RESPONSE':
      // A18: 분석기 처리 시간 제한 초과(분석기 504 ANALYSIS_TIMEOUT)는 계약 불일치가 아니다 — 시간 초과로 안내한다.
      if (reason === 'analyzer_error:analysis_timeout') return { kind: 'temporary', title: '분석기 처리 시간 제한을 넘겨 분석을 멈췄어요. 결과를 저장하지 않았어요. 잠시 뒤 다시 시도하고, 계속되면 운영 담당자에게 알려 주세요.', diagnostic }
      if (reason === 'sha_mismatch') return { kind: 'contract', title: '분석기가 다른 파일을 분석한 결과를 보냈어요. 결과를 저장하지 않았어요. 다시 시도해 주세요.', diagnostic }
      if (reason.startsWith('not_importable')) return { kind: 'contract', title: '분석기가 가져올 수 없는 결과라고 알렸어요. 결과를 저장하지 않았어요. 원문을 직접 확인해 주세요.', diagnostic }
      return { kind: 'contract', title: '분석 결과 형식이 약속(계약)과 달라 저장하지 않았어요. 분석기 담당자 확인이 필요해요.', diagnostic }
    case 'PLAN_ANALYSIS_UNSUPPORTED':
      if (reason === 'format_contract_pending') return { kind: 'document', title: 'HWP·HWPX 분석은 아직 실험 기능이라 실행하지 않았어요. 원문을 내려받아 확인해 주세요.', diagnostic }
      if (reason === 'original_missing') return { kind: 'document', title: '이 개정본은 원문 파일을 보관하지 않아 분석할 수 없어요. 원문을 다시 등록해 주세요.', diagnostic }
      return { kind: 'document', title: '분석기가 이 문서를 처리하지 않았어요. 파일 형식과 내용을 확인해 주세요.', diagnostic }
    case 'PLAN_ANALYSIS_IN_PROGRESS':
      return { kind: 'in-progress', title: '같은 개정본을 이미 분석하고 있어요. 끝난 뒤 목록을 새로 고쳐 주세요.', diagnostic }
    default:
      return { kind: 'unknown', title: error.message ?? '분석을 실행하지 못했어요.', diagnostic }
  }
}

export const analysisFailureText = (error: Parameters<typeof analysisFailureOf>[0]) => {
  const failure = analysisFailureOf(error)
  return failure.diagnostic ? `${failure.title} (${failure.diagnostic})` : failure.title
}
