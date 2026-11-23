package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * §39-6 관리자 운영계획 확정 조회·저장 응답. row = 확정된 최종 행, candidate = 원래 분석 후보 행(서로 다른 데이터).
 * review = null이면 아직 확정하지 않았다. candidateRowCount = 최신 분석 결과의 후보 행 수(0이면 운영계획 없음).
 */
public record TeachingPlanReviewResponse(String planId, String revisionId, String latestAnalysisId,
        int candidateRowCount, Review review) {

    /** A13: versionNo = 이 확정 버전(1부터). 이 응답의 review는 최신 버전이다. */
    public record Review(String analysisId, String reviewedBy, OffsetDateTime reviewedAt, List<RowView> rows,
            int versionNo) {

        public Review(String analysisId, String reviewedBy, OffsetDateTime reviewedAt, List<RowView> rows) {
            this(analysisId, reviewedBy, reviewedAt, rows, 1);
        }
    }

    /** A13 §39-10 운영계획 확정 이력(관리자 전용): 최신 → 과거. current = 학생에게 공개 중인 버전. 기록은 불변. */
    public record History(String planId, String revisionId, boolean reReviewOpen, List<Version> items) {
    }

    public record Version(String reviewId, int versionNo, String analysisId, String reviewedBy, OffsetDateTime reviewedAt,
            boolean current, int publishedRowCount, int excludedRowCount, List<RowView> rows) {
    }

    /**
     * A14: origin = ANALYSIS(분석 후보 행, candidate = 원래 후보) · MANUAL(관리자 직접 추가 행, candidate = null).
     * A28-31: decisionBasis = ADMIN(관리자 결정·추가) · AI_DEFAULT(최종 승인이 후보를 기본값으로 채택) · null(근거 기록 전 확정).
     */
    public record RowView(int subjectIndex, String rowKey, String subjectId, String decision, Object row,
            Object candidate, String origin, String decisionBasis) {
    }
}
