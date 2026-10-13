package com.learnershigh.extension.studentcare.controller;

import com.learnershigh.extension.common.time.AdjustableClock;
import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;

/** 학생 케어 API Integration Test 공통: 기준일 2026-09-30, 매 Test 전에 학생 케어 Table을 비운다. */
final class StudentCareApiTestSupport {

    static final LocalDate ANCHOR = LocalDate.of(2026, 9, 30);
    static final String BRANCH = "br_gangnam";

    private StudentCareApiTestSupport() {
    }

    static void reset(JdbcTemplate jdbc, AdjustableClock clock) {
        jdbc.update("delete from care_event");
        jdbc.update("delete from care_case_baseline");
        jdbc.update("delete from care_case");
        jdbc.update("delete from care_settings");
        clock.setDate(ANCHOR);
    }
}
