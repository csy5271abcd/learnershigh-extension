package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * A27-UX 학생 화면(api-contract '§12-a·§9-1-a', 2026-11-19 DRAFT): 학생이 수행평가 등록과 함께 자기 학기 수강 목록에 더한 과목.
 * subjectId는 같은 학기 공통 과목 후보의 기존 ID(재사용)이거나 학생 소유 개인 과목 ID({@value #PERSONAL_PREFIX}…)다.
 * 학교 공식 개설·수강 원천 목록은 바꾸지 않는다 — 학생 개인 목록에 덧붙이는 기록이다.
 */
@Entity
@Table(name = "assessment_student_subject")
public class StudentSubject {

    public static final String PERSONAL_PREFIX = "psubj_";
    public static final int NAME_MAX = 50;

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

    @Column(name = "name", nullable = false, length = NAME_MAX, updatable = false)
    private String name;

    @Column(name = "name_key", nullable = false, length = NAME_MAX, updatable = false)
    private String nameKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected StudentSubject() {
    }

    private StudentSubject(String studentId, int academicYear, int semester, String subjectId, String name, Instant now) {
        this.id = "ssubj_" + UUID.randomUUID();
        this.studentId = Objects.requireNonNull(studentId);
        this.academicYear = academicYear;
        this.semester = semester;
        this.subjectId = Objects.requireNonNull(subjectId);
        this.name = cleanName(name);
        this.nameKey = nameKey(this.name);
        this.createdAt = now;
    }

    /** 같은 학기 공통 과목 후보의 기존 ID를 재사용해 학생 목록에 더한다 */
    public static StudentSubject reuse(String studentId, int academicYear, int semester, String subjectId, String name,
            Instant now) {
        return new StudentSubject(studentId, academicYear, semester, subjectId, name, now);
    }

    /** 학교 데이터에 없는 학생 소유 개인 과목 */
    public static StudentSubject personal(String studentId, int academicYear, int semester, String name, Instant now) {
        return new StudentSubject(studentId, academicYear, semester, PERSONAL_PREFIX + UUID.randomUUID(), name, now);
    }

    /** 표시 이름: 앞뒤 공백 제거, 연속 공백 하나로. 1~50자, 제어문자 불가 */
    public static String cleanName(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("name required");
        }
        String cleaned = raw.strip().replaceAll("\\s+", " ");
        if (cleaned.isEmpty() || cleaned.length() > NAME_MAX || cleaned.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("name invalid");
        }
        return cleaned;
    }

    /** 이름 규칙 확인(예외 없이) */
    public static boolean validName(String raw) {
        try {
            cleanName(raw);
            return true;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    /** 비교 키: 공백을 모두 지우고 소문자 (예: "공통 국어1" = "공통국어1") */
    public static String nameKey(String name) {
        return name.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
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

    public String name() {
        return name;
    }

    public String nameKey() {
        return nameKey;
    }
}
