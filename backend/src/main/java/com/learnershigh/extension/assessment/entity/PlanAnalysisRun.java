package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * 한 Revision에 대한 분석 결과 한 번 (domain.md §9-0 ② AI 결과 + ③ 근거). 결과는 후보(Candidate)이며 공식 값이 아니다.
 * 재분석은 새 Run을 만들고 이전 Run은 지우지 않는다. 저장 뒤 내용은 바뀌지 않는다.
 */
@Entity
@Table(name = "assessment_plan_analysis_run")
public class PlanAnalysisRun {

    public static final String ORIGIN_EXTERNAL_IMPORT = "EXTERNAL_IMPORT";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "revision_id", nullable = false, length = 64, updatable = false)
    private String revisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30, updatable = false)
    private PlanAnalysisStatus status;

    @Column(name = "origin", nullable = false, length = 30, updatable = false)
    private String origin;

    @Column(name = "analyzer_name", nullable = false, length = 100, updatable = false)
    private String analyzerName;

    @Column(name = "analyzer_version", nullable = false, length = 50, updatable = false)
    private String analyzerVersion;

    @Column(name = "payload_sha256", nullable = false, length = 64, updatable = false)
    private String payloadSha256;

    @Column(name = "result_json", nullable = false, updatable = false, columnDefinition = "LONGTEXT")
    private String resultJson;

    @Column(name = "warnings_json", nullable = false, updatable = false, columnDefinition = "TEXT")
    private String warningsJson;

    @Column(name = "received_by", nullable = false, length = 64, updatable = false)
    private String receivedBy;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    protected PlanAnalysisRun() {
    }

    public static PlanAnalysisRun importExternal(String revisionId, PlanAnalysisStatus status, String analyzerName,
            String analyzerVersion, String payloadSha256, String resultJson, String warningsJson, String adminId,
            Instant now) {
        PlanAnalysisRun run = new PlanAnalysisRun();
        run.id = "analysis_" + UUID.randomUUID();
        run.revisionId = revisionId;
        run.status = status;
        run.origin = ORIGIN_EXTERNAL_IMPORT;
        run.analyzerName = analyzerName;
        run.analyzerVersion = analyzerVersion;
        run.payloadSha256 = payloadSha256;
        run.resultJson = resultJson;
        run.warningsJson = warningsJson;
        run.receivedBy = adminId;
        run.receivedAt = now;
        return run;
    }

    public String id() {
        return id;
    }

    public String revisionId() {
        return revisionId;
    }

    public PlanAnalysisStatus status() {
        return status;
    }

    public String origin() {
        return origin;
    }

    public String analyzerName() {
        return analyzerName;
    }

    public String analyzerVersion() {
        return analyzerVersion;
    }

    public String resultJson() {
        return resultJson;
    }

    public String warningsJson() {
        return warningsJson;
    }

    public Instant receivedAt() {
        return receivedAt;
    }
}
