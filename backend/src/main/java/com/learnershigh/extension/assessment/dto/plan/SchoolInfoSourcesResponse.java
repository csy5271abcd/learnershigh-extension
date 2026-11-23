package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/** GET schoolinfo-sources (§38-14, A27-UX 부록 F): 확인되지 않은 원본과 관리자가 분류한 원본. */
public record SchoolInfoSourcesResponse(String schoolId, List<Integer> academicYears, List<Item> items) {

    public record Item(String sourceFileId, int academicYear, Integer resolvedSourceYear, String fileName, String format, long sizeBytes,
            String sha256, String verification, String reason, String group, boolean classifiable, Evidence evidence,
            Decision classification, List<Decision> history, List<LinkedSlot> linkedSlots, boolean originalAvailable) {
    }

    public record Evidence(List<Integer> grades, List<Integer> semesters) {
    }

    public record Decision(int version, List<Integer> grades, List<Integer> semesters, String note, String decidedBy,
            OffsetDateTime decidedAt) {
    }

    public record LinkedSlot(int grade, int semester, String planId) {
    }
}
