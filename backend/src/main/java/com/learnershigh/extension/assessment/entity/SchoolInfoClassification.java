package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * A27-UX 부록 F (domain.md §30-C): 분류하지 못한 학교알리미 원본(UNCLASSIFIED)에 관리자가 정한 학년·학기. Revision 으로 쌓고 바꾸지 않는다.
 * 출처·학년도 확인(SchoolInfoSourceFile.verification)을 대신하지 않는다.
 */
@Entity
@Table(name = "assessment_schoolinfo_classification")
public class SchoolInfoClassification {

    public static final int NOTE_MAX = 200;

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "source_file_id", nullable = false, length = 64, updatable = false)
    private String sourceFileId;

    @Column(name = "version", nullable = false, updatable = false)
    private int version;

    @Column(name = "grades", nullable = false, length = 10, updatable = false)
    private String grades;

    @Column(name = "semesters", nullable = false, length = 5, updatable = false)
    private String semesters;

    @Column(name = "note", length = NOTE_MAX, updatable = false)
    private String note;

    @Column(name = "decided_by", nullable = false, length = 64, updatable = false)
    private String decidedBy;

    @Column(name = "decided_at", nullable = false, updatable = false)
    private Instant decidedAt;

    protected SchoolInfoClassification() {
    }

    public static SchoolInfoClassification decide(String sourceFileId, int version, List<Integer> grades, List<Integer> semesters,
            String note, String adminId, Instant now) {
        SchoolInfoClassification c = new SchoolInfoClassification();
        c.id = "si_cls_" + UUID.randomUUID();
        c.sourceFileId = Objects.requireNonNull(sourceFileId);
        c.version = version;
        c.grades = join(grades);
        c.semesters = join(semesters);
        c.note = note == null || note.isBlank() ? null : note.strip();
        c.decidedBy = Objects.requireNonNull(adminId);
        c.decidedAt = Objects.requireNonNull(now);
        return c;
    }

    private static String join(List<Integer> values) {
        return values.stream().sorted().distinct().map(String::valueOf).collect(Collectors.joining(","));
    }

    private static List<Integer> split(String v) {
        return v == null || v.isBlank() ? List.of() : Arrays.stream(v.split(",")).map(Integer::valueOf).toList();
    }

    public String sourceFileId() {
        return sourceFileId;
    }

    public int version() {
        return version;
    }

    public List<Integer> grades() {
        return split(grades);
    }

    public List<Integer> semesters() {
        return split(semesters);
    }

    public String note() {
        return note;
    }

    public String decidedBy() {
        return decidedBy;
    }

    public Instant decidedAt() {
        return decidedAt;
    }
}
