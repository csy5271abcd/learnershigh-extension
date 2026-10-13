package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * phapi 학생 객체. {@code v2/branches/select_students.php}의 배열 원소와
 * {@code v2/branches/select_study_reports_period.php}의 {@code student_list[].user}가 같은 Shape이다.
 *
 * <p>원본 응답에는 {@code password}, {@code php_session_id}, 연락처 등이 함께 오지만 읽지 않는다.
 *
 * @param id          {@code user.id} (bigint)
 * @param roleId      {@code user.role_id}. 학생은 5
 * @param realName    {@code user.real_name}
 * @param status      {@code user.status}: ACTIVE / INACTIVE / DELETED
 * @param userSvcFlag {@code user.user_svc_flag}. 1째자리 AI, 2째자리 무계획모드(1=사용)
 * @param grade       {@code convertGradeToKor(user.grade)}
 * @param group       {@code user_group} (반)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhapiStudent(
        long id,
        @JsonProperty("role_id") int roleId,
        @JsonProperty("real_name") String realName,
        String status,
        @JsonProperty("user_svc_flag") String userSvcFlag,
        String school,
        String grade,
        PhapiRef group) {

    /** 무계획모드 학생은 학습계획을 제출하지 않으므로 {@code plan_status}가 계속 "제출전"이다. */
    public boolean noPlanMode() {
        return userSvcFlag != null && userSvcFlag.length() >= 2 && userSvcFlag.charAt(1) == '1';
    }
}
