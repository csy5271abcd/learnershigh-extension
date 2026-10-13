package com.learnershigh.extension.studentcare.entity;

/** 학생 기록 이벤트 종류 (docs/specs/wangyu/domain.md). */
public enum CareEventType {
    REASON_CONFIRMED,
    ADJUSTMENT_STARTED,
    RECHECKED,
    CONTINUED,
    REVISED,
    CLOSED,
    NOTE
}
