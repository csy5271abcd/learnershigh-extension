package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.learnershigh.extension.common.integration.learnershigh.ExistingIntegrationException;
import java.util.ArrayList;
import java.util.List;

/**
 * 기간별 일일 현황 API 응답.
 * 지점 학생(role_id=5) × 기간 안의 report 일자마다 한 행이다.
 *
 * <p>원본 응답의 다른 최상위 필드는 읽지 않는다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhapiStudyReportsPeriodResponse(@JsonProperty("student_list") List<Row> studentList) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Row(PhapiStudent user, PhapiDailyReport report) {
    }

    /**
     * 한 학생의 report만 돌려준다. report가 없는 LEFT JOIN 행({@code report_date = null})은 뺀다.
     *
     * <p>형식이 깨진 응답은 빈 기록으로 바꾸지 않고 {@link ExistingIntegrationException}이다:
     * {@code student_list} 없음, {@code user} / {@code user.id} / {@code report} 없음,
     * 그리고 {@code report_date}가 null인데 LEFT JOIN 자리표시 행이 아닌 경우(입실 시각이 있거나, 같은 학생의 다른 report 행이 함께 옴).
     */
    public List<PhapiDailyReport> reportsOf(long studentId) {
        if (studentList == null) {
            throw new ExistingIntegrationException("phapi study reports: missing student_list");
        }
        List<PhapiDailyReport> reports = new ArrayList<>();
        boolean placeholder = false;
        for (Row row : studentList) {
            if (row == null || row.user() == null || row.user().id() == null) {
                throw new ExistingIntegrationException("phapi study reports: row without user id");
            }
            if (row.user().id() != studentId) {
                continue;
            }
            PhapiDailyReport report = row.report();
            if (report == null) {
                throw new ExistingIntegrationException("phapi study reports: row without report");
            }
            if (report.reportDate() == null) {
                if (report.loginFirst() != null) {
                    throw new ExistingIntegrationException("phapi study reports: check-in without report_date");
                }
                placeholder = true;
            } else {
                reports.add(report);
            }
        }
        if (placeholder && !reports.isEmpty()) {
            throw new ExistingIntegrationException("phapi study reports: placeholder row mixed with reports");
        }
        return List.copyOf(reports);
    }
}
