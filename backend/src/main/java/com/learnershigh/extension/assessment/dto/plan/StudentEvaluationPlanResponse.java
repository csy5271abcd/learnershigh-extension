package com.learnershigh.extension.assessment.dto.plan;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * §10-1 학생 공통 평가계획서 항목. 관리자가 확정(CONFIRM)한 Revision만, 문서마다 가장 최근에 확정된 Revision 하나를 보여 준다.
 * 업로드·분석만 된 문서(UNREVIEWED)는 학생에게 보이지 않는다 (2026-11-13 OD-A08 결정: 확정·공유 절차를 거친 문서만 제공).
 * AI 분석 후보는 이 응답에 포함하지 않는다. file: 원문 열람 정보(§48 모양).
 * confirmedFields: 상세(GET {planId})에만 붙는 그 Revision의 관리자 확정값(A3.5 DRAFT). 목록에서는 빠진다(NON_NULL).
 */
public record StudentEvaluationPlanResponse(String planId, String documentRevisionId, String schoolId,
        int academicYear, int grade, int semester, String fileName, String sourceUrl, String reviewStatus,
        OffsetDateTime uploadedAt, PlanFileView file,
        @JsonInclude(JsonInclude.Include.NON_NULL) List<StudentConfirmedFieldView> confirmedFields) {

    public StudentEvaluationPlanResponse withConfirmedFields(List<StudentConfirmedFieldView> fields) {
        return new StudentEvaluationPlanResponse(planId, documentRevisionId, schoolId, academicYear, grade, semester,
                fileName, sourceUrl, reviewStatus, uploadedAt, file, fields);
    }
}
