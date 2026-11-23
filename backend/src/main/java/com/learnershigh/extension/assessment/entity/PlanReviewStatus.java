package com.learnershigh.extension.assessment.entity;

/**
 * 평가계획서 Revision의 관리자 검토 상태. api-contract.md §10·§38 예시에 나온 두 값만 쓴다.
 * "검토 중" 단계와 "대체됨" 표시는 Enum이 미확정(domain.md §9-2)이라 만들지 않는다.
 * CONFIRMED는 사람이 PUT .../review를 호출했을 때만 된다 (AI 결과가 자동으로 바꾸지 않는다).
 */
public enum PlanReviewStatus {
    UNREVIEWED,
    CONFIRMED
}
