package com.learnershigh.extension.assessment.entity;

import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;

/**
 * A27-UX 학생 홈 메모(api-contract '§30-a', 2026-11-19 DRAFT). 학생 한 명당 하나, 본인만 읽고 쓴다.
 * 탐구 노트(§20)와 별개인 간단 메모다. version은 직접 비교(expectedVersion)로 덮어쓰기를 막는다.
 */
@Entity
@Table(name = "assessment_home_memo")
public class HomeMemo {

    public static final int BODY_MAX = 2000;

    @Id
    @Column(name = "student_id", length = 64)
    private String studentId;

    @Column(name = "body", length = BODY_MAX)
    private String body;

    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected HomeMemo() {
    }

    public static HomeMemo start(String studentId, Instant now) {
        HomeMemo memo = new HomeMemo();
        memo.studentId = Objects.requireNonNull(studentId);
        memo.version = 0;
        memo.updatedAt = now;
        return memo;
    }

    /** 내용 바꾸기. 기대 버전이 다르면 409(다른 탭·기기에서 먼저 저장). 빈 내용은 지움(null) */
    public void write(String newBody, long expectedVersion, Instant now) {
        if (expectedVersion != version) {
            throw new BusinessException(AssessmentErrorCode.RESOURCE_VERSION_CONFLICT);
        }
        String cleaned = newBody == null || newBody.isBlank() ? null : newBody.strip();
        if (cleaned != null && cleaned.length() > BODY_MAX) {
            throw new IllegalArgumentException("body too long");
        }
        this.body = cleaned;
        this.version = version + 1;
        this.updatedAt = now;
    }

    public String studentId() {
        return studentId;
    }

    public String body() {
        return body;
    }

    public long version() {
        return version;
    }

    public Instant updatedAt() {
        return updatedAt;
    }
}
