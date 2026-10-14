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
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 지점별 신호 기준값 (docs/specs/wangyu/domain.md §4-3). 저장된 값이 없으면 {@link Values#DEFAULTS}.
 * 허용 범위는 {@link #RANGES} 한 곳에서 정의하고, 검증과 API 응답(ranges)이 같은 값을 쓴다.
 */
@Entity
@Table(name = "care_settings")
public class CareSettings {

    /** Key(api-contract.md §65-9 필드명) → 허용 범위. 순서는 Contract 필드 순서다. */
    public static final Map<String, Range> RANGES = ranges();

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
        Map<String, Integer> byKey = values.asMap();
        RANGES.forEach((key, range) -> {
            if (!range.contains(byKey.get(key))) {
                violations.add(new FieldViolation(key, "range"));
            }
        });
        if (!violations.isEmpty()) {
            throw new BusinessException(StudentCareErrorCode.INVALID_CARE_SETTINGS,
                    StudentCareErrorCode.INVALID_CARE_SETTINGS.message(), Map.of("fields", violations));
        }
    }

    private static Map<String, Range> ranges() {
        Map<String, Range> ranges = new LinkedHashMap<>();
        ranges.put("absenceDays", new Range(2, 14));
        ranges.put("planMissingDays", new Range(1, 7));
        ranges.put("studyDropPercent", new Range(10, 90));
        ranges.put("executionRatePercent", new Range(10, 100));
        ranges.put("subjectShareGapPoints", new Range(5, 60));
        ranges.put("startShiftMinutes", new Range(30, 300));
        ranges.put("minValidDays", new Range(1, 7));
        ranges.put("cooldownDays", new Range(0, 30));
        return Collections.unmodifiableMap(ranges);
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

        /** Key(api-contract.md §65-9 필드명) → 값. {@link CareSettings#RANGES}와 같은 Key다. */
        public Map<String, Integer> asMap() {
            Map<String, Integer> map = new LinkedHashMap<>();
            map.put("absenceDays", absenceDays);
            map.put("planMissingDays", planMissingDays);
            map.put("studyDropPercent", studyDropPercent);
            map.put("executionRatePercent", executionRatePercent);
            map.put("subjectShareGapPoints", subjectShareGapPoints);
            map.put("startShiftMinutes", startShiftMinutes);
            map.put("minValidDays", minValidDays);
            map.put("cooldownDays", cooldownDays);
            return Collections.unmodifiableMap(map);
        }
    }

    /** 허용 범위 (양 끝 포함). */
    public record Range(int min, int max) {

        public boolean contains(int value) {
            return value >= min && value <= max;
        }
    }
}
