package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudentClient;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudyClient;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import com.learnershigh.extension.studentcare.repository.CareCaseRepository;
import com.learnershigh.extension.studentcare.repository.CareSettingsRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** 학생 케어 Service들이 함께 쓰는 조회 / 신호 평가. 기준일은 항상 Clock 기준이다. */
@Component
class StudentCareReader {

    private final Clock clock;
    private final ExistingStudentClient studentClient;
    private final ExistingStudyClient studyClient;
    private final CareSettingsRepository settingsRepository;
    private final CareCaseRepository caseRepository;

    StudentCareReader(Clock clock, ExistingStudentClient studentClient, ExistingStudyClient studyClient,
            CareSettingsRepository settingsRepository, CareCaseRepository caseRepository) {
        this.clock = clock;
        this.studentClient = studentClient;
        this.studyClient = studyClient;
        this.settingsRepository = settingsRepository;
        this.caseRepository = caseRepository;
    }

    LocalDate today() {
        return LocalDate.now(clock);
    }

    LocalDate observationDate() {
        return today().minusDays(1);
    }

    Instant now() {
        return clock.instant();
    }

    ZoneId zone() {
        return clock.getZone();
    }

    ExistingBranch branch(String branchId) {
        return studentClient.findBranch(branchId)
                .orElseThrow(() -> new BusinessException(StudentCareErrorCode.BRANCH_NOT_FOUND));
    }

    ExistingStudent student(String branchId, String studentId) {
        branch(branchId);
        return studentClient.findStudent(branchId, studentId)
                .orElseThrow(() -> new BusinessException(StudentCareErrorCode.STUDENT_NOT_FOUND));
    }

    List<ExistingStudent> students(String branchId) {
        return studentClient.findStudents(branchId);
    }

    List<ExistingBranch> branches() {
        return studentClient.findBranches();
    }

    CareSettings.Values settings(String branchId) {
        return settingsRepository.findById(branchId).map(CareSettings::values).orElse(CareSettings.Values.DEFAULTS);
    }

    List<ExistingDailyStudy> history(String studentId, LocalDate asOf) {
        return studyClient.findDailyStudy(studentId, CareSignalCalculator.historyFrom(asOf), asOf);
    }

    /** 지점 전원 조회용. 학생마다 원본을 따로 부르지 않도록 한 번에 가져온다. */
    Map<String, List<ExistingDailyStudy>> histories(List<ExistingStudent> students, LocalDate asOf) {
        return studyClient.findDailyStudies(students.stream().map(ExistingStudent::studentId).toList(),
                CareSignalCalculator.historyFrom(asOf), asOf);
    }

    /**
     * 최근 종결 건 때문에 다시 올리지 않을 신호 (domain.md §3 cooldownDays). 학생 ID → 신호 Type.
     * cooldownDays = 0 처리는 {@link CareCooldown} 한 곳에서 한다(그때 조회 범위는 비어 있다).
     */
    Map<String, Set<CareSignalType>> cooldown(String branchId, LocalDate asOf, CareSettings.Values settings) {
        List<CareCase> closed = caseRepository.findByBranchIdAndStatusAndClosedOnBetween(branchId,
                CareCaseStatus.CLOSED, CareCooldown.windowStart(asOf, settings.cooldownDays()), asOf);
        return CareCooldown.suppressedTypes(closed, asOf, settings.cooldownDays());
    }

    /** 신호 계산 후 cooldown 신호를 뺀다. 판단 보류는 뺀 뒤의 결과로 정해진다 ({@link SignalEvaluation#deferred()}). */
    SignalEvaluation evaluate(List<ExistingDailyStudy> history, LocalDate asOf, CareSettings.Values settings,
            Set<CareSignalType> suppressed) {
        return CareSignalCalculator.evaluate(history, asOf, settings).without(suppressed);
    }
}
