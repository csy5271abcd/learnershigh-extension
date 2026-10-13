package com.learnershigh.extension.common.error;

import java.sql.SQLException;
import java.util.Locale;
import org.hibernate.exception.ConstraintViolationException;

/**
 * DB 제약 위반이 특정 제약(Unique / Primary Key 이름) 때문인지 판별한다. 다른 위반을 업무 오류로 바꾸지 않기 위해 쓴다.
 * 특정 Domain에 묶이지 않는 공통 판별이라 common/error에 둔다(어느 Domain Service든 같은 방식으로 쓴다).
 */
public final class ConstraintViolations {

    private ConstraintViolations() {
    }

    /**
     * {@code exception}의 원인 중 이름이 {@code constraintName}인 제약 위반이 있는지.
     * MySQL은 제약 이름을 {@code table.key}로 알려 주므로 Table 접두어는 무시한다.
     */
    public static boolean violates(Throwable exception, String constraintName) {
        String expected = constraintName.toLowerCase(Locale.ROOT);
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation && violation.getConstraintName() != null) {
                if (matches(violation.getConstraintName(), expected)) {
                    return true;
                }
            } else if (cause instanceof SQLException sql && sql.getMessage() != null) {
                // 예: Duplicate entry 'br-stu' for key 'care_case.uk_care_case_branch_active_student'
                String message = sql.getMessage().toLowerCase(Locale.ROOT);
                if (message.contains("'" + expected + "'") || message.contains("." + expected + "'")) {
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean matches(String actualName, String expected) {
        String actual = actualName.toLowerCase(Locale.ROOT);
        return actual.equals(expected) || actual.endsWith("." + expected);
    }
}
