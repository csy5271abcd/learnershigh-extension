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
     * 역전이(완료 → 진행 중 등) 정책은 미확정이라 허용하지 않는다 (§13 "역전이 정책이 확정되지 않으면 임의 허용하지 않는다").
     * 같은 상태로의 요청은 변경 없음으로 허용한다(재시도 안전). 앞으로 건너뛰기(시작 전 → 완료)는 §13이 허용한다.
     */
    public boolean canMoveTo(SchoolAssessmentStatus target) {
        return target.ordinal() >= ordinal();
    }
}
