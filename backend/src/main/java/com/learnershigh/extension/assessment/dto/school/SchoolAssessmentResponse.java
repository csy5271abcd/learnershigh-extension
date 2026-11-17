package com.learnershigh.extension.assessment.dto.school;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * §12 목록·상세·등록 응답. Student / Admin이 같은 assessmentId와 상태를 본다.
 * 계약에 없는 필드(학기·설명 등)는 내보내지 않는다 (frontend types.ts SchoolAssessment와 같은 Shape).
 */
public record SchoolAssessmentResponse(String assessmentId, String title, String subjectId, String status,
        LocalDate deadlineDate, OffsetDateTime createdAt, EvaluationItemRefDto evaluationItemRef) {
}
