package com.learnershigh.extension.studentcare.entity;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * 관리(케어 건). 상담 기록부터 관리 종료까지 한 학생의 한 번의 관리를 담는다 (docs/specs/wangyu/domain.md §4-1, §5).
 * 상태는 이 Entity의 메서드로만 바뀐다. 약속(plan)은 두지 않는다: 상담 내용이 곧 계획이다.
 */
@Entity
@Table(name = "care_case", uniqueConstraints = @UniqueConstraint(
        name = CareCase.ACTIVE_STUDENT_UNIQUE_KEY, columnNames = {"branch_id", "active_student_id"}))
public class CareCase {

    /** 진행 중 건은 지점 × 학생당 하나 (domain.md §5-1). */
    public static final String ACTIVE_STUDENT_UNIQUE_KEY = "uk_care_case_branch_active_student";
    /** 다음 점검일은 기준일 다음 날부터 이 일수 안에서 고른다. */
    public static final int MAX_RECHECK_DAYS = 28;
    /** 상담 내용 최대 길이 (api-contract.md §65-4, 65-7). */
    public static final int MEMO_MAX = 1000;

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "branch_id", nullable = false, length = 64)
    private String branchId;

    @Column(name = "student_id", nullable = false, length = 64)
    private String studentId;

    /** 진행 중일 때만 studentId. (branch_id, active_student_id) Unique 제약으로 지점 × 학생당 진행 중 건을 하나로 막는다. */
    @Column(name = "active_student_id", length = 64)
    private String activeStudentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private CareCaseStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 30)
    private CareReason reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "close_type", length = 30)
    private CareCloseType closeType;

    @Column(name = "opened_on", nullable = false)
    private LocalDate openedOn;

    @Column(name = "closed_on")
    private LocalDate closedOn;

    /** 종결 시각. 같은 종결일의 건 중 "나중에 종결된 건"을 가린다 (domain.md §3 cooldownDays). */
    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "recheck_date")
    private LocalDate recheckDate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "care_case_baseline", joinColumns = @JoinColumn(name = "case_id"))
    @OrderColumn(name = "position")
    private List<CareBaselineSignal> baseline = new ArrayList<>();

    @OneToMany(mappedBy = "careCase", cascade = CascadeType.ALL)
    @OrderBy("sequence ASC")
    private List<CareEvent> events = new ArrayList<>();

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CareCase() {
    }

    private CareCase(String branchId, String studentId, CareReason reason, List<CareBaselineSignal> baseline,
            LocalDate today, Instant now) {
        this.id = "care_" + UUID.randomUUID();
        this.branchId = branchId;
        this.studentId = studentId;
        this.reason = reason;
        this.baseline = new ArrayList<>(baseline);
        this.openedOn = today;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * 상담 기록으로 관리를 연다.
     * 문제없음(EXPECTED_CHANGE) / 기록 오류(RECORD_ISSUE)는 바로 관리 종료, 계속 관리(ADJUSTMENT_NEEDED)는 다음 점검일로 관리를 시작한다.
     */
    public static CareCase open(String branchId, String studentId, CareReason reason,
            List<CareBaselineSignal> baseline, NoteChannel channel, String memo, LocalDate recheckDate,
            LocalDate today, Instant now) {
        if (baseline.isEmpty()) {
            throw new BusinessException(StudentCareErrorCode.STUDENT_NOT_FLAGGED);
        }
        String trimmedMemo = memo(memo, "memo", false);
        if (reason == CareReason.ADJUSTMENT_NEEDED) {
            requireValidRecheckDate(recheckDate, today, "recheckDate");
        }
        CareCase careCase = new CareCase(branchId, studentId, reason, baseline, today, now);
        careCase.addEvent(CareEventType.REASON_CONFIRMED, today, now, CareTextFormat.counseling(channel, trimmedMemo), channel);

        switch (reason) {
            case EXPECTED_CHANGE -> careCase.close(CareCloseType.EXPECTED_CHANGE, today, now, "문제없음 · 관리 종료");
            case RECORD_ISSUE -> careCase.close(CareCloseType.RECORD_ISSUE, today, now, "기록 오류 · 관리 종료");
            case ADJUSTMENT_NEEDED -> {
                careCase.recheckDate = recheckDate;
                careCase.status = CareCaseStatus.IN_ADJUSTMENT;
                careCase.activeStudentId = studentId;
                careCase.addEvent(CareEventType.ADJUSTMENT_STARTED, today, now, CareTextFormat.continued(recheckDate), null);
            }
        }
        return careCase;
    }

    /** 다음 점검일이 되었는지. 결정은 점검일 이후에만 할 수 있다. */
    public boolean isRecheckDue(LocalDate today) {
        return status == CareCaseStatus.IN_ADJUSTMENT && recheckDate != null && !today.isBefore(recheckDate);
    }

    /** 점검 후 관리 종료. */
    public void closeAfterRecheck(String comparisonText, LocalDate today, Instant now) {
        requireDecidable(today);
        addEvent(CareEventType.RECHECKED, today, now, comparisonText, null);
        close(CareCloseType.AFTER_RECHECK, today, now, "관리 종료");
    }

    /** 점검 후 계속 관리. */
    public void continueAfterRecheck(String comparisonText, LocalDate nextRecheckDate, LocalDate today, Instant now) {
        requireDecidable(today);
        requireValidRecheckDate(nextRecheckDate, today, "recheckDate");
        addEvent(CareEventType.RECHECKED, today, now, comparisonText, null);
        this.recheckDate = nextRecheckDate;
        touch(now);
        addEvent(CareEventType.CONTINUED, today, now, CareTextFormat.continued(nextRecheckDate), null);
    }

    /** 관리 중 상담 기록. 상태와 관계없이 남길 수 있다. */
    public CareEvent addNote(NoteChannel channel, String content, LocalDate today, Instant now) {
        String trimmed = memo(content, "content", true);
        touch(now);
        return addEvent(CareEventType.NOTE, today, now, CareTextFormat.counseling(channel, trimmed), channel);
    }

    /** 점검 결정을 할 수 있는지: 관리 중이고 다음 점검일이 되었어야 한다. 아니면 409. */
    public void requireDecidable(LocalDate today) {
        if (status != CareCaseStatus.IN_ADJUSTMENT) {
            throw new BusinessException(StudentCareErrorCode.INVALID_STATE_TRANSITION);
        }
        if (!isRecheckDue(today)) {
            throw new BusinessException(StudentCareErrorCode.RECHECK_NOT_DUE);
        }
    }

    /**
     * 다음 점검일은 기준일 다음 날 ~ {@value #MAX_RECHECK_DAYS}일 뒤 (api-contract.md §65-4, 65-6).
     * 아니면 422 INVALID_RECHECK_DATE, {@code details.fields}에 {@code field}.
     */
    public static void requireValidRecheckDate(LocalDate recheckDate, LocalDate today, String field) {
        if (recheckDate == null) {
            throw BusinessException.withFields(StudentCareErrorCode.INVALID_RECHECK_DATE, new FieldViolation(field, "required"));
        }
        if (!recheckDate.isAfter(today) || recheckDate.isAfter(today.plusDays(MAX_RECHECK_DAYS))) {
            throw BusinessException.withFields(StudentCareErrorCode.INVALID_RECHECK_DATE, new FieldViolation(field, "range"));
        }
    }

    private void close(CareCloseType type, LocalDate today, Instant now, String text) {
        this.status = CareCaseStatus.CLOSED;
        this.closeType = type;
        this.closedOn = today;
        this.closedAt = now;
        this.recheckDate = null;
        this.activeStudentId = null;
        touch(now);
        addEvent(CareEventType.CLOSED, today, now, text, null);
    }

    private CareEvent addEvent(CareEventType type, LocalDate today, Instant now, String content, NoteChannel channel) {
        CareEvent event = new CareEvent(this, events.size() + 1, type, today, content, channel, now);
        events.add(event);
        return event;
    }

    private void touch(Instant now) {
        this.updatedAt = now;
    }

    /** 상담 내용: 앞뒤 공백을 지우고 {@value #MEMO_MAX}자까지. 넘거나(필수일 때) 비어 있으면 400 VALIDATION_ERROR. */
    private static String memo(String value, String field, boolean required) {
        String trimmed = value == null ? "" : value.strip();
        if (required && trimmed.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation(field, "required"));
        }
        if (trimmed.length() > MEMO_MAX) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation(field, "length"));
        }
        return trimmed;
    }

    public String id() {
        return id;
    }

    public String branchId() {
        return branchId;
    }

    public String studentId() {
        return studentId;
    }

    /** 진행 중일 때만 studentId, 종결되면 null (Unique 제약용 값). Domain 밖에서는 쓰지 않는다. */
    String activeStudentId() {
        return activeStudentId;
    }

    public CareCaseStatus status() {
        return status;
    }

    public CareReason reason() {
        return reason;
    }

    public CareCloseType closeType() {
        return closeType;
    }

    public LocalDate openedOn() {
        return openedOn;
    }

    public LocalDate closedOn() {
        return closedOn;
    }

    public Instant closedAt() {
        return closedAt;
    }

    public LocalDate recheckDate() {
        return recheckDate;
    }

    public List<CareBaselineSignal> baseline() {
        return Collections.unmodifiableList(baseline);
    }

    public List<CareEvent> events() {
        return Collections.unmodifiableList(events);
    }
}
