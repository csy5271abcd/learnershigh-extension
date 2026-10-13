package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.dto.CareCaseResponse;
import com.learnershigh.extension.studentcare.dto.CareDecisionRequest;
import com.learnershigh.extension.studentcare.dto.CareEventResponse;
import com.learnershigh.extension.studentcare.dto.CareNoteRequest;
import com.learnershigh.extension.studentcare.dto.CareSettingsRequest;
import com.learnershigh.extension.studentcare.dto.CareSettingsResponse;
import com.learnershigh.extension.studentcare.dto.OpenCareCaseRequest;
import com.learnershigh.extension.studentcare.dto.PlanRequest;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import com.learnershigh.extension.studentcare.entity.CareEvent;
import com.learnershigh.extension.studentcare.entity.CarePlan;
import com.learnershigh.extension.studentcare.entity.CareReason;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import com.learnershigh.extension.studentcare.repository.CareCaseRepository;
import com.learnershigh.extension.studentcare.repository.CareSettingsRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 학생 케어 변경 Use Case (api-contract.md §65-4, 65-6, 65-7, 65-9). 상태 전이는 CareCase 메서드가 한다. */
@Service
@Transactional
public class StudentCareService {

    private final StudentCareReader reader;
    private final CareCaseRepository caseRepository;
    private final CareSettingsRepository settingsRepository;

    StudentCareService(StudentCareReader reader, CareCaseRepository caseRepository,
            CareSettingsRepository settingsRepository) {
        this.reader = reader;
        this.caseRepository = caseRepository;
        this.settingsRepository = settingsRepository;
    }

    /** 사유 확인. 지금 신호를 Baseline으로 저장한다. */
    public CareCaseResponse open(OpenCareCaseRequest request) {
        reader.student(request.branchId(), request.studentId());
        if (caseRepository.findWithEventsByBranchIdAndStudentIdAndStatus(
                request.branchId(), request.studentId(), CareCaseStatus.IN_ADJUSTMENT).isPresent()) {
            throw new BusinessException(StudentCareErrorCode.ACTIVE_CARE_CASE_EXISTS);
        }

        LocalDate today = reader.today();
        Instant now = reader.now();
        CareSettings.Values settings = reader.settings(request.branchId());
        List<ExistingDailyStudy> history = reader.history(request.studentId(), today);
        Set<CareSignalType> suppressed = reader.cooldown(request.branchId(), today, settings)
                .getOrDefault(request.studentId(), Set.of());
        List<CareBaselineSignal> baseline = reader.evaluate(history, today, settings, suppressed).signals().stream()
                .map(DetectedSignal::toBaseline)
                .toList();

        CarePlan plan = null;
        LocalDate recheckDate = null;
        if (request.reason() == CareReason.ADJUSTMENT_NEEDED) {
            plan = toPlan(request.plan());
            recheckDate = request.plan().recheckDate();
        }
        CareCase careCase = CareCase.open(request.branchId(), request.studentId(), request.reason(), baseline,
                request.memo(), plan, recheckDate, today, now);
        try {
            caseRepository.saveAndFlush(careCase);
        } catch (DataIntegrityViolationException duplicate) {
            // 동시에 두 번 눌러도 진행 중 건은 하나다 (uk_care_case_active_student).
            throw new BusinessException(StudentCareErrorCode.ACTIVE_CARE_CASE_EXISTS);
        }
        return CareCaseMapper.toResponse(careCase, today, reader.zone(), history);
    }

    /** 재점검 후 선생님 결정. 비교 결과는 학생 기록에 남는다. */
    public CareCaseResponse decide(String caseId, CareDecisionRequest request) {
        CareCase careCase = caseRepository.findWithEventsById(caseId)
                .orElseThrow(() -> new BusinessException(StudentCareErrorCode.CARE_CASE_NOT_FOUND));
        LocalDate today = reader.today();
        Instant now = reader.now();
        if (careCase.status() != CareCaseStatus.IN_ADJUSTMENT) {
            throw new BusinessException(StudentCareErrorCode.INVALID_STATE_TRANSITION);
        }
        if (!careCase.isRecheckDue(today)) {
            throw new BusinessException(StudentCareErrorCode.RECHECK_NOT_DUE);
        }

        List<ExistingDailyStudy> history = reader.history(careCase.studentId(), today);
        String comparisonText = CareComparator.compare(careCase.baseline(), history, today).text();
        switch (request.decision()) {
            case CLOSE -> careCase.closeAfterRecheck(comparisonText, today, now);
            case CONTINUE -> careCase.continueAfterRecheck(comparisonText, request.recheckDate(), today, now);
            case REVISE -> {
                CarePlan plan = toPlan(request.plan());
                careCase.reviseAfterRecheck(comparisonText, plan, request.plan().recheckDate(), today, now);
            }
        }
        caseRepository.saveAndFlush(careCase);
        return CareCaseMapper.toResponse(careCase, today, reader.zone(), history);
    }

    /** 면담 / 통화 메모. */
    public CareEventResponse addNote(String caseId, CareNoteRequest request) {
        CareCase careCase = caseRepository.findWithEventsById(caseId)
                .orElseThrow(() -> new BusinessException(StudentCareErrorCode.CARE_CASE_NOT_FOUND));
        CareEvent event = careCase.addNote(request.channel(), request.content(), reader.today(), reader.now());
        caseRepository.saveAndFlush(careCase);
        return CareEventResponse.from(event, reader.zone());
    }

    public CareSettingsResponse updateSettings(String branchId, CareSettingsRequest request) {
        reader.branch(branchId);
        CareSettings.Values values = request.toValues();
        CareSettings settings = settingsRepository.findById(branchId)
                .map(existing -> {
                    existing.update(values, reader.now());
                    return existing;
                })
                .orElseGet(() -> CareSettings.create(branchId, values, reader.now()));
        settingsRepository.save(settings);
        return CareSettingsResponse.from(settings.values());
    }

    private static CarePlan toPlan(PlanRequest plan) {
        if (plan == null) {
            throw new BusinessException(StudentCareErrorCode.PLAN_REQUIRED);
        }
        return CarePlan.of(plan.goal(), plan.action(), plan.loadLimit(), Boolean.TRUE.equals(plan.agreedWithStudent()));
    }
}
