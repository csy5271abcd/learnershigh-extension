package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * POST evaluation-plans/import-from-schoolinfo: 학교 이름으로 학교알리미 평가계획 파일을 받아 등록하고 바로 분석한다.
 * defaultGrade: 파일 이름에 학년이 없을 때 쓸 학년.
 */
public record SchoolInfoImportRequest(
        @NotBlank @Size(max = 64) String schoolId,
        @NotBlank @Size(max = 60) String schoolName,
        @Min(2000) @Max(2100) int academicYear,
        @Min(1) @Max(2) int semester,
        @Min(1) @Max(3) Integer defaultGrade) {
}
