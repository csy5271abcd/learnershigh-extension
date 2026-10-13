package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * {@code GET /phapi/v2/items/stats/subject_study_stats.php?student_id&from_date&to_date&period_type=PDFBYDAY}
 * 응답 배열의 원소. PDFBYDAY는 합산하지 않고 {@code activity_item} 1개당 한 행이다.
 *
 * @param name           {@code activity_item_code.name}. 지점마다 자유롭게 정한 과목 코드명이다 (표준 과목 아님)
 * @param totalTimePlan  {@code activity_item.total_time_plan} ("HH:MM:SS")
 * @param totalTimeStudy {@code activity_item.total_time_study} ("HH:MM:SS")
 * @param offset         PDFBYDAY에서는 {@code activity_report.report_date} (yyyy-MM-dd)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhapiSubjectStudyStat(
        String name,
        @JsonProperty("total_time_plan") String totalTimePlan,
        @JsonProperty("total_time_study") String totalTimeStudy,
        String offset) {
}
