package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * §39-6 관리자 운영계획 확정 조회·저장 응답. row = 확정된 최종 행, candidate = 원래 분석 후보 행(서로 다른 데이터).
 * review = null이면 아직 확정하지 않았다. candidateRowCount = 최신 분석 결과의 후보 행 수(0이면 운영계획 없음).
 */
public record TeachingPlanReviewResponse(String planId, String revisionId, String latestAnalysisId,
        int candidateRowCount, Review review) {

    public record Review(String analysisId, String reviewedBy, OffsetDateTime reviewedAt, List<RowView> rows) {
    }

    public record RowView(int subjectIndex, String rowKey, String subjectId, String decision, Object row,
            Object candidate) {
    }
}
