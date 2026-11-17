package com.learnershigh.extension.assessment.dto.ai;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 모의고사 지문 AI 분석 요청 (api-contract.md §47-A PROPOSED).
 * aiTransferConfirmed: 관리자가 원문 이용 조건상 외부 AI 전송이 가능하다고 확인했는지. false면 422 AI_TRANSFER_NOT_ALLOWED.
 */
public record MockExamAnalysisRequest(
        @NotBlank @Size(max = 20) String subjectName,
        @Min(2000) @Max(2100) Integer academicYear,
        @Min(1) @Max(12) Integer examMonth,
        @Min(1) @Max(3) Integer grade,
        @Size(max = 20) String questionNumber,
        @Size(max = 40) String fieldHint,
        @NotBlank @Size(min = 50, max = 20000) String passageText,
        @NotNull Boolean aiTransferConfirmed) {

    @AssertTrue
    boolean isPassageNotOnlyWhitespace() {
        return passageText == null || passageText.strip().length() >= 50;
    }
}
