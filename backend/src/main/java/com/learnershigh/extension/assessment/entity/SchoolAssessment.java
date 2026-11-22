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
    public static final int SUBMISSIONS_MAX = 500;
    public static final int MEMO_MAX = 2000;
    public static final int TYPE_LABEL_MAX = 50;

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

    // ---- A27-UX 학생 개인 관리 정보 (V202611170200). 모두 선택 값이고 null = 모름/입력 안 함 ----
    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_type", length = 20)
    private SchoolAssessmentType assessmentType;

    /** A27-UX 학생 화면(V202611190100): 평가 유형 '기타' 직접 입력. OTHER일 때만 값이 있다 */
    @Column(name = "assessment_type_label", length = TYPE_LABEL_MAX)
    private String assessmentTypeLabel;

    @Column(name = "evaluation_date")
    private LocalDate evaluationDate;

    @Column(name = "weight_percent")
    private Integer weightPercent;

    @Column(name = "submissions", length = SUBMISSIONS_MAX)
    private String submissions;

    @Column(name = "personal_memo", length = MEMO_MAX)
    private String personalMemo;

    // A28-20: 학교 확정 자동 등록 행은 재확정 때 최신 확정 Revision 으로 연결을 옮긴다(학생 직접 등록 행은 바꾸지 않음)
    @Column(name = "eval_document_revision_id", length = 64)
    private String evalDocumentRevisionId;

    @Column(name = "eval_subject_id", length = 64)
    private String evalSubjectId;

    @Column(name = "eval_item_key", length = 100)
    private String evalItemKey;

    // ---- A28-20 학교 확정 자동 등록 (V202611220644). 학생 직접 등록 행은 모두 null ----
    /** 문서ID|학업 과목ID|분석 항목 Key — 같은 학생의 같은 공식 수행평가는 한 행(UNIQUE) */
    @Column(name = "official_key", length = 200, updatable = false)
    private String officialKey;

    @Column(name = "official_plan_id", length = 64, updatable = false)
    private String officialPlanId;

    /** 이 행의 공식 값을 가져온 확정 기록(최신) */
    @Column(name = "official_review_id", length = 64)
    private String officialReviewId;

    /** ACTIVE = 최신 확정본에 있음, WITHDRAWN = 재확정에서 빠짐(학생 기록은 그대로) */
    @Column(name = "official_status", length = 20)
    private String officialStatus;

    /** 원문의 공식 시기 그대로(예: 9월). 날짜로 바꾸지 않는다 */
    @Column(name = "official_timing", length = 100)
    private String officialTiming;

    @Column(name = "official_weight_percent", precision = 5, scale = 2)
    private java.math.BigDecimal officialWeightPercent;

    @Column(name = "official_max_score", precision = 8, scale = 2)
    private java.math.BigDecimal officialMaxScore;

    @Column(name = "official_synced_at")
    private Instant officialSyncedAt;

    public static final String OFFICIAL_ACTIVE = "ACTIVE";
    public static final String OFFICIAL_WITHDRAWN = "WITHDRAWN";

    /** 공식 값 묶음(학교 확정본). 날짜는 없다 — 공식 시기는 원문 문자열로만 */
    public record OfficialValues(String planId, String reviewId, String revisionId, String subjectId, String itemKey,
            String label, java.math.BigDecimal weightPercent, java.math.BigDecimal maxScore, String timing) {

        public String key() {
            return planId + "|" + subjectId + "|" + itemKey;
        }
    }

    /**
     * A28-20 학교 확정 수행평가 자동 등록. 개인 값(상태 시작 전·메모·날짜·첨부)은 비어 있는 정상 학생 수행평가로 시작한다.
     * 평가일·마감일은 만들지 않는다(공식 시기는 officialTiming).
     */
    public static SchoolAssessment registerOfficial(String studentId, int academicYear, int semester, OfficialValues values,
            Instant now) {
        SchoolAssessment created = new SchoolAssessment(studentId, academicYear, semester, values.subjectId(),
                clip(values.label(), TITLE_MAX), null, null, SchoolAssessmentStatus.BEFORE_START,
                new EvaluationItemRef(values.revisionId(), values.subjectId(), values.itemKey()), now);
        created.officialKey = values.key();
        created.officialPlanId = values.planId();
        created.officialStatus = OFFICIAL_ACTIVE;
        created.applyOfficial(values, now);
        return created;
    }

    /**
     * 재확정: 공식 필드·출처 연결만 최신 확정본으로 바꾼다. 학생 상태·메모·날짜·제출물·유형·첨부는 그대로.
     * 실제로 바뀐 값이 있으면 true(불필요한 갱신 0).
     */
    public boolean refreshOfficial(OfficialValues values, Instant now) {
        if (officialKey == null || !officialKey.equals(values.key())) {
            throw new IllegalStateException("not the same official assessment");
        }
        boolean changed = !Objects.equals(title, clip(values.label(), TITLE_MAX))
                || !Objects.equals(officialReviewId, values.reviewId())
                || !Objects.equals(evalDocumentRevisionId, values.revisionId())
                || !OFFICIAL_ACTIVE.equals(officialStatus)
                || !Objects.equals(officialTiming, values.timing() == null ? null : clip(values.timing(), 100))
                || differs(officialWeightPercent, values.weightPercent()) || differs(officialMaxScore, values.maxScore());
        if (!changed) {
            return false;
        }
        this.title = clip(values.label(), TITLE_MAX);
        this.evalDocumentRevisionId = values.revisionId();
        this.officialStatus = OFFICIAL_ACTIVE;
        applyOfficial(values, now);
        this.updatedAt = now;
        return true;
    }

    /** 최신 확정본에서 빠진 공식 항목: 행·학생 기록은 지우지 않고 상태만 표시. 이미 빠짐이면 false */
    public boolean withdrawOfficial(Instant now) {
        if (officialKey == null || OFFICIAL_WITHDRAWN.equals(officialStatus)) {
            return false;
        }
        this.officialStatus = OFFICIAL_WITHDRAWN;
        this.officialSyncedAt = now;
        this.updatedAt = now;
        return true;
    }

    private void applyOfficial(OfficialValues values, Instant now) {
        this.officialReviewId = values.reviewId();
        this.officialTiming = values.timing() == null ? null : clip(values.timing(), 100);
        this.officialWeightPercent = values.weightPercent();
        this.officialMaxScore = values.maxScore();
        this.officialSyncedAt = now;
    }

    private static boolean differs(java.math.BigDecimal a, java.math.BigDecimal b) {
        return a == null ? b != null : b == null || a.compareTo(b) != 0;
    }

    private static String clip(String value, int max) {
        String v = value == null ? "" : value.strip();
        return v.length() <= max ? v : v.substring(0, max);
    }

    public boolean isOfficial() {
        return officialKey != null;
    }

    public String officialKey() {
        return officialKey;
    }

    public String officialPlanId() {
        return officialPlanId;
    }

    public String officialReviewId() {
        return officialReviewId;
    }

    public String officialStatus() {
        return officialStatus;
    }

    public String officialTiming() {
        return officialTiming;
    }

    public java.math.BigDecimal officialWeightPercent() {
        return officialWeightPercent;
    }

    public java.math.BigDecimal officialMaxScore() {
        return officialMaxScore;
    }

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

    /** 학생 개인 수정. 공식 평가계획서 값은 바꾸지 않는다 (§12 PATCH). 학교 확정 행의 이름은 학교 확정본 값이다(A28-20) */
    public void editPersonalInfo(String newTitle, String newDescription, LocalDate newDeadline, Instant now) {
        if (officialKey != null && !Objects.equals(title, newTitle == null ? null : newTitle.strip())) {
            throw BusinessException.withFields(com.learnershigh.extension.common.error.CommonErrorCode.VALIDATION_ERROR,
                    new com.learnershigh.extension.common.error.FieldViolation("title", "official_field"));
        }
        this.title = requireTitle(newTitle);
        this.description = normalizeDescription(newDescription);
        this.deadlineDate = newDeadline;
        this.updatedAt = now;
    }

    /** A27-UX 학생 개인 관리 정보 수정 (유형·평가일·반영 비율·제출물·개인 메모). 공식 평가정보는 바꾸지 않는다. */
    public void editPersonalDetails(SchoolAssessmentType newType, LocalDate newEvaluationDate, Integer newWeightPercent,
            String newSubmissions, String newMemo, Instant now) {
        if (newWeightPercent != null && (newWeightPercent < 0 || newWeightPercent > 100)) {
            throw new IllegalArgumentException("weightPercent must be 0..100");
        }
        this.assessmentType = newType;
        this.evaluationDate = newEvaluationDate;
        this.weightPercent = newWeightPercent;
        this.submissions = normalize(newSubmissions, SUBMISSIONS_MAX);
        this.personalMemo = normalize(newMemo, MEMO_MAX);
        if (newType != SchoolAssessmentType.OTHER) {
            this.assessmentTypeLabel = null;
        }
        this.updatedAt = now;
    }

    /** '기타' 직접 입력 이름. 유형이 OTHER가 아니면 저장하지 않는다(null로 비운다). 호출 전에 유형을 먼저 정한다 */
    public void editTypeLabel(String label, Instant now) {
        this.assessmentTypeLabel = assessmentType == SchoolAssessmentType.OTHER ? normalize(label, TYPE_LABEL_MAX) : null;
        this.updatedAt = now;
    }

    public String assessmentTypeLabel() {
        return assessmentTypeLabel;
    }

    /**
     * §13 상태 변경. A27-UX(사용자 결정 2026-11-17): 학생 개인 진행 상태라 이전 단계로 되돌리기를 허용한다.
     * 바뀐 경우에만 이전 상태를 돌려준다(이력 기록용). 같은 상태 요청은 변경 없음(재시도 안전).
     */
    public SchoolAssessmentStatus changeStatus(SchoolAssessmentStatus target, Instant now) {
        if (!status.canMoveTo(target)) {
            throw new BusinessException(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    AssessmentErrorCode.INVALID_STATE_TRANSITION.message(),
                    Map.of("currentState", status.name(), "requestedAction", target.name()));
        }
        if (status == target) {
            return null;
        }
        SchoolAssessmentStatus previous = status;
        this.status = target;
        this.updatedAt = now;
        return previous;
    }

    private static String normalize(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.strip().length() > max) {
            throw new IllegalArgumentException("text too long");
        }
        return value.strip();
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

    public SchoolAssessmentType assessmentType() {
        return assessmentType;
    }

    public LocalDate evaluationDate() {
        return evaluationDate;
    }

    public Integer weightPercent() {
        return weightPercent;
    }

    public String submissions() {
        return submissions;
    }

    public String personalMemo() {
        return personalMemo;
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
