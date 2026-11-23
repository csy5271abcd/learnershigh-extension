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
     * checksum: 서버가 계산해 저장한 원본 SHA-256(hex). api-contract §48 File Contract의 `checksum` 이름을 따른다.
     * fileRef: 불투명 파일 참조(plan_file_<revisionId>), 원문이 없으면 null. file: 원문 보관·미리보기 상태(§48 모양).
     * 2026-11-13 이전 등록분은 원문을 보관하지 않아 file.available=false다.
     * documentFormat: PDF / HWP / HWPX (다중 형식 실험, 공식 Enum 아님). pageCount는 PDF에만 있다.
     */
    public record Revision(String documentRevisionId, int revisionNumber, String fileName, String fileRef,
            long sizeBytes, Integer pageCount, String sourceUrl, OffsetDateTime uploadedAt, String analysisStatus,
            String reviewStatus, List<ConfirmedFieldView> confirmedFields, String checksum, String documentFormat,
            @JsonInclude(JsonInclude.Include.NON_NULL) SourceReviewView sourceReview, PlanFileView file) {
    }
}
