package com.learnershigh.extension.studentcare.repository;

import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareCaseRepository extends JpaRepository<CareCase, String> {

    @EntityGraph(attributePaths = "events")
    Optional<CareCase> findWithEventsById(String id);

    List<CareCase> findByBranchIdAndStatus(String branchId, CareCaseStatus status);

    @EntityGraph(attributePaths = "events")
    Optional<CareCase> findWithEventsByBranchIdAndStudentIdAndStatus(String branchId, String studentId,
            CareCaseStatus status);

    /** cooldown 판단용: 기간 안에 종결된 건. */
    List<CareCase> findByBranchIdAndStatusAndClosedOnGreaterThanEqual(String branchId, CareCaseStatus status,
            LocalDate closedFrom);
}
