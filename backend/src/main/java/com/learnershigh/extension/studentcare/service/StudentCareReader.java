package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudentClient;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudyClient;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
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
import java.util.EnumSet;
import java.util.HashMap;
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

    /** 최근 종결 건 때문에 다시 올리지 않을 신호 (domain.md §3 cooldownDays). */
    Map<String, Set<CareSignalType>> cooldown(String branchId, LocalDate asOf, CareSettings.Values settings) {
        Map<String, Set<CareSignalType>> suppressed = new HashMap<>();
        if (settings.cooldownDays() <= 0) {
            return suppressed;
        }
        LocalDate closedFrom = asOf.minusDays(settings.cooldownDays() - 1L);
        for (CareCase closed : caseRepository.findByBranchIdAndStatusAndClosedOnGreaterThanEqual(
                branchId, CareCaseStatus.CLOSED, closedFrom)) {
            Set<CareSignalType> types = suppressed.computeIfAbsent(closed.studentId(),
                    key -> EnumSet.noneOf(CareSignalType.class));
            closed.baseline().stream().map(CareBaselineSignal::type).forEach(types::add);
        }
        return suppressed;
    }

    /** 신호 계산 후 cooldown 신호를 뺀다. */
    SignalEvaluation evaluate(List<ExistingDailyStudy> history, LocalDate asOf, CareSettings.Values settings,
            Set<CareSignalType> suppressed) {
        SignalEvaluation evaluation = CareSignalCalculator.evaluate(history, asOf, settings);
        if (suppressed.isEmpty()) {
            return evaluation;
        }
        List<DetectedSignal> remaining = evaluation.signals().stream()
                .filter(signal -> !suppressed.contains(signal.type()))
                .toList();
        return new SignalEvaluation(remaining, evaluation.deferred(), evaluation.validDays());
    }
}
