package com.learnershigh.extension.assessment.integration.ai;

import com.learnershigh.extension.assessment.exception.AssessmentAiErrorCode;
import com.learnershigh.extension.common.error.BusinessException;

/** Provider가 설정되지 않은 기본 상태. 가짜 결과를 만들지 않고 항상 503 AI_PROVIDER_NOT_CONFIGURED를 낸다 */
public class UnconfiguredAssessmentAiClient implements AssessmentAiClient {

    @Override
    public boolean configured() {
        return false;
    }

    @Override
    public String provider() {
        return "none";
    }

    @Override
    public String model() {
        return null;
    }

    @Override
    public <T> T generate(String instructions, String input, Class<T> schema) {
        throw new BusinessException(AssessmentAiErrorCode.AI_PROVIDER_NOT_CONFIGURED);
    }
}
