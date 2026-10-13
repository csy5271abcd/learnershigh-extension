package com.learnershigh.extension.studentcare.entity;

/** 상담 방식 (docs/specs/wangyu/domain.md §4-2). OTHER는 이전 기록 호환용이며 화면에는 없다. */
public enum NoteChannel {
    MEETING("면담"),
    CALL("통화"),
    MESSAGE("문자"),
    OTHER("기타");

    private final String label;

    NoteChannel(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
