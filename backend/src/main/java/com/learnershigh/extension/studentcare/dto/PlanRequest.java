package com.learnershigh.extension.studentcare.dto;

import java.time.LocalDate;

/** 약속 입력. 필수 / 길이 / 합의 / 재점검일은 Domain이 422로 검사한다 (api-contract.md §65-4). */
public record PlanRequest(String goal, String action, String loadLimit, LocalDate recheckDate, Boolean agreedWithStudent) {
}
