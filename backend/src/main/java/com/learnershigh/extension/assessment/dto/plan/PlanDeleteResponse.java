package com.learnershigh.extension.assessment.dto.plan;

import java.time.Instant;

/**
 * 평가계획서 삭제 결과 (A25 · api-contract.md §38-9 DRAFT). wasPublished=true면 학생 공개가 함께 해제됐다.
 * revisionCount는 보존된(지우지 않은) 개정본 수다.
 */
public record PlanDeleteResponse(String planId, String schoolId, Instant deletedAt, boolean wasPublished,
        int revisionCount) {
}
