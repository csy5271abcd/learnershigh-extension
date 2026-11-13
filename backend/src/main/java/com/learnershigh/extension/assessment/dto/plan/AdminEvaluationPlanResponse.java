package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * §38 GET 관리자 평가계획서 (문서 + 개정 이력). Revision은 오래된 것부터 순번대로.
 * analysisStatus: 분석 결과가 없으면 NOT_REQUESTED, 있으면 가장 최근 결과의 상태.
 */
public record AdminEvaluationPlanResponse(String planId, String schoolId, int academicYear, int grade, int semester,
        List<Revision> revisions) {

    /**
     * checksum: 서버가 계산해 저장한 원본 PDF SHA-256(hex). api-contract §48 File Contract의 `checksum` 이름을 따른다.
     * 서버는 원본 바이트를 보관하지 않으므로, 관리자가 가진 원본 파일이 같은 문서인지 브라우저에서 대조하는 용도다.
     * documentFormat: PDF / HWP / HWPX (다중 형식 실험, 공식 Enum 아님). pageCount는 PDF에만 있다.
     */
    public record Revision(String documentRevisionId, int revisionNumber, String fileName, String fileRef,
            long sizeBytes, Integer pageCount, String sourceUrl, OffsetDateTime uploadedAt, String analysisStatus,
            String reviewStatus, List<ConfirmedFieldView> confirmedFields, String checksum, String documentFormat,
            @JsonInclude(JsonInclude.Include.NON_NULL) SourceReviewView sourceReview) {

        public Revision(String documentRevisionId, int revisionNumber, String fileName, String fileRef, long sizeBytes,
                Integer pageCount, String sourceUrl, OffsetDateTime uploadedAt, String analysisStatus,
                String reviewStatus, List<ConfirmedFieldView> confirmedFields, String checksum, String documentFormat) {
            this(documentRevisionId, revisionNumber, fileName, fileRef, sizeBytes, pageCount, sourceUrl, uploadedAt,
                    analysisStatus, reviewStatus, confirmedFields, checksum, documentFormat, null);
        }
    }
}
