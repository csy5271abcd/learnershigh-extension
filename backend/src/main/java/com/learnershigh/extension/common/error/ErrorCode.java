package com.learnershigh.extension.common.error;

import org.springframework.http.HttpStatus;

/** 공통 Error 형식의 code / HTTP Status / 기본 message (api-contract.md §5). Domain별 enum이 구현한다. */
public interface ErrorCode {

    String code();

    HttpStatus status();

    String message();
}
