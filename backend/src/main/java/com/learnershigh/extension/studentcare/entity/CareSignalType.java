package com.learnershigh.extension.studentcare.entity;

/** 특이사항 (docs/specs/wangyu/domain.md §3). 선언 순서가 우선순위다. */
public enum CareSignalType {
    CONSECUTIVE_ABSENCE("연속 결석", MetricUnit.DAYS, false, false),
    PLAN_MISSING("계획 미제출", MetricUnit.DAYS, false, false),
    STUDY_DROP("공부 시간 감소", MetricUnit.MINUTES, true, true),
    EXECUTION_GAP("계획 미달성", MetricUnit.PERCENT, true, true),
    SUBJECT_SHARE("과목 계획 미달성", MetricUnit.PERCENT, true, true),
    START_TIME_SHIFT("등원 시간 늦어짐", MetricUnit.CLOCK_MINUTES, false, true);

    private final String label;
    private final MetricUnit unit;
    private final boolean higherIsBetter;
    private final boolean volumeBased;

    CareSignalType(String label, MetricUnit unit, boolean higherIsBetter, boolean volumeBased) {
        this.label = label;
        this.unit = unit;
        this.higherIsBetter = higherIsBetter;
        this.volumeBased = volumeBased;
    }

    public String label() {
        return label;
    }

    /** 과목이 정해지는 특이사항은 과목 이름을 붙인다. 예: "수학 계획 미달성". */
    public String labelFor(String subject) {
        if (this == SUBJECT_SHARE && subject != null && !subject.isBlank()) {
            return subject + " 계획 미달성";
        }
        return label;
    }

    public MetricUnit unit() {
        return unit;
    }

    public boolean higherIsBetter() {
        return higherIsBetter;
    }

    /** 기록 부족 / 연속 결석이면 계산하지 않는 학습량 계열 신호인지. */
    public boolean volumeBased() {
        return volumeBased;
    }
}
