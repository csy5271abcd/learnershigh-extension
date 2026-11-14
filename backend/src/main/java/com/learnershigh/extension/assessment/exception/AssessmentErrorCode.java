package com.learnershigh.extension.assessment.exception;

import com.learnershigh.extension.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * 신규 Assessment Error Code (api-contract.md §53 초안의 code만 사용한다).
 * §53에 없는 code는 새로 만들지 않는다. 필요하면 계약 개정 제안으로 남긴다.
 */
public enum AssessmentErrorCode implements ErrorCode {
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    ASSESSMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "수행평가를 찾을 수 없습니다."),
    INVALID_STATE_TRANSITION(HttpStatus.CONFLICT, "현재 상태에서 해당 동작을 할 수 없습니다."),
    UNSUPPORTED_FILE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PDF 파일만 등록할 수 있어요."),
    FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일이 너무 커요. 20MB 이하 PDF만 등록할 수 있어요."),
    PDF_EXTRACTION_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "PDF를 읽지 못했어요. 암호가 걸렸거나 손상된 파일일 수 있어요."),
    // ---- 학생 기록 (2026-11-11, §53에 있는 code만) ----
    NOTE_NOT_FOUND(HttpStatus.NOT_FOUND, "노트를 찾을 수 없습니다."),
    NOTE_REVISION_NOT_FOUND(HttpStatus.NOT_FOUND, "노트 기록을 찾을 수 없습니다."),
    RESOURCE_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 곳에서 먼저 저장됐어요. 최신 내용을 확인한 뒤 다시 저장해 주세요."),
    ARTIFACT_NOT_FOUND(HttpStatus.NOT_FOUND, "결과물을 찾을 수 없습니다."),
    ARTIFACT_VERSION_NOT_FOUND(HttpStatus.NOT_FOUND, "결과물 버전을 찾을 수 없습니다."),
    PREVIEW_UNAVAILABLE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "이 형식은 앱 안 미리보기를 지원하지 않아요. 원본을 내려받아 확인해 주세요."),
    FILE_INTEGRITY_FAILED(HttpStatus.CONFLICT, "저장된 파일이 등록 당시와 달라 열 수 없어요."),
    PLAN_ANALYZER_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "평가계획서 분석기가 서버에 설정되지 않았어요."),
    PLAN_ANALYZER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "평가계획서 분석기에 연결하지 못했거나 응답이 늦어요. 잠시 후 다시 시도해 주세요."),
    PLAN_ANALYZER_BAD_RESPONSE(HttpStatus.BAD_GATEWAY, "분석기 결과를 저장할 수 없어요. 결과 형식이 계약과 맞지 않아요."),
    PLAN_ANALYSIS_IN_PROGRESS(HttpStatus.CONFLICT, "이 개정본을 이미 분석하고 있어요. 끝난 뒤 결과를 확인해 주세요."),
    PLAN_ANALYSIS_UNSUPPORTED(HttpStatus.UNPROCESSABLE_CONTENT, "이 개정본은 지금 서버 분석을 실행할 수 없어요."),
    PLAN_FILE_DUPLICATE(HttpStatus.CONFLICT, "같은 파일이 이미 이 평가계획서의 개정본으로 등록되어 있어요."),
    FILE_VERSION_MISMATCH(HttpStatus.CONFLICT, "다른 버전이 먼저 올라왔어요. 버전 목록을 확인한 뒤 다시 올려 주세요."),
    FEEDBACK_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "피드백 요청을 찾을 수 없습니다."),
    FEEDBACK_ALREADY_DELIVERED(HttpStatus.CONFLICT, "이미 전달된 피드백이에요. 전달 후에는 바꿀 수 없어요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 자원을 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String message;

    AssessmentErrorCode(HttpStatus status, String message) {
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
