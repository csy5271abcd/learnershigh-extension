package com.learnershigh.extension.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLIntegrityConstraintViolationException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

/** 특정 제약 위반만 업무 오류로 바꾸고 나머지는 그대로 올리기 위한 판별 (domain.md §5-1). */
class ConstraintViolationsTest {

    private static final String KEY = "uk_care_case_branch_active_student";

    private static DataIntegrityViolationException duplicate(String constraintName, String message) {
        SQLIntegrityConstraintViolationException sql = new SQLIntegrityConstraintViolationException(message);
        return new DataIntegrityViolationException("could not execute statement",
                new ConstraintViolationException("could not execute statement", sql, "insert ...", constraintName));
    }

    @Test
    void matchesNamedConstraintWithOrWithoutTablePrefix() {
        assertThat(ConstraintViolations.violates(duplicate(KEY, "x"), KEY)).isTrue();
        assertThat(ConstraintViolations.violates(duplicate("care_case." + KEY, "x"), KEY)).isTrue();
    }

    @Test
    void fallsBackToMySqlMessageWhenNameIsUnknown() {
        assertThat(ConstraintViolations.violates(duplicate(null,
                "Duplicate entry 'br-stu' for key 'care_case." + KEY + "'"), KEY)).isTrue();
        assertThat(ConstraintViolations.violates(duplicate(null,
                "Duplicate entry 'br' for key 'care_settings.PRIMARY'"), "PRIMARY")).isTrue();
    }

    @Test
    void otherConstraintsAreNotTranslated() {
        assertThat(ConstraintViolations.violates(duplicate("uk_care_event_case_sequence",
                "Duplicate entry 'x-1' for key 'care_event.uk_care_event_case_sequence'"), KEY)).isFalse();
        assertThat(ConstraintViolations.violates(duplicate(null, "Column 'summary' cannot be null"), KEY)).isFalse();
        assertThat(ConstraintViolations.violates(new DataIntegrityViolationException("no cause"), KEY)).isFalse();
    }
}
