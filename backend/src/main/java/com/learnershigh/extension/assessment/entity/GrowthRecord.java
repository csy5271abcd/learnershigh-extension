package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 학생 본인의 성장 기록 (api-contract.md §29). 학교생활기록부(세특) 문장이 아니다.
 * 필드 의미는 §29 / Frontend 계약 Type(CreateGrowthRecordRequest)과 같다.
 */
@Entity
@Table(name = "assessment_growth_record")
public class GrowthRecord {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "subject_id", length = 64)
    private String subjectId;

    @Column(name = "activity_start_date")
    private LocalDate activityStartDate;

    @Column(name = "role", length = 2000)
    private String role;

    @Column(name = "motivation", columnDefinition = "TEXT")
    private String motivation;

    @Column(name = "process", columnDefinition = "TEXT")
    private String process;

    @Column(name = "contribution", columnDefinition = "TEXT")
    private String contribution;

    @Column(name = "difficulty", columnDefinition = "TEXT")
    private String difficulty;

    @Column(name = "solution", columnDefinition = "TEXT")
    private String solution;

    @Column(name = "outcome", columnDefinition = "TEXT")
    private String outcome;

    @Column(name = "reflection", columnDefinition = "TEXT")
    private String reflection;

    @Column(name = "follow_up", columnDefinition = "TEXT")
    private String followUp;

    @Column(name = "related_source_type", length = 30)
    private String relatedSourceType;

    @Column(name = "related_source_id", length = 64)
    private String relatedSourceId;

    @Column(name = "artifact_ids_json", nullable = false, columnDefinition = "JSON")
    private String artifactIdsJson;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected GrowthRecord() {
    }

    public static GrowthRecord create(String studentId, Fields fields, Instant now) {
        GrowthRecord record = new GrowthRecord();
        record.id = "growth_" + UUID.randomUUID();
        record.studentId = studentId;
        record.createdAt = now;
        record.apply(fields, now);
        return record;
    }

    public void apply(Fields f, Instant now) {
        title = f.title();
        subjectId = f.subjectId();
        activityStartDate = f.activityStartDate();
        role = f.role();
        motivation = f.motivation();
        process = f.process();
        contribution = f.contribution();
        difficulty = f.difficulty();
        solution = f.solution();
        outcome = f.outcome();
        reflection = f.reflection();
        followUp = f.followUp();
        relatedSourceType = f.relatedSourceType();
        relatedSourceId = f.relatedSourceId();
        artifactIdsJson = f.artifactIdsJson();
        updatedAt = now;
    }

    public Fields fields() {
        return new Fields(title, subjectId, activityStartDate, role, motivation, process, contribution, difficulty,
                solution, outcome, reflection, followUp, relatedSourceType, relatedSourceId, artifactIdsJson);
    }

    /** 저장 값 묶음. 검증·정규화는 Service가 끝낸 값을 받는다. */
    public record Fields(String title, String subjectId, LocalDate activityStartDate, String role, String motivation,
            String process, String contribution, String difficulty, String solution, String outcome,
            String reflection, String followUp, String relatedSourceType, String relatedSourceId,
            String artifactIdsJson) {
    }

    public String id() {
        return id;
    }

    public String studentId() {
        return studentId;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    // ---- 휴지통 (소프트 삭제, V202611111620). 하위 Revision·Version·파일은 건드리지 않는다 ----

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by", length = 64)
    private String deletedBy;

    /** 휴지통으로 옮긴다. 이미 휴지통이면 그대로(재시도 안전). */
    public void moveToTrash(String actorId, Instant now) {
        if (deletedAt != null) {
            return;
        }
        this.deletedAt = now;
        this.deletedBy = actorId;
    }

    /** 원래 자리로 복원한다(ID·내용 그대로). */
    public void restoreFromTrash() {
        this.deletedAt = null;
        this.deletedBy = null;
    }

    public boolean inTrash() {
        return deletedAt != null;
    }

    public Instant deletedAt() {
        return deletedAt;
    }
}
