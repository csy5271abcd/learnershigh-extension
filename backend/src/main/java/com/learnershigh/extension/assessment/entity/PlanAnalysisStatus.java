package com.learnershigh.extension.assessment.entity;

/**
 * 저장된 분석 결과(AnalysisRun)의 상태. api-contract.md §11 예시 값 중 외부 결과 수신에 필요한 두 값만 쓴다.
 * 성공 결과도 사람이 확인하기 전까지는 REVIEW_REQUIRED다 (domain.md §9-2). PROCESSING 등 비동기 상태는 서버 분석 실행이 없어 쓰지 않는다.
 */
public enum PlanAnalysisStatus {
    REVIEW_REQUIRED,
    FAILED
}
