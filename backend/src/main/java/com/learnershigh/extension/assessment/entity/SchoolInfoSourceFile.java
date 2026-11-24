package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A27-UX 부록 E (domain.md §30-B): 학교알리미에서 받은 원본 파일 하나. (학교, 조회 학년도, SHA-256)마다 한 행.
 * 분류(verification)는 받을 때 한 번 정하고 바꾸지 않는다. 학생 응답에는 나가지 않는다(관리자 운영 기록).
 */
@Entity
@Table(name = "assessment_schoolinfo_source_file")
public class SchoolInfoSourceFile {

    /** 출처 분류 — VERIFIED 만 슬롯에 연결된다. */
    public enum Verification {
        VERIFIED, NEEDS_SOURCE_VERIFICATION, YEAR_MISMATCH, UNCLASSIFIED, UNSUPPORTED, NOT_PLAN
    }

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "school_id", nullable = false, length = 64, updatable = false)
    private String schoolId;

    @Column(name = "requested_year", nullable = false, updatable = false)
    private int requestedYear;

    @Column(name = "resolved_source_year", updatable = false)
    private Integer resolvedSourceYear;

    @Column(name = "schoolinfo_school_id", length = 64, updatable = false)
    private String schoolinfoSchoolId;

    @Column(name = "attachment_seq", length = 300, updatable = false)
    private String attachmentSeq;

    @Column(name = "file_name", nullable = false, length = 255, updatable = false)
    private String fileName;

    @Column(name = "sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private long sizeBytes;

    @Column(name = "format", length = 10, updatable = false)
    private String format;

    @Column(name = "storage_key", length = 64, updatable = false)
    private String storageKey;

    @Column(name = "verification", nullable = false, length = 40, updatable = false)
    private String verification;

    @Column(name = "evidence_json", length = 4000, updatable = false)
    private String evidenceJson;

    @Column(name = "downloaded_at", nullable = false, updatable = false)
    private Instant downloadedAt;

    protected SchoolInfoSourceFile() {
    }

    public static SchoolInfoSourceFile record(String schoolId, int requestedYear, Integer resolvedSourceYear,
            String schoolinfoSchoolId, String attachmentSeq, String fileName, String sha256, long sizeBytes, String format,
            String storageKey, Verification verification, String evidenceJson, Instant now) {
        SchoolInfoSourceFile f = new SchoolInfoSourceFile();
        f.id = "si_src_" + UUID.randomUUID();
        f.schoolId = Objects.requireNonNull(schoolId);
        f.requestedYear = requestedYear;
        f.resolvedSourceYear = resolvedSourceYear;
        f.schoolinfoSchoolId = schoolinfoSchoolId;
        f.attachmentSeq = attachmentSeq;
        f.fileName = cut(Objects.requireNonNull(fileName), 255);
        f.sha256 = Objects.requireNonNull(sha256);
        f.sizeBytes = sizeBytes;
        f.format = format;
        f.storageKey = storageKey;
        f.verification = verification.name();
        f.evidenceJson = evidenceJson == null ? null : cut(evidenceJson, 4000);
        f.downloadedAt = Objects.requireNonNull(now);
        return f;
    }

    private static String cut(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    public String id() {
        return id;
    }

    public String schoolId() {
        return schoolId;
    }

    public int requestedYear() {
        return requestedYear;
    }

    public Integer resolvedSourceYear() {
        return resolvedSourceYear;
    }

    public String schoolinfoSchoolId() {
        return schoolinfoSchoolId;
    }

    public String attachmentSeq() {
        return attachmentSeq;
    }

    public String fileName() {
        return fileName;
    }

    public String sha256() {
        return sha256;
    }

    public long sizeBytes() {
        return sizeBytes;
    }

    public String format() {
        return format;
    }

    public String storageKey() {
        return storageKey;
    }

    public Verification verification() {
        return Verification.valueOf(verification);
    }

    public String evidenceJson() {
        return evidenceJson;
    }

    public Instant downloadedAt() {
        return downloadedAt;
    }
}
