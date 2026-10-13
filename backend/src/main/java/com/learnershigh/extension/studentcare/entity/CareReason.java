package com.learnershigh.extension.studentcare.entity;

/** 상담 결과: 문제없음 / 기록 오류 / 계속 관리 (docs/specs/wangyu/domain.md §4-1). */
public enum CareReason {
    EXPECTED_CHANGE,
    RECORD_ISSUE,
    ADJUSTMENT_NEEDED
}
