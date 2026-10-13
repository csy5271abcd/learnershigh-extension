package com.learnershigh.extension.studentcare.entity;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** 조정 약속: 목표 한 가지 · 행동 · 부담 한도 · 학생 합의. */
@Embeddable
public class CarePlan {

    static final int GOAL_MAX = 200;
    static final int ACTION_MAX = 200;
    static final int LOAD_LIMIT_MAX = 100;

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

    /** 목표 / 행동 필수, 학생 합의 필수 (domain.md §4-1). */
    public static CarePlan of(String goal, String action, String loadLimit, boolean agreedWithStudent) {
        String trimmedGoal = trim(goal);
        String trimmedAction = trim(action);
        String trimmedLoadLimit = trim(loadLimit);
        if (trimmedGoal.isEmpty() || trimmedAction.isEmpty()
                || trimmedGoal.length() > GOAL_MAX || trimmedAction.length() > ACTION_MAX
                || trimmedLoadLimit.length() > LOAD_LIMIT_MAX) {
            throw new BusinessException(StudentCareErrorCode.PLAN_REQUIRED);
        }
        if (!agreedWithStudent) {
            throw new BusinessException(StudentCareErrorCode.STUDENT_AGREEMENT_REQUIRED);
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
