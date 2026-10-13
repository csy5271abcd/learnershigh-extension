package com.learnershigh.extension.migration;

import static org.assertj.core.api.Assertions.assertThat;

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
 */
@Tag("integration")
class StudentCareReviewFixesMigrationTest {

    private static final String BEFORE_REVIEW_FIXES = "202610131200";
    private static final Timestamp SAME_TIME = Timestamp.from(Instant.parse("2026-09-30T03:00:00Z"));

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
        jdbc.update("""
                insert into care_event (id, case_id, student_id, sequence, event_type, occurred_on, content,
                    note_channel, created_at)
                values (?, ?, 'stu_001', ?, ?, '2026-09-30', '기록', null, ?)""",
                eventId, caseId, sequence, sequence == 1 ? "REASON_CONFIRMED" : "CLOSED", SAME_TIME);
    }

    @Test
    void existingEventsAreNumberedInRecordedOrderNotPrimaryKeyOrder() {
        assertThat(jdbc.queryForList("select id from care_event order by record_no", String.class))
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
                    .isEqualTo(5L);
            assertThat(jdbc.queryForObject(
                    "select is_nullable from information_schema.columns where table_schema = database()"
                            + " and table_name = 'care_event' and column_name = 'record_no'", String.class))
                    .isEqualTo("NO");
        } finally {
            jdbc.update("delete from care_event where id = 'evt_0_new'");
        }
    }
}
