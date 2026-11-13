package com.learnershigh.extension.assessment.integration.auth;

import java.util.Set;

/**
 * 인증된 관리자.
 *
 * @param branchIds              학생 Assessment 기록을 읽을 수 있는 지점 (domain.md §17)
 * @param planOperationSchoolIds 평가계획서 등록·개정·검토를 맡은 학교. 운영 권한 범위(전체/기관/지점)는 OD-A08 미결이라
 *                               학생 기록 조회 권한과 분리해 명시적으로만 준다 (domain.md §18).
 */
public record AdminActor(String adminId, Set<String> branchIds, Set<String> planOperationSchoolIds) {

    public AdminActor {
        branchIds = Set.copyOf(branchIds);
        planOperationSchoolIds = Set.copyOf(planOperationSchoolIds);
    }

    public boolean canOperatePlansOf(String schoolId) {
        return planOperationSchoolIds.contains(schoolId);
    }
}
