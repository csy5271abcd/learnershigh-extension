package com.learnershigh.extension.assessment.dto.plan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** §38-15 학교 선택: 검색이 돌려준 candidateId 만 받는다(학교알리미 ID·학교 이름을 화면이 보내지 않는다). */
public record SchoolDirectorySelectionRequest(@NotBlank @Size(max = 64) String candidateId) {
}
