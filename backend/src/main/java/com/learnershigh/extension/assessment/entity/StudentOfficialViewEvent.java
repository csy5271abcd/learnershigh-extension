package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** A27-UX 부록 O: 학생 열람 선택·변경·철회 감사 기록(지우지 않는다). */
@Entity
@Table(name = "assessment_student_official_view_event")
public class StudentOfficialViewEvent {

    public static final String SELECT = "SELECT";
    public static final String CHANGE = "CHANGE";
    public static final String CLEAR = "CLEAR";

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64)
    private String studentId;

    @Column(name = "action", nullable = false, length = 20)
    private String action;

    @Column(name = "roster_school_id", nullable = false, length = 64)
    private String rosterSchoolId;

    @Column(name = "schoolinfo_school_id", length = 64)
    private String schoolinfoSchoolId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    protected StudentOfficialViewEvent() {
    }

    public static StudentOfficialViewEvent of(String studentId, String action, String rosterSchoolId, String schoolinfoSchoolId, Instant now) {
        StudentOfficialViewEvent e = new StudentOfficialViewEvent();
        e.id = "official_view_evt_" + UUID.randomUUID();
        e.studentId = Objects.requireNonNull(studentId);
        e.action = Objects.requireNonNull(action);
        e.rosterSchoolId = Objects.requireNonNull(rosterSchoolId);
        e.schoolinfoSchoolId = schoolinfoSchoolId;
        e.occurredAt = Objects.requireNonNull(now);
        return e;
    }

    public String action() {
        return action;
    }

    public String schoolinfoSchoolId() {
        return schoolinfoSchoolId;
    }

    public Instant occurredAt() {
        return occurredAt;
    }
}
