package com.learnershigh.extension.assessment.dto.plan;

/**
 * §38 POST evaluation-plans / revisions 응답 (201).
 * fileRef: 원문을 Storage에 보관한 뒤의 불투명 파일 참조(plan_file_<revisionId>). 저장 키·경로가 아니다 (S-4·S-5, 2026-11-13).
 */
public record PlanUploadResponse(String planId, String documentRevisionId, String schoolId, int academicYear,
        int grade, int semester, String fileRef, String analysisStatus, String reviewStatus) {
}
