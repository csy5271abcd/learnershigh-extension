package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.ErrorResponse;
import com.learnershigh.extension.common.error.ErrorResponses;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * AI 분석 API의 multipart 입력 오류를 공통 Error 형식으로 바꾼다 (공통 GlobalExceptionHandler는 바꾸지 않는다).
 * 파일 Part가 없으면 500이 아니라 400 VALIDATION_ERROR(field=file).
 */
@RestControllerAdvice(assignableTypes = AssessmentAiController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
class AssessmentAiExceptionAdvice {

    @ExceptionHandler(MissingServletRequestPartException.class)
    ResponseEntity<ErrorResponse> missingPart(MissingServletRequestPartException exception) {
        return ErrorResponses.of(CommonErrorCode.VALIDATION_ERROR, ErrorResponses.field(exception.getRequestPartName(), "required"));
    }
}
