package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * A12 §39-8 확정 이력 (관리자 전용). 한 Revision의 확정 기록을 최신 → 과거 순으로. 기록은 불변이며 current = 학생에게 공개 중인 최신 기록.
 * 학생 응답에는 쓰지 않는다.
 */
public record PlanReviewHistoryResponse(String planId, String revisionId, boolean reReviewOpen, List<Item> items) {

    public record Item(String reviewId, String analysisId, String reviewedBy, OffsetDateTime reviewedAt, boolean current,
            int confirmedFieldCount, List<ConfirmedFieldView> confirmedFields) {
    }
}
