package com.learnershigh.extension.assessment.integration.auth;

import java.util.Set;

/**
 * 인증된 관리자.
 *
 * @param branchIds              학생 Assessment 기록을 읽을 수 있는 지점 (domain.md §17). 학생 기록·노트·피드백 조회 범위다.
 * @param evaluationPlanOperator 평가계획서(공통 문서) 등록·개정·분석·검토·확정 권한. 학교 범위는 두지 않는다.
 *                               OD-A08 결정(2026-11-13 사용자 승인): 정상 인증된 관리자는 모든 학교의 평가계획서를 운영한다.
 *                               이 값은 인증 경계(AssessmentActorProvider)가 정한다 — 실제 LearnersHigh 인증 연동 시 그
 *                               Adapter가 관리자 역할에 따라 같은 값을 채운다. 학생 기록 조회 권한(branchIds)과는 별개다.
 */
public record AdminActor(String adminId, Set<String> branchIds, boolean evaluationPlanOperator) {

    public AdminActor {
        branchIds = Set.copyOf(branchIds);
    }

    /** 평가계획서 운영 가능 여부. 학교와 무관하다(모든 학교). */
    public boolean canOperateEvaluationPlans() {
        return evaluationPlanOperator;
    }
}
