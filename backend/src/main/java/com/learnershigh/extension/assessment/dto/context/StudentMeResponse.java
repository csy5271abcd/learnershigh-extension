package com.learnershigh.extension.assessment.dto.context;

/** A28-12 GET /api/student/assessment/me (api-contract.md §9-0). 학생 본인의 표시 이름만(없으면 null). */
public record StudentMeResponse(String studentId, String displayName) {
}
