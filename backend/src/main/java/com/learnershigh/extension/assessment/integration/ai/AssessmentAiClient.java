package com.learnershigh.extension.assessment.integration.ai;

/**
 * Assessment AI Provider 경계 (P-31 PROPOSED, API-OD-A10 미결).
 * Interface는 외부 경계에만 둔다 (ADR-0005). Provider 선택·비용·재시도 정책은 팀 결정 전이라 설정으로만 켠다.
 * 구현은 structured output Schema를 지키는 객체만 돌려주고, 그 밖의 실패는 BusinessException으로 던진다.
 */
public interface AssessmentAiClient {

    boolean configured();

    String provider();

    String model();

    /**
     * @param instructions 역할·규칙 (원문에 없는 값을 만들지 말 것 등)
     * @param input        분석할 원문 (쪽 표시 포함)
     * @param schema       결과 Schema
     */
    <T> T generate(String instructions, String input, Class<T> schema);
}
