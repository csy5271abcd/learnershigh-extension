package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

/**
 * 월별 교수·학습 운영계획 확정 (api-contract.md §39-6 DRAFT, 2026-11-15). A13: Revision마다 확정 버전 1, 2, 3 … (재검토·재확정, §39-10).
 * 최신본 = 가장 큰 versionNo.
 * 평가 정보 확정(PlanReview)과 별도다. 분석 후보(Run)는 바꾸지 않는다. 저장 뒤 바뀌지 않는다.
 */
@Entity
@Table(name = "assessment_plan_teaching_plan_review")
public class TeachingPlanReview implements Persistable<String> {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "revision_id", nullable = false, length = 64, updatable = false)
    private String revisionId;

    @Column(name = "analysis_id", nullable = false, length = 64, updatable = false)
    private String analysisId;

    @Column(name = "version_no", nullable = false, updatable = false)
    private int versionNo;

    @Column(name = "row_count", nullable = false, updatable = false)
    private int rowCount;

    @Column(name = "reviewed_by", nullable = false, length = 64, updatable = false)
    private String reviewedBy;

    @Column(name = "reviewed_at", nullable = false, updatable = false)
    private Instant reviewedAt;

    @OneToMany(cascade = CascadeType.PERSIST, fetch = FetchType.EAGER)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    @OrderBy("sortOrder ASC")
    private List<TeachingPlanReviewRow> rows = new ArrayList<>();

    @Transient
    private boolean isNew;

    protected TeachingPlanReview() {
    }

    public static TeachingPlanReview confirm(String revisionId, String analysisId, String adminId, Instant now) {
        return confirm(revisionId, analysisId, adminId, now, 1);
    }

    /** A13: versionNo = 이전 최신 버전 + 1 (첫 확정 1). */
    public static TeachingPlanReview confirm(String revisionId, String analysisId, String adminId, Instant now,
            int versionNo) {
        TeachingPlanReview review = new TeachingPlanReview();
        review.versionNo = versionNo;
        review.id = "teaching_plan_review_" + UUID.randomUUID();
        review.revisionId = revisionId;
        review.analysisId = analysisId;
        review.reviewedBy = adminId;
        review.reviewedAt = now;
        review.isNew = true;
        return review;
    }

    public void addRow(String subjectId, int analysisSubjectIndex, String rowKey, String decision, String precision,
            Integer monthFrom, Integer monthTo, String rowJson, String candidateJson) {
        rows.add(TeachingPlanReviewRow.of(rows.size(), subjectId, analysisSubjectIndex, rowKey, decision, precision,
                monthFrom, monthTo, rowJson, candidateJson));
        rowCount = rows.size();
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markPersisted() {
        isNew = false;
    }

    public int versionNo() {
        return versionNo;
    }

    public String revisionId() {
        return revisionId;
    }

    public String analysisId() {
        return analysisId;
    }

    public String reviewedBy() {
        return reviewedBy;
    }

    public Instant reviewedAt() {
        return reviewedAt;
    }

    public List<TeachingPlanReviewRow> rows() {
        return List.copyOf(rows);
    }
}
