package com.learnershigh.extension.assessment.dto.school;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** A27-UX 학생 홈 메모 저장 (§30-a DRAFT). body null·빈 문자열 = 지움 */
public record HomeMemoRequest(@Size(max = 4000) String body, @NotNull @Min(0) Long expectedVersion) {
}
