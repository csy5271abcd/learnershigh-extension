package com.learnershigh.extension.assessment.dto.record;

import java.util.List;

/** 목록 응답 `{ "items": [...] }` (§20·21·24·25 등 페이지 없는 목록). */
public record ItemsResponse<T>(List<T> items) {
}
