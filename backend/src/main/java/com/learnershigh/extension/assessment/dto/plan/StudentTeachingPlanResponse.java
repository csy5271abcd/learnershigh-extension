package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * §10-1-2 학생 월별 교수·학습 운영계획 (A6 DRAFT, 2026-11-15). 공개(최근 확정) Revision에 확정된 운영계획 행만.
 * status: CONFIRMED / NOT_CONFIRMED(문서는 공개됐지만 운영계획은 아직 확정 전 — 오류가 아니다).
 * 분석 후보·초안·issue·제외 행·HWP 근거 위치는 보내지 않는다.
 */
public record StudentTeachingPlanResponse(String planId, String documentRevisionId, int academicYear, int grade,
        int semester, String status, OffsetDateTime confirmedAt, List<Row> rows) {

    public static final String CONFIRMED = "CONFIRMED";
    public static final String NOT_CONFIRMED = "NOT_CONFIRMED";

    public record Row(String subjectId, String rowKey, Integer month, Integer monthTo, String weekLabel,
            Integer weekFrom, Integer weekTo, String unit, String content, String note,
            List<AnalysisImportRequest.Standard> achievementStandards, List<String> teachingMethods,
            List<String> assessmentMethods, String specialSchedule, AnalysisImportRequest.Schedule schedule,
            Integer pdfPageNumber) {
    }
}
