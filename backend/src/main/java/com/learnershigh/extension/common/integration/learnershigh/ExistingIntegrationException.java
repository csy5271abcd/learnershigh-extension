package com.learnershigh.extension.common.integration.learnershigh;

/** Existing LearnersHigh 연동 실패. 빈 데이터로 바꾸지 않고 503으로 응답한다 (api-contract.md §6). */
public class ExistingIntegrationException extends RuntimeException {

    public ExistingIntegrationException(String message) {
        super(message);
    }
}
