package com.learnershigh.extension.assessment.exception;

import com.learnershigh.extension.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * Assessment AI 분석 Error (api-contract.md §47-A PROPOSED, P-31).
 * PDF_EXTRACTION_FAILED / ASSESSMENT_AI_UNAVAILABLE는 §Error 목록의 기존 초안 code를 그대로 쓴다.
 */
public enum AssessmentAiErrorCode implements ErrorCode {
    AI_PROVIDER_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "AI Provider가 연결되지 않았어요. 서버 설정(assessment.ai.provider, API Key)을 확인해 주세요."),
    ASSESSMENT_AI_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "AI 분석 Provider가 응답하지 않았어요. 잠시 후 다시 시도해 주세요."),
    AI_OUTPUT_INVALID(HttpStatus.BAD_GATEWAY, "AI 응답이 약속한 형식이 아니어서 결과로 쓰지 않았어요. 다시 분석해 주세요."),
    AI_REFUSED(HttpStatus.UNPROCESSABLE_CONTENT, "AI가 이 요청을 처리하지 않았어요. 입력 내용을 확인해 주세요."),
    UNSUPPORTED_FILE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PDF 파일만 분석할 수 있어요."),
    FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일이 너무 커요. 20MB 이하 PDF만 분석할 수 있어요."),
    PDF_EXTRACTION_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "PDF를 읽지 못했어요. 암호가 걸렸거나 손상된 파일일 수 있어요."),
    PDF_TEXT_NOT_FOUND(HttpStatus.UNPROCESSABLE_CONTENT, "PDF에서 글자를 찾지 못했어요. 이미지(스캔)형 PDF는 OCR이 연결되지 않아 분석할 수 없어요. 직접 입력해 주세요."),
    PDF_TOO_MANY_PAGES(HttpStatus.UNPROCESSABLE_CONTENT, "쪽수가 너무 많아요. 120쪽 이하 PDF만 분석할 수 있어요."),
    AI_TRANSFER_NOT_ALLOWED(HttpStatus.UNPROCESSABLE_CONTENT, "원문 이용 조건(외부 AI 전송 허용)을 확인한 원문만 분석할 수 있어요."),
    IDEMPOTENCY_KEY_REUSED(HttpStatus.CONFLICT, "같은 요청 Key로 다른 내용을 보냈어요. 새 Key로 다시 요청해 주세요.");

    private final HttpStatus status;
    private final String message;

    AssessmentAiErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    @Override
    public String code() {
        return name();
    }

    @Override
    public HttpStatus status() {
        return status;
    }

    @Override
    public String message() {
        return message;
    }
}
