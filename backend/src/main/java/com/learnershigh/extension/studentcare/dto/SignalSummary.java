package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareSignalType;

public record SignalSummary(CareSignalType type, String label, String summary) {

    public static SignalSummary of(CareSignalType type, String subject, String summary) {
        return new SignalSummary(type, type.labelFor(subject), summary);
    }
}
