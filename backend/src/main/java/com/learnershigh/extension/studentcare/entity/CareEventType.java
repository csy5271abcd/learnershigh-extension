package com.learnershigh.extension.studentcare.entity;

/** 학생 기록 이벤트 종류 (docs/specs/wangyu/domain.md). */
public enum CareEventType {
    REASON_CONFIRMED,
    ADJUSTMENT_STARTED,
    RECHECKED,
    CONTINUED,
    /** 이전 기록(약속 수정)에만 있다. 새로 만들지 않는다. */
    REVISED,
    CLOSED,
    NOTE
}
