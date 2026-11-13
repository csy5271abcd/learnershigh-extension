package com.learnershigh.extension.assessment.integration.analysis;

import java.util.List;

/**
 * 평가계획서 문서 분석기 외부 경계 (A3, 2026-11-13). 계정 B Python 분석기의 `POST /analyze-preview`를 Backend가 직접 부른다.
 * 분석기 내부(규칙·품질)는 모르고, 응답 Envelope와 backendImport 묶음만 다룬다.
 * 인증 토큰은 구현체 안에만 있고 결과·예외·로그에 담지 않는다.
 */
public interface PlanAnalyzerClient {

    boolean configured();

    /** 분석기 호출. 실패는 {@link PlanAnalyzerException}(종류별)으로 던진다. 결과 내용의 계약 검증은 Service가 한다. */
    Result analyze(Request request);

    /**
     * @param fileId           분석기 로그·결과 연결용 ID (Revision ID 기반, [A-Za-z0-9_-]{1,40})
     * @param analyzerVersion  분석기 프로필 (예: v21.1)
     */
    record Request(byte[] bytes, String fileName, String fileId, String analyzerVersion) {
    }

    /**
     * 분석기 응답 요약.
     *
     * @param envelopeStatus OK_REVIEW_REQUIRED / PARTIAL / PARSE_FAILED / UNSUPPORTED_FORMAT … (분석기 판정 그대로)
     * @param sourceSha256   분석기가 계산한 원문 SHA-256
     * @param variant        backendImport.variant (OFFICIAL_PDF / EXPERIMENTAL_MULTIFORMAT)
     * @param importable     backendImport.importable
     * @param blockerCodes   backendImport.blockers[].code
     * @param payloadJson    backendImport.payload (없으면 null) — Backend 수신 계약(AnalysisImportRequest) 모양
     */
    record Result(String requestId, String envelopeStatus, String analyzerProfile, String analyzerChannel,
            String sourceSha256, Integer elapsedMs, String variant, boolean importable, List<String> blockerCodes,
            String payloadJson, List<String> warnings, List<String> errorCodes) {
    }
}
