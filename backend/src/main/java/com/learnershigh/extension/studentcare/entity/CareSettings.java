package com.learnershigh.extension.studentcare.entity;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 지점별 신호 기준값 (docs/specs/wangyu/domain.md §4-3). 저장된 값이 없으면 {@link #defaults}. */
@Entity
@Table(name = "care_settings")
public class CareSettings {

    @Id
    @Column(name = "branch_id", length = 64)
    private String branchId;

    @Column(name = "absence_days", nullable = false)
    private int absenceDays;

    @Column(name = "plan_missing_days", nullable = false)
    private int planMissingDays;

    @Column(name = "study_drop_percent", nullable = false)
    private int studyDropPercent;

    @Column(name = "execution_rate_percent", nullable = false)
    private int executionRatePercent;

    @Column(name = "subject_share_gap_points", nullable = false)
    private int subjectShareGapPoints;

    @Column(name = "start_shift_minutes", nullable = false)
    private int startShiftMinutes;

    @Column(name = "min_valid_days", nullable = false)
    private int minValidDays;

    @Column(name = "cooldown_days", nullable = false)
    private int cooldownDays;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CareSettings() {
    }

    private CareSettings(String branchId, Values values, Instant now) {
        this.branchId = branchId;
        apply(values, now);
    }

    public static CareSettings defaults(String branchId) {
        return new CareSettings(branchId, Values.DEFAULTS, Instant.EPOCH);
    }

    public static CareSettings create(String branchId, Values values, Instant now) {
        validate(values);
        return new CareSettings(branchId, values, now);
    }

    public void update(Values values, Instant now) {
        validate(values);
        apply(values, now);
    }

    private void apply(Values values, Instant now) {
        this.absenceDays = values.absenceDays();
        this.planMissingDays = values.planMissingDays();
        this.studyDropPercent = values.studyDropPercent();
        this.executionRatePercent = values.executionRatePercent();
        this.subjectShareGapPoints = values.subjectShareGapPoints();
        this.startShiftMinutes = values.startShiftMinutes();
        this.minValidDays = values.minValidDays();
        this.cooldownDays = values.cooldownDays();
        this.updatedAt = now;
    }

    private static void validate(Values values) {
        List<FieldViolation> violations = new ArrayList<>();
        check(violations, "absenceDays", values.absenceDays(), 2, 14);
        check(violations, "planMissingDays", values.planMissingDays(), 1, 7);
        check(violations, "studyDropPercent", values.studyDropPercent(), 10, 90);
        check(violations, "executionRatePercent", values.executionRatePercent(), 10, 100);
        check(violations, "subjectShareGapPoints", values.subjectShareGapPoints(), 5, 60);
        check(violations, "startShiftMinutes", values.startShiftMinutes(), 30, 300);
        check(violations, "minValidDays", values.minValidDays(), 1, 7);
        check(violations, "cooldownDays", values.cooldownDays(), 0, 30);
        if (!violations.isEmpty()) {
            throw new BusinessException(StudentCareErrorCode.INVALID_CARE_SETTINGS,
                    StudentCareErrorCode.INVALID_CARE_SETTINGS.message(), Map.of("fields", violations));
        }
    }

    private static void check(List<FieldViolation> violations, String field, int value, int min, int max) {
        if (value < min || value > max) {
            violations.add(new FieldViolation(field, "range"));
        }
    }

    public Values values() {
        return new Values(absenceDays, planMissingDays, studyDropPercent, executionRatePercent,
                subjectShareGapPoints, startShiftMinutes, minValidDays, cooldownDays);
    }

    public String branchId() {
        return branchId;
    }

    /** 기준값 묶음. 신호 계산은 이 값만 본다. */
    public record Values(
            int absenceDays,
            int planMissingDays,
            int studyDropPercent,
            int executionRatePercent,
            int subjectShareGapPoints,
            int startShiftMinutes,
            int minValidDays,
            int cooldownDays) {

        public static final Values DEFAULTS = new Values(3, 3, 40, 60, 15, 90, 3, 7);
    }
}
