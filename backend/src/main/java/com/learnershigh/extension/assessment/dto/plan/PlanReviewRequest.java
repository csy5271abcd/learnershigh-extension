package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * §39 PUT .../review. decision은 계약에 나온 CONFIRM만 받는다 (공통 평가정보 확인이지 학생 과제 승인/반려가 아니다).
 * value는 JSON 값 그대로 받는다. 원문에 없음은 null로 확인한다(0으로 바꾸지 않는다).
 */
public record PlanReviewRequest(
        @NotBlank @Size(max = 64) String analysisId,
        @NotEmpty @Size(max = 50) List<@Valid @NotNull ReviewedSubject> reviewedSubjects,
        @NotNull @Pattern(regexp = "CONFIRM") String decision,
        @Valid SourceCheck sourceCheck) {

    /** PDF 기존 요청 호환(sourceCheck 없음). */
    public PlanReviewRequest(String analysisId, List<ReviewedSubject> reviewedSubjects, String decision) {
        this(analysisId, reviewedSubjects, decision, null);
    }

    /**
     * HWP·HWPX 원문 확인(M-4 A안). localFileSha256은 브라우저가 관리자가 고른 로컬 원본에서 계산한 값이며 서버 증명이 아니다.
     * manualComparisonConfirmed는 관리자가 원문을 외부 뷰어에서 직접 대조했다는 명시적 확인이다(SHA 일치와 별개). PDF는 not_allowed.
     */
    public record SourceCheck(
            @Size(max = 40) String method,
            @Size(max = 64) String localFileSha256,
            Boolean manualComparisonConfirmed) {
    }

    public record ReviewedSubject(
            @NotBlank @Size(max = 64) String subjectId,
            @NotEmpty @Size(max = 200) List<@Valid @NotNull ConfirmedField> confirmedFields,
            Integer analysisSubjectIndex) {

        public ReviewedSubject(String subjectId, List<ConfirmedField> confirmedFields) {
            this(subjectId, confirmedFields, null);
        }
    }

    public record ConfirmedField(
            @NotBlank @Size(max = 300) String fieldPath,
            Object value,
            @Min(1) Integer pdfPageNumber,
            @Valid AnalysisImportRequest.DocumentLocator documentLocator,
            @Size(max = 20) String absence) {

        public ConfirmedField(String fieldPath, Object value, Integer pdfPageNumber) {
            this(fieldPath, value, pdfPageNumber, null, null);
        }
    }
}
