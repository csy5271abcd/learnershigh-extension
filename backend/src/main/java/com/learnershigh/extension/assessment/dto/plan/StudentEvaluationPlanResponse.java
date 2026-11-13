package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;

/**
 * §10-1 학생 공통 평가계획서 항목. 문서마다 최신 Revision 하나를 보여 준다.
 * AI 분석 후보는 이 응답에 포함하지 않는다 (확정 전 후보는 학생에게 공개하지 않음).
 */
public record StudentEvaluationPlanResponse(String planId, String documentRevisionId, String schoolId,
        int academicYear, int grade, int semester, String fileName, String sourceUrl, String reviewStatus,
        OffsetDateTime uploadedAt) {
}
