package com.learnershigh.extension.assessment.dto.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest.Schedule;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * PUT .../revisions/{revisionId}/teaching-plan-review (api-contract.md §39-6 DRAFT, 2026-11-15).
 * 요청에 없는 후보 행은 공개하지 않는다. EDITED만 edits를 갖는다.
 * edits 문자열: null = 후보 그대로, 빈 문자열 = 값 지움(원문에 없음). schedule: null = 후보 그대로.
 */
public record TeachingPlanReviewRequest(
        @NotBlank @Size(max = 64) String analysisId,
        @NotNull @Size(min = 1, max = 2000) List<@NotNull @Valid Row> rows) {

    public record Row(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotBlank @Size(max = 50) String rowKey,
            @NotBlank @Size(max = 64) String subjectId,
            @NotNull @Pattern(regexp = "CONFIRMED|EDITED|EXCLUDED") String decision,
            @Valid Edits edits) {
    }

    public record Edits(
            @Size(max = 300) String unit,
            @Size(max = 4000) String content,
            @Size(max = 1000) String note,
            @Size(max = 200) String specialSchedule,
            @Valid Schedule schedule) {
    }
}
