package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import java.util.List;

/** 기준일에 계산된 신호 한 개. {@code value}는 재점검 때 다시 계산해 비교하는 지표다. */
public record DetectedSignal(
        CareSignalType type,
        String summary,
        List<String> evidence,
        int value,
        Integer target,
        String subject) {

    public CareBaselineSignal toBaseline() {
        return new CareBaselineSignal(type, summary, value, target, subject);
    }
}
