package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * A27-UX 부록 E (domain.md §30-B): 확인된 학교알리미 원본이 등록된 슬롯 문서·Revision.
 * (학교, 학년도, 학년, 학기, 원본)마다 하나 — DB Unique가 동시 요청·서버 재시작 뒤 중복 등록을 막는다. 지우지 않는다.
 */
@Entity
@Table(name = "assessment_schoolinfo_slot_link")
public class SchoolInfoSlotLink {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "source_file_id", nullable = false, length = 64, updatable = false)
    private String sourceFileId;

    @Column(name = "school_id", nullable = false, length = 64, updatable = false)
    private String schoolId;

    @Column(name = "academic_year", nullable = false, updatable = false)
    private int academicYear;

    @Column(name = "grade", nullable = false, updatable = false)
    private int grade;

    @Column(name = "semester", nullable = false, updatable = false)
    private int semester;

    @Column(name = "plan_id", nullable = false, length = 64, updatable = false)
    private String planId;

    @Column(name = "revision_id", nullable = false, length = 64, updatable = false)
    private String revisionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SchoolInfoSlotLink() {
    }

    public static SchoolInfoSlotLink link(SchoolInfoSourceFile source, int academicYear, int grade, int semester,
            String planId, String revisionId, Instant now) {
        if (grade < 1 || grade > 3 || semester < 1 || semester > 2) {
            throw new IllegalArgumentException("slot out of range");
        }
        SchoolInfoSlotLink l = new SchoolInfoSlotLink();
        l.id = "si_link_" + UUID.randomUUID();
        l.sourceFileId = source.id();
        l.schoolId = source.schoolId();
        l.academicYear = academicYear;
        l.grade = grade;
        l.semester = semester;
        l.planId = Objects.requireNonNull(planId);
        l.revisionId = Objects.requireNonNull(revisionId);
        l.createdAt = Objects.requireNonNull(now);
        return l;
    }

    public String id() {
        return id;
    }

    public String sourceFileId() {
        return sourceFileId;
    }

    public String schoolId() {
        return schoolId;
    }

    public int academicYear() {
        return academicYear;
    }

    public int grade() {
        return grade;
    }

    public int semester() {
        return semester;
    }

    public String planId() {
        return planId;
    }

    public String revisionId() {
        return revisionId;
    }
}
