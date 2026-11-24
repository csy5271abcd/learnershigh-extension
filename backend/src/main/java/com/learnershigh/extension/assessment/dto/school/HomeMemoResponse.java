package com.learnershigh.extension.assessment.dto.school;

import java.time.OffsetDateTime;

/** A27-UX 학생 홈 메모 응답 (§30-a DRAFT). 한 번도 저장하지 않았으면 body·updatedAt null, version 0 */
public record HomeMemoResponse(String body, OffsetDateTime updatedAt, long version) {
}
