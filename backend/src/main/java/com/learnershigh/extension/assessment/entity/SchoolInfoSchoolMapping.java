package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;

/**
 * A27-UX 부록 F (domain.md §30-C): 이 학교(학업 Context 학교 ID)가 학교알리미의 어느 학교인지 관리자가 고른 기록. 학교마다 하나.
 * 학교알리미 이름·주소가 바뀌면 INVALIDATED 로 바꾸고 다시 고르게 한다.
 */
@Entity
@Table(name = "assessment_schoolinfo_school_mapping")
public class SchoolInfoSchoolMapping {

    public static final String ACTIVE = "ACTIVE";
    public static final String INVALIDATED = "INVALIDATED";

    @Id
    @Column(name = "school_id", length = 64)
    private String schoolId;

    @Column(name = "schoolinfo_school_id", nullable = false, length = 64)
    private String schoolinfoSchoolId;

    @Column(name = "school_name", nullable = false, length = 100)
    private String schoolName;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "sido", length = 40)
    private String sido;

    @Column(name = "sigungu", length = 40)
    private String sigungu;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "invalidated_reason", length = 100)
    private String invalidatedReason;

    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "selected_by", nullable = false, length = 64)
    private String selectedBy;

    @Column(name = "selected_at", nullable = false)
    private Instant selectedAt;

    protected SchoolInfoSchoolMapping() {
    }

    public static SchoolInfoSchoolMapping start(String schoolId) {
        SchoolInfoSchoolMapping m = new SchoolInfoSchoolMapping();
        m.schoolId = Objects.requireNonNull(schoolId);
        m.version = 0;
        return m;
    }

    /** 관리자가 후보 하나를 골랐다. version 을 하나 올린다. */
    public void select(String schoolinfoSchoolId, String schoolName, String address, String sido, String sigungu, String adminId, Instant now) {
        this.schoolinfoSchoolId = Objects.requireNonNull(schoolinfoSchoolId);
        this.schoolName = Objects.requireNonNull(schoolName);
        this.address = address;
        this.sido = sido;
        this.sigungu = sigungu;
        this.status = ACTIVE;
        this.invalidatedReason = null;
        this.selectedBy = Objects.requireNonNull(adminId);
        this.selectedAt = Objects.requireNonNull(now);
        this.version = version + 1;
    }

    public void invalidate(String reason) {
        this.status = INVALIDATED;
        this.invalidatedReason = reason;
        this.version = version + 1;
    }

    public boolean active() {
        return ACTIVE.equals(status);
    }

    public String schoolId() {
        return schoolId;
    }

    public String schoolinfoSchoolId() {
        return schoolinfoSchoolId;
    }

    public String schoolName() {
        return schoolName;
    }

    public String address() {
        return address;
    }

    public String sido() {
        return sido;
    }

    public String sigungu() {
        return sigungu;
    }

    public String status() {
        return status;
    }

    public long version() {
        return version;
    }

    public String selectedBy() {
        return selectedBy;
    }

    public Instant selectedAt() {
        return selectedAt;
    }
}
