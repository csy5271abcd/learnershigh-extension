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
        @NotNull @Size(max = 50) List<@Valid @NotNull SubjectLink> subjectLinks,
        // A27-UX 관리자 추가 수정(DRAFT): 이 문서 검토 대상에서 뺀 분석 과목. null = 보내지 않음(기존 제외를 그대로 둔다)
        @Size(max = 50) List<@Valid @NotNull SubjectExclusion> subjectExclusions) {

    /** 이전 클라이언트(제외 필드 없음)와 같은 모양 */
    public PlanReviewDraftRequest(String analysisId, Long baseVersion, List<Decision> decisions, List<SubjectLink> subjectLinks) {
        this(analysisId, baseVersion, decisions, subjectLinks, null);
    }

    /**
     * 과목 제외 = 삭제가 아니다. 원문·AI 원본 추출값·근거 위치·확정 이력은 그대로 두고, 이 문서·학년·학기 검토와 확정·학생 공개에서만 뺀다.
     * reason: OTHER_GRADE(다른 학년) · DUPLICATE(중복 추출) · NOT_THIS_TERM(현재 학기와 무관) · OTHER(기타)
     */
    public record SubjectExclusion(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotNull @Pattern(regexp = "OTHER_GRADE|DUPLICATE|NOT_THIS_TERM|OTHER") String reason,
            @Size(max = 200) String note) {
    }

    public record Decision(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotBlank @Size(max = 300) String fieldPath,
            @NotNull @Pattern(regexp = "CONFIRMED|EDITED|ABSENT") String decision,
            // A12: 채점표 전체(JSON 글자)를 한 결정으로 담을 수 있게 확정값 한도(4,000)와 맞춘다
            @Size(max = 4000) String value,
            @Min(1) Integer pdfPageNumber) {
    }

    public record SubjectLink(
            @NotNull @Min(0) @Max(49) Integer subjectIndex,
            @NotBlank @Size(max = 64) String subjectId) {
    }
}
