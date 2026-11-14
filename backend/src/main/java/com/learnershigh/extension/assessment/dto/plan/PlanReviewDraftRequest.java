package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * PUT .../revisions/{revisionId}/review-draft (A5 DRAFT 계약). 공유 초안 전체를 바꾼다.
 * baseVersion: 화면이 마지막으로 읽은 초안 version. 초안이 아직 없으면 null. 서버 현재 version과 다르면 409(덮어쓰지 않음).
 * decision: CONFIRMED(후보 그대로 확인) · EDITED(관리자 수정값) · ABSENT(원문에 없음 확인). value는 화면 입력 문자열 그대로.
 * 초안은 학생에게 공개되지 않는다. 확정은 PUT .../review로만 한다.
 */
public record PlanReviewDraftRequest(
        @NotBlank @Size(max = 64) String analysisId,
        @Min(0) Long baseVersion,
        @NotNull @Size(max = 600) List<@Valid @NotNull Decision> decisions,
        @NotNull @Size(max = 50) List<@Valid @NotNull SubjectLink> subjectLinks) {

    public record Decision(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotBlank @Size(max = 300) String fieldPath,
            @NotNull @Pattern(regexp = "CONFIRMED|EDITED|ABSENT") String decision,
            @Size(max = 1000) String value,
            @Min(1) Integer pdfPageNumber) {
    }

    public record SubjectLink(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotBlank @Size(max = 64) String subjectId) {
    }
}
