package com.learnershigh.extension.assessment.dto.school;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** A28-33 학생 달력 개인 임시 배치 저장 (§30-b DRAFT). 범위·학년도 검증은 서비스 */
public record CalendarPlacementRequest(
        @NotNull Integer academicYear,
        @NotNull Integer semester,
        @NotBlank @Size(max = 200) String sourceKey,
        @NotNull LocalDate displayDate,
        @NotNull LocalDate rangeFrom,
        @NotNull LocalDate rangeTo) {
}
