package com.learnershigh.extension.assessment.integration.analysis;

/** 분석기가 설정되지 않은 기본 상태. 가짜 결과를 만들지 않고 항상 NOT_CONFIGURED를 낸다. */
public class UnconfiguredPlanAnalyzerClient implements PlanAnalyzerClient {

    @Override
    public boolean configured() {
        return false;
    }

    @Override
    public Result analyze(Request request) {
        throw new PlanAnalyzerException(PlanAnalyzerException.Kind.NOT_CONFIGURED, null, "analyzer not configured");
    }
}
