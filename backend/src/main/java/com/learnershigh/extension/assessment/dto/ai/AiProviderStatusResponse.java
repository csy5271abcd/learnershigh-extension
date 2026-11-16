package com.learnershigh.extension.assessment.dto.ai;

/** AI Provider 연결 상태 (api-contract.md §47-A PROPOSED). configured=false면 화면은 "미연결"로 보여주고 분석 버튼을 막는다 */
public record AiProviderStatusResponse(boolean configured, String provider, String model, boolean ocrSupported, int maxPdfBytes, int maxPdfPages) {
}
