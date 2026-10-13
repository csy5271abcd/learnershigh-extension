package com.learnershigh.extension.studentcare.entity;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** 조정 약속: 목표 한 가지 · 행동 · 부담 한도 · 학생 합의. */
@Embeddable
public class CarePlan {

    public static final int GOAL_MAX = 200;
    public static final int ACTION_MAX = 200;
    public static final int LOAD_LIMIT_MAX = 100;

    @Column(name = "plan_goal", length = GOAL_MAX)
    private String goal;

    @Column(name = "plan_action", length = ACTION_MAX)
    private String action;

    @Column(name = "plan_load_limit", length = LOAD_LIMIT_MAX)
    private String loadLimit;

    @Column(name = "plan_agreed_with_student")
    private Boolean agreedWithStudent;

    protected CarePlan() {
    }

    private CarePlan(String goal, String action, String loadLimit) {
        this.goal = goal;
        this.action = action;
        this.loadLimit = loadLimit;
        this.agreedWithStudent = true;
    }

    /**
     * 목표 / 행동 필수, 학생 합의 필수 (domain.md §4-1, api-contract.md §65-4).
     * 빈 목표 / 행동은 422 PLAN_REQUIRED, 합의 없음은 422 STUDENT_AGREEMENT_REQUIRED, 길이 초과는 400 VALIDATION_ERROR이며
     * 모두 원인 필드({@code plan.goal} 등)를 담는다. 사유 확인의 약속은 ADJUSTMENT_NEEDED일 때만 여기서 검증한다(api-contract.md §65-4).
     * 길이 검사는 Column 길이를 지키는 불변식이기도 하다.
     */
    public static CarePlan of(String goal, String action, String loadLimit, boolean agreedWithStudent) {
        String trimmedGoal = trim(goal);
        String trimmedAction = trim(action);
        String trimmedLoadLimit = trim(loadLimit);
        List<FieldViolation> missing = new ArrayList<>();
        if (trimmedGoal.isEmpty()) {
            missing.add(new FieldViolation("plan.goal", "required"));
        }
        if (trimmedAction.isEmpty()) {
            missing.add(new FieldViolation("plan.action", "required"));
        }
        if (!missing.isEmpty()) {
            throw BusinessException.withFields(StudentCareErrorCode.PLAN_REQUIRED, missing.toArray(FieldViolation[]::new));
        }
        List<FieldViolation> tooLong = new ArrayList<>();
        if (trimmedGoal.length() > GOAL_MAX) {
            tooLong.add(new FieldViolation("plan.goal", "length"));
        }
        if (trimmedAction.length() > ACTION_MAX) {
            tooLong.add(new FieldViolation("plan.action", "length"));
        }
        if (trimmedLoadLimit.length() > LOAD_LIMIT_MAX) {
            tooLong.add(new FieldViolation("plan.loadLimit", "length"));
        }
        if (!tooLong.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, tooLong.toArray(FieldViolation[]::new));
        }
        if (!agreedWithStudent) {
            throw BusinessException.withFields(StudentCareErrorCode.STUDENT_AGREEMENT_REQUIRED,
                    new FieldViolation("plan.agreedWithStudent", "required"));
        }
        return new CarePlan(trimmedGoal, trimmedAction, trimmedLoadLimit.isEmpty() ? null : trimmedLoadLimit);
    }

    private static String trim(String value) {
        return value == null ? "" : value.strip();
    }

    public String goal() {
        return goal;
    }

    public String action() {
        return action;
    }

    public String loadLimit() {
        return loadLimit;
    }

    public boolean agreedWithStudent() {
        return Boolean.TRUE.equals(agreedWithStudent);
    }
}
