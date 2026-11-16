package com.learnershigh.extension.assessment.integration.analysis;

/** 분석기 호출 실패. kind로 원인을 나눈다. 메시지에 토큰·원문 내용을 넣지 않는다. */
public class PlanAnalyzerException extends RuntimeException {

    public enum Kind {
        /** base-url·토큰이 설정되지 않음 */
        NOT_CONFIGURED,
        /** 연결 실패(꺼짐·거부) — 재시도 대상 */
        CONNECTION_FAILED,
        /** 분석기 동시 처리 상한(503 BUSY) — 재시도 대상 */
        BUSY,
        /** 응답 시간 초과 — 재시도하지 않는다(분석기에서 아직 처리 중일 수 있음) */
        TIMEOUT,
        /** 토큰 불일치(401) — 서버 설정 오류 */
        AUTH_FAILED,
        /** 분석기가 요청·파일을 거절(4xx: 형식·크기 등) */
        REJECTED,
        /** 분석기 내부 오류(5xx) */
        SERVER_ERROR,
        /** 응답이 JSON이 아니거나 필수 값이 없음 */
        BAD_RESPONSE
    }

    private final Kind kind;
    private final String analyzerCode;

    public PlanAnalyzerException(Kind kind, String analyzerCode, String message) {
        super(message);
        this.kind = kind;
        this.analyzerCode = analyzerCode;
    }

    public Kind kind() {
        return kind;
    }

    /** 분석기가 준 오류 code (예: FILE_TOO_LARGE, SHA_MISMATCH). 없으면 null. */
    public String analyzerCode() {
        return analyzerCode;
    }
}
