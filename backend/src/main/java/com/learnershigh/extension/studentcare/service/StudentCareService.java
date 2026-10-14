package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.ConstraintViolations;
import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.studentcare.dto.CareCaseResponse;
import com.learnershigh.extension.studentcare.dto.CareDecisionRequest;
import com.learnershigh.extension.studentcare.dto.CareEventResponse;
import com.learnershigh.extension.studentcare.dto.CareNoteRequest;
import com.learnershigh.extension.studentcare.dto.CareSettingsRequest;
import com.learnershigh.extension.studentcare.dto.CareSettingsResponse;
import com.learnershigh.extension.studentcare.dto.OpenCareCaseRequest;
import com.learnershigh.extension.studentcare.entity.CareBaselineSignal;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareEvent;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 학생 케어 변경 Use Case (api-contract.md §65-4, 65-6, 65-7, 65-9). 상태 전이는 CareCase 메서드가 한다.
 *
 * <p>동시 요청 (domain.md §5-1): 상담 기록(새 건)은 학생 단위 잠금({@link StudentCareLocks}), 결정 / 상담 기록(notes)은
 * 건 단위 잠금으로 순서대로 처리한다. 잠금을 기다린 요청이 앞 요청이 남긴 결과를 읽도록 READ_COMMITTED를 쓴다.
 * 외부(Existing) 조회가 실패하면 아무것도 저장되지 않는다: 상담 기록은 기록을 잠금 전에 읽고,
 * 결정은 예외로 Transaction 전체가 되돌아간다.
 */
@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class StudentCareService {

    private static final String SETTINGS_PRIMARY_KEY = "PRIMARY";

    private final StudentCareReader reader;
    private final CareCaseRepository caseRepository;
    private final CareSettingsRepository settingsRepository;
    private final StudentCareLocks studentLocks;
    private final TransactionTemplate lockedTransaction;

    StudentCareService(StudentCareReader reader, CareCaseRepository caseRepository,
            CareSettingsRepository settingsRepository, StudentCareLocks studentLocks,
            PlatformTransactionManager transactionManager) {
        this.reader = reader;
        this.caseRepository = caseRepository;
        this.settingsRepository = settingsRepository;
        this.studentLocks = studentLocks;
        this.lockedTransaction = new TransactionTemplate(transactionManager);
        this.lockedTransaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    /**
     * 상담 기록으로 관리를 연다. 지금 신호(cooldown 적용 후)를 Baseline으로 저장한다.
     *
     * <p>Transaction 순서: (1) 입력 / 학생 / 기존 기록 조회는 Transaction 밖에서 (2) 학생 잠금 행을 별도 Transaction으로 보장
     * (3) 업무 Transaction에서 잠금 → 진행 중 건 / cooldown 확인 → 저장. 한 요청이 DB 연결을 둘 이상 동시에 잡지 않는다.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CareCaseResponse open(OpenCareCaseRequest request) {
        String branchId = request.branchId();
        String studentId = request.studentId();
        LocalDate today = reader.today();
        Instant now = reader.now();

        // 다음 점검일은 계속 관리일 때만 검증한다. 다른 결과의 recheckDate는 무시한다 (api-contract.md §65-4).
        LocalDate recheckDate = null;
        if (request.reason() == CareReason.ADJUSTMENT_NEEDED) {
            recheckDate = request.recheckDate();
            CareCase.requireValidRecheckDate(recheckDate, today, "recheckDate");
        }
        reader.student(branchId, studentId);
        // 기존 기록은 DB 상태와 관계없으므로 잠금 전에 읽는다. 실패(503)하면 잠금 행도 만들지 않는다.
        List<ExistingDailyStudy> history = reader.history(studentId, today);

        studentLocks.ensureRow(branchId, studentId);
        LocalDate validRecheckDate = recheckDate;
        return lockedTransaction.execute(status -> openLocked(request, history, validRecheckDate, today, now));
    }

    private CareCaseResponse openLocked(OpenCareCaseRequest request, List<ExistingDailyStudy> history,
            LocalDate recheckDate, LocalDate today, Instant now) {
        String branchId = request.branchId();
        String studentId = request.studentId();
        // 앞선 요청이 끝난 뒤에 진행 중 건 / cooldown을 읽는다.
        studentLocks.lock(branchId, studentId);
        if (caseRepository.existsByBranchIdAndActiveStudentId(branchId, studentId)) {
            throw new BusinessException(StudentCareErrorCode.ACTIVE_CARE_CASE_EXISTS);
        }

        CareSettings.Values settings = reader.settings(branchId);
        Set<CareSignalType> suppressed = reader.cooldown(branchId, today, settings).getOrDefault(studentId, Set.of());
        List<CareBaselineSignal> baseline = reader.evaluate(history, today, settings, suppressed).signals().stream()
                .map(DetectedSignal::toBaseline)
                .toList();

        CareCase careCase = CareCase.open(branchId, studentId, request.reason(), baseline, request.channel(),
                request.memo(), recheckDate, today, now);
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

    /** 점검 후 결정(관리 종료 / 계속 관리). 비교 결과는 이력에 남는다. */
    public CareCaseResponse decide(String branchId, String caseId, CareDecisionRequest request) {
        CareCase careCase = caseRepository.findForUpdate(caseId, branchId)
                .orElseThrow(() -> new BusinessException(StudentCareErrorCode.CARE_CASE_NOT_FOUND));
        LocalDate today = reader.today();
        Instant now = reader.now();

        // 외부 조회 전에 빠르게 실패: 상태 / 점검일 도래(409), 다음 점검일(422)
        careCase.requireDecidable(today);
        if (request.decision() == CareDecisionRequest.Decision.CONTINUE) {
            CareCase.requireValidRecheckDate(request.recheckDate(), today, "recheckDate");
        }

        List<ExistingDailyStudy> history = reader.history(careCase.studentId(), today);
        CareComparison comparison = CareComparator.compare(careCase.baseline(), history, today);
        String comparisonText = comparison.text();
        switch (request.decision()) {
            case CLOSE -> careCase.closeAfterRecheck(comparisonText, today, now);
            case CONTINUE -> careCase.continueAfterRecheck(comparisonText, request.recheckDate(), today, now);
        }
        caseRepository.saveAndFlush(careCase);
        return CareCaseMapper.toResponse(careCase, today, reader.zone(), comparison);
    }

    /** 관리 중 상담 기록. 종결된 건에도 남길 수 있다. */
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
}
