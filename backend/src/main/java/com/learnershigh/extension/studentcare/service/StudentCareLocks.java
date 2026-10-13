package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.error.ConstraintViolations;
import com.learnershigh.extension.studentcare.repository.CareCaseRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 학생 단위 잠금 (domain.md §5-1). 같은 학생에 대한 사유 확인(새 건)을 순서대로 처리한다.
 *
 * <ol>
 *   <li>{@link #ensureRow}: 업무 Transaction 밖에서, 잠금 행이 없으면 짧은 별도 Transaction으로 만들고 바로 Commit한다.
 *       동시에 만들어 Primary Key가 중복되면 이미 있는 것이므로 무시한다.</li>
 *   <li>{@link #lock}: 업무 Transaction 안에서 Commit된 그 행을 {@code SELECT ... FOR UPDATE}로 잡는다.</li>
 * </ol>
 * 행 생성과 잠금을 한 Transaction에서 하면, 행을 처음 만든 요청이 실패해 되돌려질 때 기다리던 요청끼리 Deadlock이 난다.
 */
@Component
class StudentCareLocks {

    static final String LOCK_PRIMARY_KEY = "PRIMARY";
    /** 행 생성 Transaction이 Deadlock / 잠금 대기 실패로 끝났을 때 다시 시도하는 횟수. 행 생성은 멱등이다. */
    private static final int ENSURE_ATTEMPTS = 3;

    private final CareCaseRepository caseRepository;
    private final TransactionTemplate rowTransaction;

    StudentCareLocks(CareCaseRepository caseRepository, PlatformTransactionManager transactionManager) {
        this.caseRepository = caseRepository;
        this.rowTransaction = new TransactionTemplate(transactionManager);
        this.rowTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.rowTransaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    /** 잠금 행이 Commit된 상태로 있게 한다. 업무 Transaction을 시작하기 전에 부른다. */
    void ensureRow(String branchId, String studentId) {
        for (int attempt = 1; ; attempt++) {
            try {
                rowTransaction.executeWithoutResult(status -> {
                    if (caseRepository.countStudentLock(branchId, studentId) == 0) {
                        caseRepository.insertStudentLock(branchId, studentId);
                    }
                });
                return;
            } catch (DataIntegrityViolationException exception) {
                if (ConstraintViolations.violates(exception, LOCK_PRIMARY_KEY)) {
                    return; // 다른 요청이 먼저 만들었다.
                }
                throw exception;
            } catch (PessimisticLockingFailureException exception) {
                if (attempt >= ENSURE_ATTEMPTS) {
                    throw exception;
                }
            }
        }
    }

    /** 현재 Transaction에서 잠금 행을 배타 잠금한다. {@link #ensureRow}를 먼저 불러야 한다. */
    void lock(String branchId, String studentId) {
        if (caseRepository.lockStudent(branchId, studentId).isEmpty()) {
            throw new IllegalStateException("student lock row is missing");
        }
    }
}
