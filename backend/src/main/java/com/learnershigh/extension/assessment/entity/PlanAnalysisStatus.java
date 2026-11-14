package com.learnershigh.extension.assessment.entity;

/**
 * 저장된 분석 결과(AnalysisRun)의 상태. 성공 결과도 사람이 확인하기 전까지는 REVIEW_REQUIRED다 (domain.md §9-2).
 * DB 제약(ck_assessment_plan_analysis_status, V202611140100)이 이 세 값만 허용한다.
 *
 * <p>PARTIAL(A3.5, 2026-11-14): 분석기가 부분 결과로 판정한 Run. 추출된 과목·항목만 후보로 담고, 빠진 부분은 분석기 경고·오류로 남긴다.
 * REVIEW_REQUIRED로 바꾸지 않는다. 관리자는 원문과 대조해 확정할 수 있다(FAILED만 확정 불가).
 * PROCESSING 등 비동기 상태는 아직 쓰지 않는다(분석 실행은 요청 안에서 끝나는 동기 방식).
 */
public enum PlanAnalysisStatus {
    REVIEW_REQUIRED,
    PARTIAL,
    FAILED
}
