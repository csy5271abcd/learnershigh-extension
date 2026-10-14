package com.learnershigh.extension.studentcare.controller;

import com.learnershigh.extension.common.integration.learnershigh.MockIntegrationSwitch;
import com.learnershigh.extension.common.time.AdjustableClock;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 학생 케어 API Integration Test 공통: 기준일 2026-09-30.
 * 매 Test 전에 학생 케어 Table을 비우고 기준일 / Mock 연동을 처음 상태로 되돌린다(앞 Test가 바꾼 상태가 새지 않게).
 */
final class StudentCareApiTestSupport {

    static final LocalDate ANCHOR = LocalDate.of(2026, 9, 30);
    static final String BRANCH = "br_gangnam";
    static final String OTHER_BRANCH = "br_bundang";

    private StudentCareApiTestSupport() {
    }

    static void reset(JdbcTemplate jdbc, AdjustableClock clock, MockIntegrationSwitch integration) {
        jdbc.update("delete from care_event");
        jdbc.update("delete from care_case_baseline");
        jdbc.update("delete from care_case");
        jdbc.update("delete from care_settings");
        jdbc.update("delete from care_student_lock");
        clock.setDate(ANCHOR);
        integration.setStudyDataAvailable(true);
    }

    /**
     * 이미 종결된 과거 건을 직접 넣는다(cooldown "가장 최근 종결 건" / 지점 범위 Test용). CLOSED 이벤트 하나를 함께 남긴다.
     *
     * @param closedHour 종결 시각(Asia/Seoul 시)
     */
    static String insertClosedCase(JdbcTemplate jdbc, String branchId, String studentId, LocalDate closedOn,
            int closedHour, String... signalTypes) {
        String caseId = "care_" + UUID.randomUUID();
        Timestamp closedAt = Timestamp.from(closedOn.atTime(LocalTime.of(closedHour, 0))
                .atZone(ZoneId.of("Asia/Seoul")).toInstant());
        jdbc.update("""
                insert into care_case (id, branch_id, student_id, active_student_id, status, reason, close_type,
                    opened_on, closed_on, closed_at, version, created_at, updated_at)
                values (?, ?, ?, null, 'CLOSED', 'EXPECTED_CHANGE', 'EXPECTED_CHANGE', ?, ?, ?, 0, ?, ?)""",
                caseId, branchId, studentId, closedOn, closedOn, closedAt, closedAt, closedAt);
        for (int i = 0; i < signalTypes.length; i++) {
            jdbc.update("""
                    insert into care_case_baseline (case_id, position, signal_type, summary, metric_value, target_value, subject)
                    values (?, ?, ?, '과거 신호', 1, null, null)""", caseId, i, signalTypes[i]);
        }
        jdbc.update("""
                insert into care_event (id, case_id, student_id, sequence, event_type, occurred_on, content, note_channel, created_at)
                values (?, ?, ?, 1, 'CLOSED', ?, '기록만 남기고 종결', null, ?)""",
                "evt_" + UUID.randomUUID(), caseId, studentId, closedOn, closedAt);
        return caseId;
    }

    static int count(JdbcTemplate jdbc, String table) {
        Integer count = jdbc.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }

    /** 변경 없음 확인용: 학생 케어 Table 행 수 + 건의 version 합. */
    static String snapshot(JdbcTemplate jdbc) {
        return count(jdbc, "care_case") + "/" + count(jdbc, "care_case_baseline") + "/" + count(jdbc, "care_event")
                + "/" + count(jdbc, "care_settings") + "/" + count(jdbc, "care_student_lock") + "/"
                + jdbc.queryForObject("select coalesce(sum(version), 0) from care_case", Long.class);
    }
}
