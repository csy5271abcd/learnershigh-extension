package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.integration.roster.AssessmentStudentDirectory;
import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * A28-20 기존 확정본 보정(1회성, 기본 꺼짐): 이미 최종 확정된 수행평가를 그 슬롯 학생의 학교 수행평가로 등록한다.
 * {@code assessment.school-assessment.official-backfill=dry-run|apply}(+ {@code …-report} 경로).
 * 대상 학생: 학생 Directory 의 모든 지점 학생(기존 + 시연 명단 ON 일 때 시연 지점). 학기: 지정 학년도들의 1·2학기 중 학적이 있는 학기.
 * 규칙은 확정·목록 조회 때와 같은 {@link OfficialAssessmentSyncService#syncStudent} — 다시 실행하면 0건(멱등), 학생 직접 등록 항목·휴지통 항목 불변.
 * 학생마다 Transaction 하나(dry-run 은 쓰기 없음).
 */
@Component
public class OfficialAssessmentBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OfficialAssessmentBackfill.class);

    private final String mode;
    private final String reportPath;
    private final List<Integer> years;
    private final AssessmentStudentDirectory students;
    private final OfficialAssessmentSyncService sync;
    private final TransactionTemplate tx;

    public OfficialAssessmentBackfill(@Value("${assessment.school-assessment.official-backfill:}") String mode,
            @Value("${assessment.school-assessment.official-backfill-report:}") String reportPath,
            @Value("${assessment.school-assessment.official-backfill-years:2026,2025,2024}") List<Integer> years,
            AssessmentStudentDirectory students, OfficialAssessmentSyncService sync, TransactionTemplate tx) {
        this.mode = mode == null ? "" : mode.strip();
        this.reportPath = reportPath;
        this.years = years;
        this.students = students;
        this.sync = sync;
        this.tx = tx;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!"dry-run".equals(mode) && !"apply".equals(mode)) {
            return;
        }
        boolean dryRun = "dry-run".equals(mode);
        Set<String> ids = new LinkedHashSet<>();
        for (ExistingBranch branch : students.findBranches()) {
            for (ExistingStudent student : students.findStudents(branch.branchId())) {
                ids.add(student.studentId());
            }
        }
        List<String> lines = new ArrayList<>();
        OfficialAssessmentSyncService.Result total = new OfficialAssessmentSyncService.Result(0, 0, 0, 0, 0);
        for (String studentId : ids) {
            for (int year : years) {
                for (int semester : new int[] {1, 2}) {
                    OfficialAssessmentSyncService.Result r = tx.execute(status -> {
                        OfficialAssessmentSyncService.Result result = sync.syncStudent(studentId, year, semester, dryRun);
                        if (dryRun) {
                            status.setRollbackOnly();
                        }
                        return result;
                    });
                    if (r != null && (r.changed() || r.unchanged() > 0 || r.keptInTrash() > 0)) {
                        lines.add(String.join("\t", studentId, year + "-" + semester, "created=" + r.created(), "updated=" + r.updated(),
                                "unchanged=" + r.unchanged(), "withdrawn=" + r.withdrawn(), "keptInTrash=" + r.keptInTrash()));
                        total = new OfficialAssessmentSyncService.Result(total.created() + r.created(), total.updated() + r.updated(),
                                total.unchanged() + r.unchanged(), total.withdrawn() + r.withdrawn(), total.keptInTrash() + r.keptInTrash());
                    }
                }
            }
        }
        lines.addFirst("mode=" + mode + " students=" + ids.size() + " created=" + total.created() + " updated=" + total.updated()
                + " unchanged=" + total.unchanged() + " withdrawn=" + total.withdrawn() + " keptInTrash=" + total.keptInTrash());
        lines.forEach(line -> log.info("official-backfill {}", line));
        try {
            Path out = reportPath == null || reportPath.isBlank()
                    ? Path.of(System.getProperty("java.io.tmpdir"), "lh-official-backfill-" + mode + ".tsv") : Path.of(reportPath);
            Files.write(out, lines, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.warn("official-backfill report write failed cause={}", e.getClass().getSimpleName());
        }
    }
}
