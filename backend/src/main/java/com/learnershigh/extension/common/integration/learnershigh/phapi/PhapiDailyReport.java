package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 기간별 일일 현황 API의 {@code student_list[].report} ({@code activity_report} DAILY 1행).
 *
 * <p>원본이 {@code LEFT OUTER JOIN}이라 기간 안에 report가 없는 학생도 행이 하나 오며,
 * 그때 {@code reportDate}는 null, {@code userStatus}는 "대기", {@code planStatus}는 "제출전"이다.
 * 시간 값은 {@code formatSecToTime()} 결과인 {@code "HH:MM:SS"} 문자열이다.
 * {@code progress_rate}는 원본에서 todo / done을 뒤집어 계산하므로 읽지 않는다.
 * 개수 값은 원본에서 null이 올 수 있어 Boxed 타입으로 받는다(Mapping에 쓰지 않는 참고 값이다).
 *
 * @param reportDate     {@code report_date} (yyyy-MM-dd)
 * @param dailyStart     {@code daily_start} (yyyy-MM-dd HH:mm:ss)
 * @param loginFirst     {@code login_first}. 그날 첫 입실(로그인) 시각, 미입실이면 null
 * @param logoutLast     {@code logout_last}
 * @param totalTimeStay  {@code total_time_stay} ("HH:MM:SS")
 * @param totalTimeStudy {@code total_time_study} ("HH:MM:SS")
 * @param todoCount      {@code todo_count} (참고, null 가능)
 * @param doneCount      {@code done_count} (참고, null 가능)
 * @param userStatus     {@code user_status}: 대기/로그인/학습/경고/식사/휴식/외출/학원/학원후귀가/귀가/미입실
 * @param planStatus     {@code plan_status}: 제출전/제출완료/컨펌완료
 * @param reportStatus   {@code report_status}: 제출전/제출완료/컨펌완료, report가 없으면 "-"
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhapiDailyReport(
        @JsonProperty("report_date") String reportDate,
        @JsonProperty("daily_start") String dailyStart,
        @JsonProperty("login_first") String loginFirst,
        @JsonProperty("logout_last") String logoutLast,
        @JsonProperty("total_time_stay") String totalTimeStay,
        @JsonProperty("total_time_study") String totalTimeStudy,
        @JsonProperty("todo_count") Integer todoCount,
        @JsonProperty("done_count") Integer doneCount,
        @JsonProperty("user_status") String userStatus,
        @JsonProperty("plan_status") String planStatus,
        @JsonProperty("report_status") String reportStatus) {

    public boolean planSubmitted() {
        return "제출완료".equals(planStatus) || "컨펌완료".equals(planStatus);
    }
}
