package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * POST evaluation-plans/schoolinfo-sync (§38-12, A27-UX 부록 E): 최근 3개 학년도 × 1~3학년 × 1·2학기 자동 확인.
 * 학교 이름은 받지 않는다(서버가 학업 Context 에서 찾는다).
 */
public record SchoolInfoSyncRequest(
        @NotBlank @Size(max = 64) String schoolId,
        @NotNull @Size(min = 1, max = 5) List<Integer> requestedAcademicYears,
        @NotNull @Size(min = 1, max = 5) List<Integer> grades,
        @NotNull @Size(min = 1, max = 5) List<Integer> semesters,
        /** 부록 F: 관리자가 '다시 확인'을 직접 눌렀을 때만 true(TTL 무시). 없으면 false */
        Boolean force) {

    public SchoolInfoSyncRequest(String schoolId, List<Integer> requestedAcademicYears, List<Integer> grades, List<Integer> semesters) {
        this(schoolId, requestedAcademicYears, grades, semesters, null);
    }
}
