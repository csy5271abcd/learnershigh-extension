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
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Persistable;

/**
 * 관리자 검토 기록 (domain.md §9-0 ④). 사람이 검토 명령을 보낸 경우에만 생긴다.
 * decision=CONFIRM은 공통 평가정보 확인이지 학생 과제 승인/반려가 아니다 (§39).
 */
@Entity
@Table(name = "assessment_plan_review")
public class PlanReview implements Persistable<String> {

    public static final String DECISION_CONFIRM = "CONFIRM";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "revision_id", nullable = false, length = 64, updatable = false)
    private String revisionId;

    @Column(name = "analysis_id", nullable = false, length = 64, updatable = false)
    private String analysisId;

    @Column(name = "decision", nullable = false, length = 20, updatable = false)
    private String decision;

    @Column(name = "reviewed_by", nullable = false, length = 64, updatable = false)
    private String reviewedBy;

    @Column(name = "reviewed_at", nullable = false, updatable = false)
    private Instant reviewedAt;

    /** HWP·HWPX 원문 확인 방식(LOCAL_FILE_EXTERNAL_VIEWER). PDF는 null. 브라우저 계산 SHA는 서버 증명이 아니다. */
    @Column(name = "source_check_method", length = 40, updatable = false)
    private String sourceCheckMethod;

    @Column(name = "source_check_sha256", length = 64, updatable = false)
    private String sourceCheckSha256;

    /** 관리자가 원문을 직접 대조했다고 명시적으로 확인함(SHA 일치와 별개). 원문 확인 기록이 있을 때만 true. */
    @Column(name = "manual_comparison_confirmed", updatable = false)
    private Boolean manualComparisonConfirmed;

    /** MOCK_HEADER = 개발용 Mock 관리자(운영 검토 실적 아님), VERIFIED = 실제 인증. */
    @Column(name = "reviewer_auth", nullable = false, length = 20, updatable = false)
    private String reviewerAuth;

    @OneToMany(cascade = CascadeType.PERSIST, fetch = FetchType.EAGER)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    @OrderBy("position ASC")
    private List<PlanConfirmedValue> confirmedValues = new ArrayList<>();

    /** ID를 미리 정하므로 새 기록임을 직접 알린다: save()가 merge 대신 persist(확정값 Cascade 포함)를 쓴다. */
    @Transient
    private boolean isNew;

    protected PlanReview() {
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

    public static PlanReview confirm(String revisionId, String analysisId, String adminId, Instant now) {
        PlanReview review = new PlanReview();
        review.id = "plan_review_" + UUID.randomUUID();
        review.revisionId = revisionId;
        review.analysisId = analysisId;
        review.decision = DECISION_CONFIRM;
        review.reviewedBy = adminId;
        review.reviewedAt = now;
        review.reviewerAuth = REVIEWER_AUTH_MOCK_HEADER;
        review.isNew = true;
        return review;
    }

    public static final String REVIEWER_AUTH_MOCK_HEADER = "MOCK_HEADER";
    public static final String SOURCE_CHECK_LOCAL_FILE = "LOCAL_FILE_EXTERNAL_VIEWER";

    /** HWP·HWPX 원문 대조 기록. SHA 일치 확인과 관리자의 명시적 수동 대조 확인을 따로 남긴다. */
    public void recordSourceCheck(String method, String sha256, boolean manualComparisonConfirmed) {
        this.sourceCheckMethod = method;
        this.sourceCheckSha256 = sha256;
        this.manualComparisonConfirmed = manualComparisonConfirmed;
    }

    public String sourceCheckMethod() {
        return sourceCheckMethod;
    }

    public String sourceCheckSha256() {
        return sourceCheckSha256;
    }

    public Boolean manualComparisonConfirmed() {
        return manualComparisonConfirmed;
    }

    public String reviewerAuth() {
        return reviewerAuth;
    }

    /** PDF 확정값: 근거는 물리 쪽 번호. */
    public void addConfirmedValue(String subjectId, String fieldPath, String valueJson, Integer pdfPageNumber) {
        addConfirmedValue(subjectId, fieldPath, valueJson, pdfPageNumber, null);
    }

    /**
     * PDF 확정값 + 분석 과목 번호(A10, 선택). 확정 시점의 분석 과목 ↔ 학업 과목 연결을 확정값과 함께 남긴다 —
     * 검토 초안이 닫혀도 다과목 문서의 과목 연결이 보존된다. null이면 연결 정보 없음(이전 확정과 같음).
     */
    public void addConfirmedValue(String subjectId, String fieldPath, String valueJson, Integer pdfPageNumber,
            Integer analysisSubjectIndex) {
        confirmedValues.add(new PlanConfirmedValue(revisionId, subjectId, fieldPath, valueJson, pdfPageNumber,
                "PDF", null, analysisSubjectIndex, confirmedValues.size()));
    }

    /** HWP·HWPX 확정값: 근거는 구조 Locator(JSON)와 분석 결과 안의 과목 번호. 가짜 PDF 쪽 번호를 만들지 않는다. */
    public void addStructuredConfirmedValue(String subjectId, String fieldPath, String valueJson, String format,
            String locatorJson, int analysisSubjectIndex) {
        confirmedValues.add(new PlanConfirmedValue(revisionId, subjectId, fieldPath, valueJson, null,
                format, locatorJson, analysisSubjectIndex, confirmedValues.size()));
    }

    public String id() {
        return id;
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

    public List<PlanConfirmedValue> confirmedValues() {
        return Collections.unmodifiableList(confirmedValues);
    }

    /** 확정 값 하나. 검토 기록과 함께 저장되고 바뀌지 않는다. */
    @Entity
    @Table(name = "assessment_plan_confirmed_value")
    public static class PlanConfirmedValue {

        @Id
        @Column(name = "id", length = 64)
        private String id;

        @Column(name = "revision_id", nullable = false, length = 64, updatable = false)
        private String revisionId;

        @Column(name = "subject_id", nullable = false, length = 64, updatable = false)
        private String subjectId;

        @Column(name = "field_path", nullable = false, length = 300, updatable = false)
        private String fieldPath;

        @Column(name = "value_json", length = 4000, updatable = false)
        private String valueJson;

        @Column(name = "pdf_page_number", updatable = false)
        private Integer pdfPageNumber;

        @Column(name = "evidence_format", nullable = false, length = 10, updatable = false)
        private String evidenceFormat;

        @Column(name = "evidence_locator_json", columnDefinition = "json", updatable = false)
        private String evidenceLocatorJson;

        @Column(name = "analysis_subject_index", updatable = false)
        private Integer analysisSubjectIndex;

        @Column(name = "position", nullable = false, updatable = false)
        private int position;

        protected PlanConfirmedValue() {
        }

        PlanConfirmedValue(String revisionId, String subjectId, String fieldPath, String valueJson,
                Integer pdfPageNumber, String evidenceFormat, String evidenceLocatorJson, Integer analysisSubjectIndex,
                int position) {
            this.id = "plan_value_" + UUID.randomUUID();
            this.revisionId = revisionId;
            this.subjectId = subjectId;
            this.fieldPath = fieldPath;
            this.valueJson = valueJson;
            this.pdfPageNumber = pdfPageNumber;
            this.evidenceFormat = evidenceFormat;
            this.evidenceLocatorJson = evidenceLocatorJson;
            this.analysisSubjectIndex = analysisSubjectIndex;
            this.position = position;
        }

        public String subjectId() {
            return subjectId;
        }

        public String fieldPath() {
            return fieldPath;
        }

        public String valueJson() {
            return valueJson;
        }

        public Integer pdfPageNumber() {
            return pdfPageNumber;
        }

        public String evidenceFormat() {
            return evidenceFormat;
        }

        public String evidenceLocatorJson() {
            return evidenceLocatorJson;
        }

        public Integer analysisSubjectIndex() {
            return analysisSubjectIndex;
        }
    }
}
