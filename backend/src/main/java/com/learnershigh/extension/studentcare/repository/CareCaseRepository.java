package com.learnershigh.extension.studentcare.repository;

import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface CareCaseRepository extends JpaRepository<CareCase, String> {

    /**
     * 결정 / 메모용: 그 지점의 건을 배타 잠금으로 읽는다(SELECT ... FOR UPDATE).
     * 같은 건에 대한 요청은 이 잠금으로 순서대로 처리된다 (domain.md §5-1). 다른 지점 건은 비어 있다 (§5-2).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CareCase c where c.id = :caseId and c.branchId = :branchId")
    Optional<CareCase> findForUpdate(String caseId, String branchId);

    List<CareCase> findByBranchIdAndStatus(String branchId, CareCaseStatus status);

    @EntityGraph(attributePaths = "events")
    Optional<CareCase> findWithEventsByBranchIdAndStudentIdAndStatus(String branchId, String studentId,
            CareCaseStatus status);

    boolean existsByBranchIdAndActiveStudentId(String branchId, String activeStudentId);

    /** cooldown / 지점 요약용: 종결일이 from ~ to(양 끝 포함)인 건. */
    List<CareCase> findByBranchIdAndStatusAndClosedOnBetween(String branchId, CareCaseStatus status,
            LocalDate closedFrom, LocalDate closedTo);

    /**
     * 학생 단위 잠금 (domain.md §5-1). 잠금 행이 없으면 만들고, 있으면 그 행을 배타 잠금한다. Transaction이 끝날 때 풀린다.
     *
     * <p>INSERT IGNORE + SELECT ... FOR UPDATE는 중복 시 공유 잠금을 먼저 잡아, 셋 이상이 동시에 오면 공유 → 배타 승격에서
     * Deadlock이 난다. ON DUPLICATE KEY UPDATE는 중복 행에 처음부터 배타 잠금을 잡으므로 대기만 하고 순서대로 진행한다.
     */
    @Modifying
    @Query(value = "insert into care_student_lock (branch_id, student_id) values (:branchId, :studentId)"
            + " on duplicate key update student_id = student_id", nativeQuery = true)
    void lockStudent(String branchId, String studentId);
}
