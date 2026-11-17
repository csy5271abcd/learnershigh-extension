package com.learnershigh.extension.assessment.dto.ai;

import java.util.List;

/**
 * AI 분석 응답 (api-contract.md §47-A PROPOSED).
 * status는 성공 응답에서 항상 REVIEW_REQUIRED다 — AI 결과는 후보이고 관리자 확인 전에는 공개·확정하지 않는다.
 * 실패는 이 응답이 아니라 공통 Error 형식(§5)으로 돌려준다.
 */
public record AiAnalysisResponse<T>(
        String analysisId,
        String kind,
        String status,
        String provider,
        String model,
        AiSource source,
        T result,
        List<EvidenceCheck> evidenceChecks,
        List<String> warnings,
        String createdAt) {

    /** 분석에 쓴 원본. sha256은 원본 Revision 추적용 (파일 본문·원문은 응답에 다시 담지 않는다) */
    public record AiSource(String fileName, String sha256, int pageCount, int textPageCount, int characterCount) {
    }

    /** 근거 대조 결과. verified=false면 화면이 "근거 확인 필요"로 보여준다 */
    public record EvidenceCheck(String path, int pdfPage, boolean verified, String reason) {
    }
}
