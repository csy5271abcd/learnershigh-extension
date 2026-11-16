package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.SQLRestriction;

/**
 * 학교·학년도·학년·학기 슬롯에 등록된 평가계획서 문서 하나 (domain.md §9-0 ① 원본).
 * 같은 슬롯에 여러 Plan을 허용하고, Plan마다 Revision을 덮어쓰지 않고 쌓는다 (§38).
 */
@Entity
@Table(name = "assessment_evaluation_plan")
// A25: 삭제한 문서는 모든 조회(관리자·학생·Planner·원문·학교 검색·현황)에서 빠진다. 기록 행은 보존한다
@SQLRestriction("deleted_at is null")
public class EvaluationPlan {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "school_id", nullable = false, length = 64, updatable = false)
    private String schoolId;

    @Column(name = "academic_year", nullable = false, updatable = false)
    private int academicYear;

    @Column(name = "grade", nullable = false, updatable = false)
    private int grade;

    @Column(name = "semester", nullable = false, updatable = false)
    private int semester;

    @Column(name = "revision_count", nullable = false)
    private int revisionCount;

    @Column(name = "created_by", nullable = false, length = 64, updatable = false)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "deleted_by", length = 64)
    private String deletedBy;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    protected EvaluationPlan() {
    }

    public static EvaluationPlan register(String schoolId, int academicYear, int grade, int semester, String adminId,
            Instant now) {
        EvaluationPlan plan = new EvaluationPlan();
        plan.id = "plan_" + UUID.randomUUID();
        plan.schoolId = schoolId;
        plan.academicYear = academicYear;
        plan.grade = grade;
        plan.semester = semester;
        plan.revisionCount = 0;
        plan.createdBy = adminId;
        plan.createdAt = now;
        return plan;
    }

    /** 다음 Revision 순번을 예약한다. version 증가로 동시 개정 등록은 한쪽이 409(CONCURRENT_MODIFICATION)가 된다. */
    public int reserveNextRevisionNumber() {
        revisionCount += 1;
        return revisionCount;
    }

    /** 논리 삭제. version 증가로 동시 개정 등록·삭제는 한쪽이 409가 된다. */
    public void markDeleted(String adminId, Instant now) {
        if (deletedAt != null) {
            throw new IllegalStateException("already deleted");
        }
        deletedAt = now;
        deletedBy = adminId;
    }

    public Instant deletedAt() {
        return deletedAt;
    }

    public boolean matchesSlot(String otherSchoolId, int otherYear, int otherGrade, int otherSemester) {
        return schoolId.equals(otherSchoolId) && academicYear == otherYear && grade == otherGrade
                && semester == otherSemester;
    }

    public String id() {
        return id;
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
}
