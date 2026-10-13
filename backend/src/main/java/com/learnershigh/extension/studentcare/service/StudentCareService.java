package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
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
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 학생 케어 변경 Use Case (api-contract.md §65-4, 65-6, 65-7, 65-9). 상태 전이는 CareCase 메서드가 한다.
 *
 * <p>동시 요청 (domain.md §5-1): 사유 확인은 학생 단위 잠금, 결정 / 메모는 건 단위 잠금으로 순서대로 처리한다.
 * 잠금을 기다린 요청이 앞 요청이 남긴 결과를 읽도록 READ_COMMITTED를 쓴다.
 * 외부(Existing) 조회가 실패하면 예외로 Transaction 전체가 되돌아가 아무것도 저장되지 않는다.
 */
@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class StudentCareService {

    private static final String SETTINGS_PRIMARY_KEY = "PRIMARY";

    private final StudentCareReader reader;
    private final CareCaseRepository caseRepository;
    private final CareSettingsRepository settingsRepository;

    StudentCareService(StudentCareReader reader, CareCaseRepository caseRepository,
            CareSettingsRepository settingsRepository) {
        this.reader = reader;
        this.caseRepository = caseRepository;
        this.settingsRepository = settingsRepository;
    }

    /** 사유 확인. 지금 신호(cooldown 적용 후)를 Baseline으로 저장한다. */
    public CareCaseResponse open(OpenCareCaseRequest request) {
        String branchId = request.branchId();
        String studentId = request.studentId();
        reader.student(branchId, studentId);
        LocalDate today = reader.today();
        Instant now = reader.now();

        // 외부 조회 전에 빠르게 실패: 약속 / 합의 / 재점검일 입력
        CarePlan plan = null;
        LocalDate recheckDate = null;
        if (request.reason() == CareReason.ADJUSTMENT_NEEDED) {
            plan = toPlan(request.plan());
            recheckDate = request.plan().recheckDate();
            CareCase.requireValidRecheckDate(recheckDate, today, "plan.recheckDate");
        }

        // 학생 단위 잠금을 Transaction의 첫 DB 작업으로 잡는다. 앞선 요청이 끝난 뒤에 진행 중 건 / cooldown을 읽는다.
        caseRepository.lockStudent(branchId, studentId);
        if (caseRepository.existsByBranchIdAndActiveStudentId(branchId, studentId)) {
            throw new BusinessException(StudentCareErrorCode.ACTIVE_CARE_CASE_EXISTS);
        }

        CareSettings.Values settings = reader.settings(branchId);
        List<ExistingDailyStudy> history = reader.history(studentId, today);
        Set<CareSignalType> suppressed = reader.cooldown(branchId, today, settings).getOrDefault(studentId, Set.of());
        List<CareBaselineSignal> baseline = reader.evaluate(history, today, settings, suppressed).signals().stream()
                .map(DetectedSignal::toBaseline)
                .toList();

        CareCase careCase = CareCase.open(branchId, studentId, request.reason(), baseline, request.memo(), plan,
                recheckDate, today, now);
        try {
            caseRepository.saveAndFlush(careCase);
        } catch (DataIntegrityViolationException exception) {
            // 잠금 밖에서 같은 학생의 진행 중 건이 생긴 경우의 마지막 방어선. 다른 제약 위반은 그대로 올린다.
            if (ConstraintViolations.violates(exception, CareCase.ACTIVE_STUDENT_UNIQUE_KEY)) {
                throw new BusinessException(StudentCareErrorCode.ACTIVE_CARE_CASE_EXISTS);
            }
            throw exception;
        }
        return CareCaseMapper.toResponse(careCase, today, reader.zone(), null);
    }

    /** 재점검 후 선생님 결정. 비교 결과는 학생 기록에 남는다. */
    public CareCaseResponse decide(String branchId, String caseId, CareDecisionRequest request) {
        CareCase careCase = caseRepository.findForUpdate(caseId, branchId)
                .orElseThrow(() -> new BusinessException(StudentCareErrorCode.CARE_CASE_NOT_FOUND));
        LocalDate today = reader.today();
        Instant now = reader.now();

        // 외부 조회 전에 빠르게 실패: 상태 / 재점검일 도래(409), 결정 입력(422)
        careCase.requireDecidable(today);
        CarePlan revisedPlan = null;
        switch (request.decision()) {
            case CLOSE -> {
                // 추가 입력 없음
            }
            case CONTINUE -> CareCase.requireValidRecheckDate(request.recheckDate(), today, "recheckDate");
            case REVISE -> {
                revisedPlan = toPlan(request.plan());
                CareCase.requireValidRecheckDate(request.recheckDate(), today, "recheckDate");
            }
        }

        List<ExistingDailyStudy> history = reader.history(careCase.studentId(), today);
        CareComparison comparison = CareComparator.compare(careCase.baseline(), history, today);
        String comparisonText = comparison.text();
        switch (request.decision()) {
            case CLOSE -> careCase.closeAfterRecheck(comparisonText, today, now);
            case CONTINUE -> careCase.continueAfterRecheck(comparisonText, request.recheckDate(), today, now);
            case REVISE -> careCase.reviseAfterRecheck(comparisonText, revisedPlan, request.recheckDate(), today, now);
        }
        caseRepository.saveAndFlush(careCase);
        return CareCaseMapper.toResponse(careCase, today, reader.zone(), comparison);
    }

    /** 면담 / 통화 메모. 종결된 건에도 남길 수 있다. */
    public CareEventResponse addNote(String branchId, String caseId, CareNoteRequest request) {
        CareCase careCase = caseRepository.findForUpdate(caseId, branchId)
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
        try {
            settingsRepository.saveAndFlush(settings);
        } catch (DataIntegrityViolationException exception) {
            // 처음 저장하는 PUT 두 개가 동시에 오면 한쪽은 같은 지점 행을 만들지 못한다.
            if (ConstraintViolations.violates(exception, SETTINGS_PRIMARY_KEY)) {
                throw new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION);
            }
            throw exception;
        }
        return CareSettingsResponse.from(settings.values());
    }

    private static CarePlan toPlan(PlanRequest plan) {
        if (plan == null) {
            throw planRequired();
        }
        return CarePlan.of(plan.goal(), plan.action(), plan.loadLimit(), Boolean.TRUE.equals(plan.agreedWithStudent()));
    }

    private static CarePlan toPlan(CareDecisionRequest.Plan plan) {
        if (plan == null) {
            throw planRequired();
        }
        return CarePlan.of(plan.goal(), plan.action(), plan.loadLimit(), Boolean.TRUE.equals(plan.agreedWithStudent()));
    }

    private static BusinessException planRequired() {
        return BusinessException.withFields(StudentCareErrorCode.PLAN_REQUIRED, new FieldViolation("plan", "required"));
    }
}
