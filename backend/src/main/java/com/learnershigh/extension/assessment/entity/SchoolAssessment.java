package com.learnershigh.extension.assessment.entity;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * 학교에서 실제로 부여한 수행평가를 학생이 관리하는 단위 (domain.md §10).
 * Student / Admin은 이 Entity 하나를 서로 다른 DTO로 본다 (Surface별 복제 금지).
 * 이 Entity는 학생 개인 관리 정보만 담는다. 학교 공식 평가정보는 평가계획서 확정값에 있고 {@link #evaluationItemRef}로만 연결한다.
 */
@Entity
@Table(name = "assessment_school_assessment")
public class SchoolAssessment {

    public static final int TITLE_MAX = 200;
    public static final int DESCRIPTION_MAX = 2000;

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", nullable = false, length = 64, updatable = false)
    private String studentId;

    @Column(name = "academic_year", nullable = false, updatable = false)
    private int academicYear;

    @Column(name = "semester", nullable = false, updatable = false)
    private int semester;

    @Column(name = "subject_id", nullable = false, length = 64, updatable = false)
    private String subjectId;

    @Column(name = "title", nullable = false, length = TITLE_MAX)
    private String title;

    @Column(name = "description", length = DESCRIPTION_MAX)
    private String description;

    @Column(name = "deadline_date")
    private LocalDate deadlineDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SchoolAssessmentStatus status;

    @Column(name = "eval_document_revision_id", length = 64, updatable = false)
    private String evalDocumentRevisionId;

    @Column(name = "eval_subject_id", length = 64, updatable = false)
    private String evalSubjectId;

    @Column(name = "eval_item_key", length = 100, updatable = false)
    private String evalItemKey;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SchoolAssessment() {
    }

    private SchoolAssessment(String studentId, int academicYear, int semester, String subjectId, String title,
            String description, LocalDate deadlineDate, SchoolAssessmentStatus status, EvaluationItemRef ref,
            Instant now) {
        this.id = "assessment_" + UUID.randomUUID();
        this.studentId = Objects.requireNonNull(studentId);
        this.academicYear = academicYear;
        this.semester = semester;
        this.subjectId = Objects.requireNonNull(subjectId);
        this.title = requireTitle(title);
        this.description = normalizeDescription(description);
        this.deadlineDate = deadlineDate;
        this.status = Objects.requireNonNull(status);
        if (ref != null) {
            this.evalDocumentRevisionId = ref.documentRevisionId();
            this.evalSubjectId = ref.subjectId();
            this.evalItemKey = ref.itemKey();
        }
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** 학생 직접 등록 / 평가계획서 항목 선택 등록. 필수값은 제목·과목뿐이다 (모르는 마감일·설명은 null). */
    public static SchoolAssessment register(String studentId, int academicYear, int semester, String subjectId,
            String title, String description, LocalDate deadlineDate, SchoolAssessmentStatus status,
            EvaluationItemRef ref, Instant now) {
        return new SchoolAssessment(studentId, academicYear, semester, subjectId, title, description, deadlineDate,
                status, ref, now);
    }

    public boolean isOwnedBy(String candidateStudentId) {
        return studentId.equals(candidateStudentId);
    }

    /** 학생 개인 수정. 공식 평가계획서 값은 바꾸지 않는다 (§12 PATCH). */
    public void editPersonalInfo(String newTitle, String newDescription, LocalDate newDeadline, Instant now) {
        this.title = requireTitle(newTitle);
        this.description = normalizeDescription(newDescription);
        this.deadlineDate = newDeadline;
        this.updatedAt = now;
    }

    /** §13 상태 변경. 역전이는 정책 미확정이라 409 INVALID_STATE_TRANSITION. */
    public void changeStatus(SchoolAssessmentStatus target, Instant now) {
        if (!status.canMoveTo(target)) {
            throw new BusinessException(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    AssessmentErrorCode.INVALID_STATE_TRANSITION.message(),
                    Map.of("currentState", status.name(), "requestedAction", target.name()));
        }
        if (status != target) {
            this.status = target;
            this.updatedAt = now;
        }
    }

    private static String requireTitle(String value) {
        if (value == null || value.isBlank() || value.strip().length() > TITLE_MAX) {
            throw new IllegalArgumentException("title must be 1.." + TITLE_MAX + " chars");
        }
        return value.strip();
    }

    private static String normalizeDescription(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.strip().length() > DESCRIPTION_MAX) {
            throw new IllegalArgumentException("description too long");
        }
        return value.strip();
    }

    public EvaluationItemRef evaluationItemRef() {
        return evalDocumentRevisionId == null ? null
                : new EvaluationItemRef(evalDocumentRevisionId, evalSubjectId, evalItemKey);
    }

    public String id() {
        return id;
    }

    public String studentId() {
        return studentId;
    }

    public int academicYear() {
        return academicYear;
    }

    public int semester() {
        return semester;
    }

    public String subjectId() {
        return subjectId;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public LocalDate deadlineDate() {
        return deadlineDate;
    }

    public SchoolAssessmentStatus status() {
        return status;
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
