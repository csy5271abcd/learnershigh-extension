package com.learnershigh.extension.assessment.dto.school;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * §12 목록·상세·등록 응답. Student / Admin이 같은 assessmentId와 상태를 본다.
 * 계약에 없는 필드(학기·설명 등)는 내보내지 않는다 (frontend types.ts SchoolAssessment와 같은 Shape).
 */
public record SchoolAssessmentResponse(String assessmentId, String title, String subjectId, String status,
        LocalDate deadlineDate, OffsetDateTime createdAt, EvaluationItemRefDto evaluationItemRef,
        /* A27-UX 학생 개인 관리 정보 (§12 DRAFT). 없으면 null */
        String description, String assessmentType, LocalDate evaluationDate, Integer weightPercent, String submissions,
        String personalMemo, OffsetDateTime updatedAt,
        /* A27-UX 학생 화면(2026-11-19 DRAFT §12-b): '기타' 직접 입력. OTHER가 아니면 null */
        String assessmentTypeLabel,
        /* A28-20 학교 확정 자동 등록 정보(§12-c). 학생 직접 등록이면 null */
        Official official) {

    /** 학교 확정 원본에서 온 공식 값(학생이 바꿀 수 없음). status: ACTIVE | WITHDRAWN(재확정에서 빠짐) */
    public record Official(String planId, String status, String timing, java.math.BigDecimal weightPercent,
            java.math.BigDecimal maxScore) {
    }

    /** A28-20 이전 모양(공식 정보 없음) */
    public SchoolAssessmentResponse(String assessmentId, String title, String subjectId, String status, LocalDate deadlineDate,
            OffsetDateTime createdAt, EvaluationItemRefDto evaluationItemRef, String description, String assessmentType,
            LocalDate evaluationDate, Integer weightPercent, String submissions, String personalMemo, OffsetDateTime updatedAt,
            String assessmentTypeLabel) {
        this(assessmentId, title, subjectId, status, deadlineDate, createdAt, evaluationItemRef, description, assessmentType,
                evaluationDate, weightPercent, submissions, personalMemo, updatedAt, assessmentTypeLabel, null);
    }
}
