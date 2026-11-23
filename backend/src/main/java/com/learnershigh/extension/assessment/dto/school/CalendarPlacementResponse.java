package com.learnershigh.extension.assessment.dto.school;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** A28-33 학생 달력 개인 임시 배치 (§30-b DRAFT) */
public record CalendarPlacementResponse(int academicYear, int semester, List<Item> items) {

    public record Item(String sourceKey, LocalDate displayDate, LocalDate rangeFrom, LocalDate rangeTo, OffsetDateTime updatedAt) {
    }
}
