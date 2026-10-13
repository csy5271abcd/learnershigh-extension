package com.learnershigh.extension.studentcare.exception;

import com.learnershigh.extension.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/** 학생 케어 Error Code (api-contract.md §65, docs/specs/wangyu/domain.md §5). */
public enum StudentCareErrorCode implements ErrorCode {
    BRANCH_NOT_FOUND(HttpStatus.NOT_FOUND, "지점을 찾을 수 없습니다."),
    STUDENT_NOT_FOUND(HttpStatus.NOT_FOUND, "학생을 찾을 수 없습니다."),
    CARE_CASE_NOT_FOUND(HttpStatus.NOT_FOUND, "케어 건을 찾을 수 없습니다."),
    ACTIVE_CARE_CASE_EXISTS(HttpStatus.CONFLICT, "이미 조정이 진행 중인 학생입니다."),
    STUDENT_NOT_FLAGGED(HttpStatus.CONFLICT, "지금 확인할 변화가 없는 학생입니다."),
    RECHECK_NOT_DUE(HttpStatus.CONFLICT, "재점검일이 아직 되지 않았습니다."),
    INVALID_STATE_TRANSITION(HttpStatus.CONFLICT, "이미 종결된 케어 건입니다."),
    PLAN_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "목표와 행동을 입력해주세요."),
    STUDENT_AGREEMENT_REQUIRED(HttpStatus.UNPROCESSABLE_CONTENT, "학생과 합의한 뒤 조정을 시작할 수 있습니다."),
    INVALID_RECHECK_DATE(HttpStatus.UNPROCESSABLE_CONTENT, "재점검일은 기준일 다음 날부터 28일 안에서 고를 수 있습니다."),
    INVALID_CARE_SETTINGS(HttpStatus.UNPROCESSABLE_CONTENT, "기준값 범위를 확인해주세요.");

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
