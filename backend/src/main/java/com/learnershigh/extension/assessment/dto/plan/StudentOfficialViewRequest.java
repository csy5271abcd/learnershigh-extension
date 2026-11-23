package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** §38-16 학생 열람 대상 선택. candidateId 는 후보 조회가 준 값만. expectedVersion 은 지금 선택의 version(처음이면 0 또는 생략). */
public record StudentOfficialViewRequest(@NotBlank @Size(max = 64) String candidateId, @Min(0) Long expectedVersion) {
}
