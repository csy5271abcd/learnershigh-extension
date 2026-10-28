package com.learnershigh.extension.common.integration.learnershigh;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/** Local, persisted synthetic source records. Never used by the normal mock or production adapters. */
@Component
@Profile("care-demo")
@ConditionalOnProperty(name = "learnershigh.mock.database-examples", havingValue = "true")
public class DemoStudyDataStore {

    private static final TypeReference<Map<String, Integer>> SUBJECTS = new TypeReference<>() { };
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public DemoStudyDataStore(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public List<ExistingBranch> findBranches() {
        return jdbc.query("SELECT branch_id, name FROM demo_care_branch ORDER BY display_order, branch_id",
                (row, index) -> new ExistingBranch(row.getString("branch_id"), row.getString("name")));
    }

    public Optional<ExistingBranch> findBranch(String branchId) {
        return jdbc.query("SELECT branch_id, name FROM demo_care_branch WHERE branch_id = ?",
                (row, index) -> new ExistingBranch(row.getString("branch_id"), row.getString("name")), branchId)
                .stream().findFirst();
    }

    public List<ExistingStudent> findStudents(String branchId) {
        return jdbc.query("SELECT student_id, branch_id, name, class_name FROM demo_care_student "
                        + "WHERE branch_id = ? ORDER BY student_id",
                (row, index) -> student(row), branchId);
    }

    public Optional<ExistingStudent> findStudent(String branchId, String studentId) {
        return jdbc.query("SELECT student_id, branch_id, name, class_name FROM demo_care_student "
                        + "WHERE branch_id = ? AND student_id = ?",
                (row, index) -> student(row), branchId, studentId).stream().findFirst();
    }

    public List<ExistingDailyStudy> findDailyStudy(String studentId, LocalDate from, LocalDate to) {
        return jdbc.query("SELECT study_date, checked_in, first_check_in_time, study_minutes_by_subject, "
                        + "plan_submitted, planned_minutes_by_subject, scheduled, record_available "
                        + "FROM demo_care_day WHERE student_id = ? AND study_date BETWEEN ? AND ? ORDER BY study_date",
                (row, index) -> day(row), studentId, from, to);
    }

    private static ExistingStudent student(ResultSet row) throws SQLException {
        return new ExistingStudent(row.getString("student_id"), row.getString("branch_id"),
                row.getString("name"), row.getString("class_name"));
    }

    private ExistingDailyStudy day(ResultSet row) throws SQLException {
        var start = row.getTime("first_check_in_time");
        boolean scheduledValue = row.getBoolean("scheduled");
        Boolean scheduled = row.wasNull() ? null : scheduledValue;
        return new ExistingDailyStudy(row.getDate("study_date").toLocalDate(), row.getBoolean("checked_in"),
                start == null ? null : start.toLocalTime(), subjects(row.getString("study_minutes_by_subject")),
                row.getBoolean("plan_submitted"), subjects(row.getString("planned_minutes_by_subject")),
                scheduled, row.getBoolean("record_available"));
    }

    private Map<String, Integer> subjects(String json) {
        if (json == null) return Map.of();
        try {
            Map<String, Integer> values = mapper.readValue(json, SUBJECTS);
            if (values == null || values.values().stream().anyMatch(value -> value == null || value < 0)) {
                throw new ExistingIntegrationException("demo study data: invalid subject minutes");
            }
            return values;
        } catch (JacksonException exception) {
            throw new ExistingIntegrationException("demo study data: unreadable subject JSON");
        }
    }
}
