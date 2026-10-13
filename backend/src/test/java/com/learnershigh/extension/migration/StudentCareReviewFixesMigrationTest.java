package com.learnershigh.extension.migration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.learnershigh.extension.support.MySqlContainerConfig;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.mysql.MySQLContainer;

/**
 * V202610141000 (record_no 추가)이 이미 있는 학생 기록의 순서를 지키는지 검증한다.
 * V202610131200까지 적용 → 같은 시각의 이벤트를 넣되 Primary Key 순서가 sequence 순서와 반대가 되게 고른다 → 나머지 적용.
 * record_no를 PK 순서로 매기면 같은 시각 이벤트의 학생 기록 순서(created_at desc, record_no desc)가 뒤집힌다.
 * 같은 Migration의 기존 행 보정도 본다: 종결 뒤 메모가 남은 건의 closed_at은 CLOSED 이벤트 시각이고,
 * 연속 미입실 / 계획 미제출 Baseline의 target_value는 비운다(다른 신호는 그대로).
 */
@Tag("integration")
class StudentCareReviewFixesMigrationTest {

    private static final String BEFORE_REVIEW_FIXES = "202610131200";
    private static final Timestamp SAME_TIME = Timestamp.from(Instant.parse("2026-09-30T03:00:00Z"));
    /** 종결 뒤 메모가 남은 건(다른 학생): 사유 확인 → 종결 → 메모. 마지막 변경 시각(updated_at)은 메모 시각이다. */
    private static final Timestamp CLOSED_TIME = Timestamp.from(Instant.parse("2026-09-30T05:00:00Z"));
    private static final Timestamp NOTE_AFTER_CLOSE_TIME = Timestamp.from(Instant.parse("2026-09-30T06:00:00Z"));
    /** 위 같은 시각 이벤트 4개 + 종결 뒤 메모 건의 이벤트 3개. */
    private static final long EXISTING_EVENTS = 7;

    private static MySQLContainer mysql;
    private static DriverManagerDataSource dataSource;
    private static JdbcTemplate jdbc;

    @BeforeAll
    static void migrateWithExistingRows() {
        mysql = new MySQLContainer(MySqlContainerConfig.MYSQL_IMAGE);
        mysql.start();
        dataSource = new DriverManagerDataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
        jdbc = new JdbcTemplate(dataSource);

        flyway(BEFORE_REVIEW_FIXES).migrate();
        // 건 두 개, 각 건의 이벤트 두 개가 모두 같은 시각. 이벤트 ID(PK)는 sequence와 반대 순서다.
        insertCase("care_1");
        insertCase("care_2");
        insertEvent("evt_z_case1_seq1", "care_1", 1);
        insertEvent("evt_a_case1_seq2", "care_1", 2);
        insertEvent("evt_y_case2_seq1", "care_2", 1);
        insertEvent("evt_b_case2_seq2", "care_2", 2);

        jdbc.update("""
                insert into care_case (id, branch_id, student_id, active_student_id, status, reason, close_type,
                    opened_on, closed_on, version, created_at, updated_at)
                values ('care_noted', 'br_gangnam', 'stu_009', null, 'CLOSED', 'EXPECTED_CHANGE', 'EXPECTED_CHANGE',
                    '2026-09-30', '2026-09-30', 2, ?, ?)""", SAME_TIME, NOTE_AFTER_CLOSE_TIME);
        insertEvent("evt_noted_1", "care_noted", "stu_009", 1, "REASON_CONFIRMED", SAME_TIME);
        insertEvent("evt_noted_2", "care_noted", "stu_009", 2, "CLOSED", CLOSED_TIME);
        insertEvent("evt_noted_3", "care_noted", "stu_009", 3, "NOTE", NOTE_AFTER_CLOSE_TIME);

        insertBaseline("care_1", 0, "CONSECUTIVE_ABSENCE", 3);
        insertBaseline("care_1", 1, "PLAN_MISSING", 2);
        insertBaseline("care_1", 2, "STUDY_DROP", 120);

        flyway(null).migrate();
    }

    @AfterAll
    static void stop() {
        if (mysql != null) {
            mysql.stop();
        }
    }

    private static Flyway flyway(String target) {
        var configuration = Flyway.configure().dataSource(dataSource).locations("classpath:db/migration");
        if (target != null) {
            configuration.target(target);
        }
        return configuration.load();
    }

    private static void insertCase(String caseId) {
        jdbc.update("""
                insert into care_case (id, branch_id, student_id, active_student_id, status, reason, close_type,
                    opened_on, closed_on, version, created_at, updated_at)
                values (?, 'br_gangnam', 'stu_001', null, 'CLOSED', 'EXPECTED_CHANGE', 'EXPECTED_CHANGE',
                    '2026-09-30', '2026-09-30', 0, ?, ?)""", caseId, SAME_TIME, SAME_TIME);
    }

    private static void insertEvent(String eventId, String caseId, int sequence) {
        insertEvent(eventId, caseId, "stu_001", sequence, sequence == 1 ? "REASON_CONFIRMED" : "CLOSED", SAME_TIME);
    }

    private static void insertEvent(String eventId, String caseId, String studentId, int sequence, String type,
            Timestamp createdAt) {
        jdbc.update("""
                insert into care_event (id, case_id, student_id, sequence, event_type, occurred_on, content,
                    note_channel, created_at)
                values (?, ?, ?, ?, ?, '2026-09-30', '기록', ?, ?)""",
                eventId, caseId, studentId, sequence, type, type.equals("NOTE") ? "CALL" : null, createdAt);
    }

    private static void insertBaseline(String caseId, int position, String signalType, int target) {
        jdbc.update("""
                insert into care_case_baseline (case_id, position, signal_type, summary, metric_value, target_value,
                    subject)
                values (?, ?, ?, '요약', 5, ?, null)""", caseId, position, signalType, target);
    }

    @Test
    void existingEventsAreNumberedInRecordedOrderNotPrimaryKeyOrder() {
        assertThat(jdbc.queryForList("select id from care_event where student_id = 'stu_001' order by record_no",
                String.class))
                .containsExactly("evt_z_case1_seq1", "evt_a_case1_seq2", "evt_y_case2_seq1", "evt_b_case2_seq2");
    }

    @Test
    void historyOrderShowsLaterRecordFirstWithinTheSameTime() {
        // CareEventRepository.findTimeline과 같은 정렬 (api-contract.md §65-8)
        List<String> timeline = jdbc.queryForList(
                "select id from care_event where student_id = 'stu_001' order by created_at desc, record_no desc",
                String.class);
        assertThat(timeline).containsExactly(
                "evt_b_case2_seq2", "evt_y_case2_seq1", "evt_a_case1_seq2", "evt_z_case1_seq1");
    }

    @Test
    void newEventsContinueAfterTheBackfilledNumbers() {
        jdbc.update("""
                insert into care_event (id, case_id, student_id, sequence, event_type, occurred_on, content,
                    note_channel, created_at)
                values ('evt_0_new', 'care_1', 'stu_001', 3, 'NOTE', '2026-09-30', '메모', 'CALL', ?)""", SAME_TIME);
        try {
            assertThat(jdbc.queryForObject("select record_no from care_event where id = 'evt_0_new'", Long.class))
                    .isEqualTo(EXISTING_EVENTS + 1);
            assertThat(jdbc.queryForObject(
                    "select is_nullable from information_schema.columns where table_schema = database()"
                            + " and table_name = 'care_event' and column_name = 'record_no'", String.class))
                    .isEqualTo("NO");
        } finally {
            jdbc.update("delete from care_event where id = 'evt_0_new'");
        }
    }

    @Test
    void closedAtOfCaseWithNoteAfterClosingIsTheClosedEventTimeNotLastUpdate() {
        assertThat(jdbc.queryForObject("select closed_at from care_case where id = 'care_noted'", Timestamp.class))
                .isEqualTo(CLOSED_TIME);
        // 다른 종결 건도 CLOSED 이벤트 시각(같은 시각)으로 채워진다.
        assertThat(jdbc.queryForList("select closed_at from care_case where id in ('care_1', 'care_2')", Timestamp.class))
                .containsOnly(SAME_TIME);
    }

    @Test
    void baselineTargetIsClearedOnlyForAbsenceAndPlanMissing() {
        assertThat(jdbc.queryForList(
                "select signal_type, target_value from care_case_baseline where case_id = 'care_1' order by position"))
                .extracting(row -> row.get("signal_type"), row -> row.get("target_value"))
                .containsExactly(
                        tuple("CONSECUTIVE_ABSENCE", null),
                        tuple("PLAN_MISSING", null),
                        tuple("STUDY_DROP", 120));
    }
}
