package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;

/**
 * A27-UX 부록 O (api-contract.md §38-16 · domain.md §30-I): 학생 개인의 '공식 원본 열람 대상' 학교 선택. 학생마다 하나.
 * 학적(학교·학년도·학년·학기)과 관리자 공통 매핑을 바꾸지 않는다. 관리자 매핑이 있으면 쓰이지 않는다.
 */
@Entity
@Table(name = "assessment_student_official_view")
public class StudentOfficialView {

    @Id
    @Column(name = "student_id", length = 64)
    private String studentId;

    @Column(name = "roster_school_id", nullable = false, length = 64)
    private String rosterSchoolId;

    @Column(name = "schoolinfo_school_id", nullable = false, length = 64)
    private String schoolinfoSchoolId;

    @Column(name = "view_school_id", nullable = false, length = 64)
    private String viewSchoolId;

    @Column(name = "school_name", nullable = false, length = 100)
    private String schoolName;

    @Column(name = "sido", length = 40)
    private String sido;

    @Column(name = "sigungu", length = 40)
    private String sigungu;

    @Column(name = "address", nullable = false, length = 300)
    private String address;

    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "selected_at", nullable = false)
    private Instant selectedAt;

    protected StudentOfficialView() {
    }

    public static StudentOfficialView start(String studentId) {
        StudentOfficialView v = new StudentOfficialView();
        v.studentId = Objects.requireNonNull(studentId);
        v.version = 0;
        return v;
    }

    /** 학생이 서버가 검증한 후보 하나를 골랐다. version 을 하나 올린다. */
    public void select(String rosterSchoolId, String schoolinfoSchoolId, String viewSchoolId, String schoolName, String sido, String sigungu,
            String address, Instant now) {
        this.rosterSchoolId = Objects.requireNonNull(rosterSchoolId);
        this.schoolinfoSchoolId = Objects.requireNonNull(schoolinfoSchoolId);
        this.viewSchoolId = Objects.requireNonNull(viewSchoolId);
        this.schoolName = Objects.requireNonNull(schoolName);
        this.sido = sido;
        this.sigungu = sigungu;
        this.address = Objects.requireNonNull(address);
        this.selectedAt = Objects.requireNonNull(now);
        this.version = version + 1;
    }

    public String studentId() {
        return studentId;
    }

    public String rosterSchoolId() {
        return rosterSchoolId;
    }

    public String schoolinfoSchoolId() {
        return schoolinfoSchoolId;
    }

    public String viewSchoolId() {
        return viewSchoolId;
    }

    public String schoolName() {
        return schoolName;
    }

    public String sido() {
        return sido;
    }

    public String sigungu() {
        return sigungu;
    }

    public String address() {
        return address;
    }

    public long version() {
        return version;
    }

    public Instant selectedAt() {
        return selectedAt;
    }
}
