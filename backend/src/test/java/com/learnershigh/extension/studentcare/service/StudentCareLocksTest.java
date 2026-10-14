package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.learnershigh.extension.studentcare.repository.CareCaseRepository;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.List;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

/** 학생 잠금 행 보장 (domain.md §5-1): 동시에 만들어 생긴 중복은 무시하고, 다른 제약 위반은 숨기지 않는다. */
class StudentCareLocksTest {

    private final CareCaseRepository repository = mock(CareCaseRepository.class);
    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private StudentCareLocks locks;

    @BeforeEach
    void setUp() {
        when(transactionManager.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
        locks = new StudentCareLocks(repository, transactionManager);
    }

    private static DataIntegrityViolationException violation(String constraint) {
        return new DataIntegrityViolationException("insert failed", new ConstraintViolationException("insert failed",
                new SQLIntegrityConstraintViolationException("Duplicate entry"), "insert ...", constraint));
    }

    @Test
    void existingRowIsNotInsertedAgain() {
        when(repository.countStudentLock("br", "stu")).thenReturn(1L);

        locks.ensureRow("br", "stu");

        verify(repository, never()).insertStudentLock(any(), any());
    }

    @Test
    void duplicatePrimaryKeyFromAConcurrentRequestIsIgnored() {
        doThrow(violation("care_student_lock.PRIMARY")).when(repository).insertStudentLock("br", "stu");

        assertThatCode(() -> locks.ensureRow("br", "stu")).doesNotThrowAnyException();
    }

    @Test
    void otherConstraintViolationsAreNotHidden() {
        doThrow(violation("some_other_check")).when(repository).insertStudentLock("br", "stu");

        assertThatThrownBy(() -> locks.ensureRow("br", "stu")).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void lockFailureWhileCreatingTheRowIsRetriedThenSurfaced() {
        doThrow(new CannotAcquireLockException("deadlock")).doNothing().when(repository).insertStudentLock("br", "stu");
        assertThatCode(() -> locks.ensureRow("br", "stu")).doesNotThrowAnyException();
        verify(repository, times(2)).insertStudentLock("br", "stu");

        doThrow(new CannotAcquireLockException("deadlock")).when(repository).insertStudentLock("br", "stu2");
        assertThatThrownBy(() -> locks.ensureRow("br", "stu2")).isInstanceOf(CannotAcquireLockException.class);
        verify(repository, times(3)).insertStudentLock("br", "stu2");
    }

    @Test
    void lockRequiresTheRowToExist() {
        when(repository.lockStudent("br", "stu")).thenReturn(List.of("stu"));
        assertThatCode(() -> locks.lock("br", "stu")).doesNotThrowAnyException();

        when(repository.lockStudent("br", "gone")).thenReturn(List.of());
        assertThatThrownBy(() -> locks.lock("br", "gone")).isInstanceOf(IllegalStateException.class);
    }
}
