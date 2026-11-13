package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * §39 GET 관리자 분석·검토 화면 데이터. subjects는 AI 후보(Candidate)이고 confirmedFields는 사람이 확인한 값이다(서로 다른 데이터).
 * 분석 결과가 없으면 analysisId=null, analysisStatus=NOT_REQUESTED, subjects=[] (빈 결과와 실패는 status로 구분한다).
 */
public record PlanAnalysisResponse(String planId, String documentRevisionId, String analysisId,
        String analysisStatus, String reviewStatus, Analyzer analyzer, OffsetDateTime receivedAt,
        Object subjects, Object warnings, List<ConfirmedFieldView> confirmedFields, Review review) {

    public record Analyzer(String origin, String name, String version) {
    }

    /** sourceReview는 HWP·HWPX 검토에만 붙는다(NON_NULL) — PDF 응답은 이전과 같다. */
    public record Review(String analysisId, String reviewedBy, OffsetDateTime reviewedAt,
            @JsonInclude(JsonInclude.Include.NON_NULL) SourceReviewView sourceReview) {

        public Review(String analysisId, String reviewedBy, OffsetDateTime reviewedAt) {
            this(analysisId, reviewedBy, reviewedAt, null);
        }
    }
}
