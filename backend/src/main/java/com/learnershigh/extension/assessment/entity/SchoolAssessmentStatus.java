package com.learnershigh.extension.assessment.entity;

/**
 * 학교 수행평가의 학생 자기 관리 상태 (api-contract.md §13: 이 세 값만 사용).
 * 공식 제출·점수 확정·관리자 승인이 아니다. 구형 8단계 Workflow를 쓰지 않는다.
 */
public enum SchoolAssessmentStatus {
    BEFORE_START,
    IN_PROGRESS,
    COMPLETED;

    /**
     * A27-UX(사용자 결정 2026-11-17, api-contract §13 갱신): 학생 자기 관리 상태라 앞으로·되돌리기 모두 허용한다.
     * 교사 평가·공식 제출 상태가 아니므로 권한 정책과 충돌하지 않는다. 바뀐 내역은 상태 이력(status event)에 남긴다.
     */
    public boolean canMoveTo(SchoolAssessmentStatus target) {
        return target != null;
    }
}
