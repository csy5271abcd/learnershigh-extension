package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * A28-33 학생 홈 달력 개인 임시 배치(api-contract §30-b DRAFT). 학생 본인 화면 표시용 날짜일 뿐 공식 날짜가 아니다.
 * Invariant: rangeFrom ≤ displayDate ≤ rangeTo (입력 검증은 서비스, DB CHECK 이중).
 */
@Entity
@Table(name = "assessment_student_calendar_placement")
public class CalendarPlacement {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "student_id", length = 64, nullable = false, updatable = false)
    private String studentId;

    @Column(name = "academic_year", nullable = false, updatable = false)
    private int academicYear;

    @Column(name = "semester", nullable = false, updatable = false)
    private int semester;

    @Column(name = "source_key", length = 200, nullable = false, updatable = false)
    private String sourceKey;

    @Column(name = "display_date", nullable = false)
    private LocalDate displayDate;

    @Column(name = "range_from", nullable = false)
    private LocalDate rangeFrom;

    @Column(name = "range_to", nullable = false)
    private LocalDate rangeTo;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CalendarPlacement() {
    }

    public static CalendarPlacement start(String studentId, int academicYear, int semester, String sourceKey) {
        CalendarPlacement placement = new CalendarPlacement();
        placement.id = "cpl_" + UUID.randomUUID().toString().replace("-", "");
        placement.studentId = Objects.requireNonNull(studentId);
        placement.academicYear = academicYear;
        placement.semester = semester;
        placement.sourceKey = Objects.requireNonNull(sourceKey);
        return placement;
    }

    /** 표시 날짜를 옮긴다. 범위 밖이면 거절(서비스가 먼저 400으로 막는다) */
    public void place(LocalDate date, LocalDate from, LocalDate to, Instant now) {
        if (from.isAfter(to) || date.isBefore(from) || date.isAfter(to)) {
            throw new IllegalArgumentException("display date out of range");
        }
        this.displayDate = date;
        this.rangeFrom = from;
        this.rangeTo = to;
        this.updatedAt = now;
    }

    public String sourceKey() {
        return sourceKey;
    }

    public LocalDate displayDate() {
        return displayDate;
    }

    public LocalDate rangeFrom() {
        return rangeFrom;
    }

    public LocalDate rangeTo() {
        return rangeTo;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
