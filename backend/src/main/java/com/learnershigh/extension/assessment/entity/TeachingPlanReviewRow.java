package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * 운영계획 확정의 행 하나 (§39-6). decision: CONFIRMED(후보 그대로) · EDITED(관리자 수정) · EXCLUDED(학생 비공개, 기록만).
 * rowJson = 확정된 최종 행, candidateJson = 원래 분석 후보 행. precision·month는 조회용 사본(원천은 rowJson).
 */
@Entity
@Table(name = "assessment_plan_teaching_plan_row")
public class TeachingPlanReviewRow {

    public static final String CONFIRMED = "CONFIRMED";
    public static final String EDITED = "EDITED";
    public static final String EXCLUDED = "EXCLUDED";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "sort_order", nullable = false, updatable = false)
    private int sortOrder;

    @Column(name = "subject_id", nullable = false, length = 64, updatable = false)
    private String subjectId;

    @Column(name = "analysis_subject_index", nullable = false, updatable = false)
    private int analysisSubjectIndex;

    @Column(name = "row_key", nullable = false, length = 50, updatable = false)
    private String rowKey;

    @Column(name = "decision", nullable = false, length = 20, updatable = false)
    private String decision;

    @Column(name = "precision_code", length = 20, updatable = false)
    private String precision;

    @Column(name = "month_from", updatable = false)
    private Integer monthFrom;

    @Column(name = "month_to", updatable = false)
    private Integer monthTo;

    @Column(name = "row_json", nullable = false, updatable = false, columnDefinition = "MEDIUMTEXT")
    private String rowJson;

    @Column(name = "candidate_json", nullable = false, updatable = false, columnDefinition = "MEDIUMTEXT")
    private String candidateJson;

    protected TeachingPlanReviewRow() {
    }

    static TeachingPlanReviewRow of(int sortOrder, String subjectId, int analysisSubjectIndex, String rowKey,
            String decision, String precision, Integer monthFrom, Integer monthTo, String rowJson,
            String candidateJson) {
        TeachingPlanReviewRow row = new TeachingPlanReviewRow();
        row.id = "teaching_plan_row_" + UUID.randomUUID();
        row.sortOrder = sortOrder;
        row.subjectId = subjectId;
        row.analysisSubjectIndex = analysisSubjectIndex;
        row.rowKey = rowKey;
        row.decision = decision;
        row.precision = precision;
        row.monthFrom = monthFrom;
        row.monthTo = monthTo;
        row.rowJson = rowJson;
        row.candidateJson = candidateJson;
        return row;
    }

    public boolean published() {
        return !EXCLUDED.equals(decision);
    }

    public String subjectId() {
        return subjectId;
    }

    public int analysisSubjectIndex() {
        return analysisSubjectIndex;
    }

    public String rowKey() {
        return rowKey;
    }

    public String decision() {
        return decision;
    }

    public String rowJson() {
        return rowJson;
    }

    public String candidateJson() {
        return candidateJson;
    }
}
