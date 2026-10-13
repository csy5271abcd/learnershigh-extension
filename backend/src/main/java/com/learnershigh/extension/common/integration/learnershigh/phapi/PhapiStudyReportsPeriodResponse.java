package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * {@code GET /phapi/v2/branches/select_study_reports_period.php?branch_id&from_date&to_date} 응답.
 * 지점 학생(role_id=5) × 기간 안의 report 일자마다 한 행이다.
 *
 * <p>원본 응답에는 {@code brand}와 실행한 SQL 원문 {@code query}가 함께 오지만 읽지 않는다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhapiStudyReportsPeriodResponse(@JsonProperty("student_list") List<Row> studentList) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Row(PhapiStudent user, PhapiDailyReport report) {
    }

    /** 한 학생의 report만, report가 없는 LEFT JOIN 행은 빼고 돌려준다. */
    public List<PhapiDailyReport> reportsOf(long studentId) {
        return studentList.stream()
                .filter(row -> row.user().id() == studentId)
                .map(Row::report)
                .filter(report -> report != null && report.reportDate() != null)
                .toList();
    }
}
