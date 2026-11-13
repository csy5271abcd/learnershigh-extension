package com.learnershigh.extension.assessment.entity;

/**
 * 저장된 분석 결과(AnalysisRun)의 상태. 성공 결과도 사람이 확인하기 전까지는 REVIEW_REQUIRED다 (domain.md §9-2).
 * DB 제약(ck_assessment_plan_analysis_status)이 이 두 값만 허용한다.
 *
 * <p>분석기의 부분 결과(PARTIAL)는 아직 저장할 상태가 없다: REVIEW_REQUIRED로 바꿔 저장하지 않고, 서버 분석 실행(A3)은
 * 422 PLAN_ANALYSIS_PARTIAL_NOT_STORABLE로 알린다. PARTIAL 저장은 계약(§39 "부분 성공 구분")·Migration 승인 후 추가한다.
 * PROCESSING 등 비동기 상태도 아직 쓰지 않는다(분석 실행은 요청 안에서 끝나는 동기 방식).
 */
public enum PlanAnalysisStatus {
    REVIEW_REQUIRED,
    FAILED
}
