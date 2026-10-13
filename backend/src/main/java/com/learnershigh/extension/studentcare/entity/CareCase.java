package com.learnershigh.extension.studentcare.entity;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
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
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

/**
 * 케어 건. 사유 확인부터 종결까지 한 학생의 한 번의 케어를 담는다 (docs/specs/wangyu/domain.md §4-1, §5).
 * 상태는 이 Entity의 메서드로만 바뀐다.
 */
@Entity
@Table(name = "care_case")
public class CareCase {

    /** 재점검일은 기준일 다음 날부터 이 일수 안에서 고른다. */
    public static final int MAX_RECHECK_DAYS = 28;
    static final int MEMO_MAX = 1000;

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "branch_id", nullable = false, length = 64)
    private String branchId;

    @Column(name = "student_id", nullable = false, length = 64)
    private String studentId;

    /** 진행 중일 때만 studentId. Unique 제약으로 학생당 진행 중 건을 하나로 막는다. */
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

    @Column(name = "recheck_date")
    private LocalDate recheckDate;

    @Embedded
    private CarePlan plan;

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
     * 사유 확인으로 케어 건을 연다.
     * EXPECTED_CHANGE / RECORD_ISSUE는 기록만 남기고 바로 종결, ADJUSTMENT_NEEDED는 약속과 재점검일로 조정을 시작한다.
     */
    public static CareCase open(String branchId, String studentId, CareReason reason,
            List<CareBaselineSignal> baseline, String memo, CarePlan plan, LocalDate recheckDate,
            LocalDate today, Instant now) {
        if (baseline.isEmpty()) {
            throw new BusinessException(StudentCareErrorCode.STUDENT_NOT_FLAGGED);
        }
        CareCase careCase = new CareCase(branchId, studentId, reason, baseline, today, now);
        careCase.addEvent(CareEventType.REASON_CONFIRMED, today, now, reasonText(reason, memo), null);

        switch (reason) {
            case EXPECTED_CHANGE -> careCase.close(CareCloseType.EXPECTED_CHANGE, today, now, "기록만 남기고 종결");
            case RECORD_ISSUE -> careCase.close(CareCloseType.RECORD_ISSUE, today, now, "기록 확인으로 넘기고 종결");
            case ADJUSTMENT_NEEDED -> careCase.startAdjustment(plan, recheckDate, today, now);
        }
        return careCase;
    }

    private void startAdjustment(CarePlan plan, LocalDate recheckDate, LocalDate today, Instant now) {
        if (plan == null) {
            throw new BusinessException(StudentCareErrorCode.PLAN_REQUIRED);
        }
        validateRecheckDate(recheckDate, today);
        this.plan = plan;
        this.recheckDate = recheckDate;
        this.status = CareCaseStatus.IN_ADJUSTMENT;
        this.activeStudentId = studentId;
        addEvent(CareEventType.ADJUSTMENT_STARTED, today, now,
                "조정 시작 — " + plan.action() + " (재점검 " + CareTextFormat.monthDay(recheckDate) + ")", null);
    }

    /** 재점검일이 되었는지. 결정은 재점검일 이후에만 할 수 있다. */
    public boolean isRecheckDue(LocalDate today) {
        return status == CareCaseStatus.IN_ADJUSTMENT && recheckDate != null && !today.isBefore(recheckDate);
    }

    /** 재점검 후 종결. */
    public void closeAfterRecheck(String comparisonText, LocalDate today, Instant now) {
        requireRecheckDue(today);
        addEvent(CareEventType.RECHECKED, today, now, comparisonText, null);
        close(CareCloseType.AFTER_RECHECK, today, now, "재점검 후 선생님이 종결");
    }

    /** 재점검 후 같은 약속으로 계속. */
    public void continueAfterRecheck(String comparisonText, LocalDate nextRecheckDate, LocalDate today, Instant now) {
        requireRecheckDue(today);
        validateRecheckDate(nextRecheckDate, today);
        addEvent(CareEventType.RECHECKED, today, now, comparisonText, null);
        this.recheckDate = nextRecheckDate;
        touch(now);
        addEvent(CareEventType.CONTINUED, today, now,
                "같은 약속으로 계속 (다음 재점검 " + CareTextFormat.monthDay(nextRecheckDate) + ")", null);
    }

    /** 재점검 후 약속 수정. */
    public void reviseAfterRecheck(String comparisonText, CarePlan newPlan, LocalDate nextRecheckDate,
            LocalDate today, Instant now) {
        requireRecheckDue(today);
        if (newPlan == null) {
            throw new BusinessException(StudentCareErrorCode.PLAN_REQUIRED);
        }
        validateRecheckDate(nextRecheckDate, today);
        addEvent(CareEventType.RECHECKED, today, now, comparisonText, null);
        this.plan = newPlan;
        this.recheckDate = nextRecheckDate;
        touch(now);
        addEvent(CareEventType.REVISED, today, now,
                "약속 수정 — " + newPlan.action() + " (재점검 " + CareTextFormat.monthDay(nextRecheckDate) + ")", null);
    }

    /** 면담 / 통화 메모. 상태와 관계없이 남길 수 있다. */
    public CareEvent addNote(NoteChannel channel, String content, LocalDate today, Instant now) {
        touch(now);
        return addEvent(CareEventType.NOTE, today, now, content.strip(), channel);
    }

    private void requireRecheckDue(LocalDate today) {
        if (status != CareCaseStatus.IN_ADJUSTMENT) {
            throw new BusinessException(StudentCareErrorCode.INVALID_STATE_TRANSITION);
        }
        if (!isRecheckDue(today)) {
            throw new BusinessException(StudentCareErrorCode.RECHECK_NOT_DUE);
        }
    }

    private static void validateRecheckDate(LocalDate recheckDate, LocalDate today) {
        if (recheckDate == null || !recheckDate.isAfter(today) || recheckDate.isAfter(today.plusDays(MAX_RECHECK_DAYS))) {
            throw new BusinessException(StudentCareErrorCode.INVALID_RECHECK_DATE);
        }
    }

    private void close(CareCloseType type, LocalDate today, Instant now, String text) {
        this.status = CareCaseStatus.CLOSED;
        this.closeType = type;
        this.closedOn = today;
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

    private static String reasonText(CareReason reason, String memo) {
        String label = switch (reason) {
            case EXPECTED_CHANGE -> "예상된 변화";
            case RECORD_ISSUE -> "기록 문제";
            case ADJUSTMENT_NEEDED -> "조정 필요";
        };
        String trimmed = memo == null ? "" : memo.strip();
        if (trimmed.length() > MEMO_MAX) {
            trimmed = trimmed.substring(0, MEMO_MAX);
        }
        return trimmed.isEmpty() ? "사유 확인: " + label : "사유 확인: " + label + " — " + trimmed;
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

    public LocalDate recheckDate() {
        return recheckDate;
    }

    public CarePlan plan() {
        return plan;
    }

    public List<CareBaselineSignal> baseline() {
        return Collections.unmodifiableList(baseline);
    }

    public List<CareEvent> events() {
        return Collections.unmodifiableList(events);
    }
}
