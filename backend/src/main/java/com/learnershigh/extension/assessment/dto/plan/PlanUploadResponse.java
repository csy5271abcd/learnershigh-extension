package com.learnershigh.extension.assessment.dto.plan;

/**
 * §38 POST evaluation-plans / revisions 응답 (201).
 * fileRef는 File Storage 미결(API-OD-A03)이라 null이다: 원본 바이트를 보관하지 않으므로 업로드 완료로 보지 않는다.
 */
public record PlanUploadResponse(String planId, String documentRevisionId, String schoolId, int academicYear,
        int grade, int semester, String fileRef, String analysisStatus, String reviewStatus) {
}
