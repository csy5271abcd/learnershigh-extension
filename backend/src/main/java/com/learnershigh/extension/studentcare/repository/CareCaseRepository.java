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

    @EntityGraph(attributePaths = "events")
    List<CareCase> findByBranchIdAndStudentId(String branchId, String studentId);

    List<CareCase> findByBranchIdAndStatus(String branchId, CareCaseStatus status);

    @EntityGraph(attributePaths = "events")
    Optional<CareCase> findWithEventsByBranchIdAndStudentIdAndStatus(String branchId, String studentId,
            CareCaseStatus status);

    boolean existsByBranchIdAndActiveStudentId(String branchId, String activeStudentId);

    /** cooldown용: 종결일이 from ~ to(양 끝 포함)인 건. */
    List<CareCase> findByBranchIdAndStatusAndClosedOnBetween(String branchId, CareCaseStatus status,
            LocalDate closedFrom, LocalDate closedTo);

    /**
     * 학생 단위 잠금 행이 있는지 (domain.md §5-1). 잠금 없이 읽는다. {@code StudentCareLocks}가 행을 만들지 정할 때만 쓴다.
     */
    @Query(value = "select count(*) from care_student_lock where branch_id = :branchId and student_id = :studentId",
            nativeQuery = true)
    long countStudentLock(String branchId, String studentId);

    /**
     * 학생 단위 잠금 행을 만든다. 호출하는 쪽이 짧은 별도 Transaction에서 부르고 바로 Commit한다.
     * 같은 행을 동시에 만들면 한쪽은 Primary Key 중복으로 실패하며, 호출하는 쪽이 그 중복을 무시한다.
     */
    @Modifying
    @Query(value = "insert into care_student_lock (branch_id, student_id) values (:branchId, :studentId)",
            nativeQuery = true)
    void insertStudentLock(String branchId, String studentId);

    /**
     * 이미 Commit된 학생 단위 잠금 행을 배타 잠금한다(SELECT ... FOR UPDATE). 호출한 Transaction이 끝날 때 풀린다.
     *
     * <p>행 생성(INSERT)과 잠금을 같은 Transaction에서 하지 않는다: 행을 처음 만든 Transaction이 되돌려지면,
     * 그 INSERT의 중복 검사를 기다리던 Transaction들이 서로의 잠금을 기다려 Deadlock(1213)이 난다.
     * 이미 있는 행에 대한 FOR UPDATE는 기다렸다가 순서대로 진행한다.
     *
     * @return 잠근 행의 student_id (행이 있으면 1개)
     */
    @Query(value = "select student_id from care_student_lock where branch_id = :branchId and student_id = :studentId"
            + " for update", nativeQuery = true)
    List<String> lockStudent(String branchId, String studentId);
}
