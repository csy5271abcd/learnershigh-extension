package com.learnershigh.extension.studentcare.exception;

import com.learnershigh.extension.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/** 학생 케어 Error Code (api-contract.md §65, docs/specs/wangyu/domain.md §5). */
public enum StudentCareErrorCode implements ErrorCode {
    BRANCH_NOT_FOUND(HttpStatus.NOT_FOUND, "지점을 찾을 수 없습니다."),
    STUDENT_NOT_FOUND(HttpStatus.NOT_FOUND, "학생을 찾을 수 없습니다."),
    CARE_CASE_NOT_FOUND(HttpStatus.NOT_FOUND, "관리 기록을 찾을 수 없습니다."),
    ACTIVE_CARE_CASE_EXISTS(HttpStatus.CONFLICT, "이미 관리 중인 학생입니다."),
    STUDENT_NOT_FLAGGED(HttpStatus.CONFLICT, "특이사항이 없는 학생입니다."),
    RECHECK_NOT_DUE(HttpStatus.CONFLICT, "아직 점검일이 아닙니다."),
    INVALID_STATE_TRANSITION(HttpStatus.CONFLICT, "이미 관리 종료된 학생입니다."),
    INVALID_RECHECK_DATE(HttpStatus.UNPROCESSABLE_CONTENT, "다음 점검일은 내일부터 28일 안에서 고르세요."),
    INVALID_CARE_SETTINGS(HttpStatus.UNPROCESSABLE_CONTENT, "특이사항 기준 범위를 확인하세요.");

    private final HttpStatus status;
    private final String message;

    StudentCareErrorCode(HttpStatus status, String message) {
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
