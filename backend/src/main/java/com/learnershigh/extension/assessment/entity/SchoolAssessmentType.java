package com.learnershigh.extension.assessment.entity;

/**
 * A27-UX 학생이 직접 고르는 수행평가 유형 (개인 관리 정보, api-contract §12 DRAFT).
 * 학교 공식 평가 방법(평가계획서 확정값)과 다르다 — 공식 값을 이 값으로 덮어쓰지 않는다.
 */
public enum SchoolAssessmentType {
    PRESENTATION,
    REPORT,
    PROJECT,
    EXPERIMENT,
    DEBATE,
    PORTFOLIO,
    OTHER
}
