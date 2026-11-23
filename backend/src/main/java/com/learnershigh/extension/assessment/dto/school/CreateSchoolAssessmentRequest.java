package com.learnershigh.extension.assessment.dto.school;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * §12 POST 직접 등록 / 평가계획서 항목 선택 등록. 필수는 제목·과목·학기 Context다.
 * 마감일·설명을 모르면 null로 보낸다 (서버가 값을 만들어 넣지 않는다). status를 생략하면 BEFORE_START.
 * 소유 학생은 인증에서 정한다: Body에 studentId가 와도 쓰지 않는다.
 */
public record CreateSchoolAssessmentRequest(
        @NotBlank @Size(max = 200) String title,
        /* A27-UX(§12-a): newSubjectName과 둘 중 하나만 보낸다 */
        @Size(max = 64) String subjectId,
        @NotNull @Min(2000) @Max(2100) Integer academicYear,
        @NotNull @Min(1) @Max(2) Integer semester,
        LocalDate deadlineDate,
        @Size(max = 2000) String description,
        @Pattern(regexp = "BEFORE_START|IN_PROGRESS|COMPLETED") String status,
        @Valid EvaluationItemRefDto evaluationItemRef,
        @Pattern(regexp = "PRESENTATION|REPORT|PROJECT|EXPERIMENT|DEBATE|PORTFOLIO|OTHER") String assessmentType,
        LocalDate evaluationDate,
        @Min(0) @Max(100) Integer weightPercent,
        @Size(max = 500) String submissions,
        @Size(max = 2000) String personalMemo,
        /* A27-UX 학생 화면(2026-11-19 DRAFT §12-a·§12-b) */
        @Size(max = 50) String newSubjectName,
        @Size(max = 50) String assessmentTypeLabel) {

    /** 이전 호출(A27-UX 이전 필드만) 호환 */
    public CreateSchoolAssessmentRequest(String title, String subjectId, Integer academicYear, Integer semester,
            LocalDate deadlineDate, String description, String status, EvaluationItemRefDto evaluationItemRef) {
        this(title, subjectId, academicYear, semester, deadlineDate, description, status, evaluationItemRef, null, null,
                null, null, null, null, null);
    }

    /** A27-UX 학생 개인 관리 정보(2026-11-17) 형태 호환 */
    public CreateSchoolAssessmentRequest(String title, String subjectId, Integer academicYear, Integer semester,
            LocalDate deadlineDate, String description, String status, EvaluationItemRefDto evaluationItemRef,
            String assessmentType, LocalDate evaluationDate, Integer weightPercent, String submissions,
            String personalMemo) {
        this(title, subjectId, academicYear, semester, deadlineDate, description, status, evaluationItemRef,
                assessmentType, evaluationDate, weightPercent, submissions, personalMemo, null, null);
    }
}
