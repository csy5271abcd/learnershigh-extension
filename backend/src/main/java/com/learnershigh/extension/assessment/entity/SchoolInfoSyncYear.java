package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * A27-UX 부록 E (domain.md §30-B): 학교·학년도별 학교알리미 마지막 확인 결과. 끝난 상태만 저장한다(진행 상태는 메모리).
 * TTL 안이고 FAILED 가 아니면 다음 자동 확인에서 외부 요청 없이 이 기록으로 답한다.
 */
@Entity
@Table(name = "assessment_schoolinfo_sync_year")
public class SchoolInfoSyncYear {

    @Embeddable
    public record Key(@Column(name = "school_id", length = 64) String schoolId,
            @Column(name = "academic_year") int academicYear) implements Serializable {
    }

    @EmbeddedId
    private Key key;

    @Column(name = "status", nullable = false, length = 40)
    private String status;

    @Column(name = "resolved_source_year")
    private Integer resolvedSourceYear;

    @Column(name = "message", length = 300)
    private String message;

    @Column(name = "checked_at", nullable = false)
    private Instant checkedAt;

    protected SchoolInfoSyncYear() {
    }

    public static SchoolInfoSyncYear of(String schoolId, int academicYear) {
        SchoolInfoSyncYear y = new SchoolInfoSyncYear();
        y.key = new Key(Objects.requireNonNull(schoolId), academicYear);
        return y;
    }

    /** 확인 결과 기록 (끝난 상태만). */
    public void checked(String status, Integer resolvedSourceYear, String message, Instant now) {
        this.status = Objects.requireNonNull(status);
        this.resolvedSourceYear = resolvedSourceYear;
        this.message = message == null || message.length() <= 300 ? message : message.substring(0, 300);
        this.checkedAt = Objects.requireNonNull(now);
    }

    public String schoolId() {
        return key.schoolId();
    }

    public int academicYear() {
        return key.academicYear();
    }

    public String status() {
        return status;
    }

    public Integer resolvedSourceYear() {
        return resolvedSourceYear;
    }

    public String message() {
        return message;
    }

    public Instant checkedAt() {
        return checkedAt;
    }
}
