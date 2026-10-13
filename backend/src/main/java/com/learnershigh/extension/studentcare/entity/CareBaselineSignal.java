package com.learnershigh.extension.studentcare.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

/** 케어 건을 연 시점의 신호 Snapshot. 재점검은 이 값과 같은 기준으로 비교한다. */
@Embeddable
public class CareBaselineSignal {

    @Enumerated(EnumType.STRING)
    @Column(name = "signal_type", nullable = false, length = 40)
    private CareSignalType type;

    @Column(name = "summary", nullable = false, length = 200)
    private String summary;

    @Column(name = "metric_value", nullable = false)
    private int value;

    @Column(name = "target_value")
    private Integer target;

    /** SUBJECT_SHARE 신호의 과목. 그 외는 null. */
    @Column(name = "subject", length = 40)
    private String subject;

    protected CareBaselineSignal() {
    }

    public CareBaselineSignal(CareSignalType type, String summary, int value, Integer target, String subject) {
        this.type = type;
        this.summary = summary;
        this.value = value;
        this.target = target;
        this.subject = subject;
    }

    public CareSignalType type() {
        return type;
    }

    public String summary() {
        return summary;
    }

    public int value() {
        return value;
    }

    public Integer target() {
        return target;
    }

    public String subject() {
        return subject;
    }
}
