package com.learnershigh.extension.common.integration.learnershigh;

import java.util.List;
import java.util.Optional;

/** Existing LearnersHigh 지점 / 학생 조회 경계 (ADR-0002). 실패는 {@link ExistingIntegrationException}. */
public interface ExistingStudentClient {

    List<ExistingBranch> findBranches();

    Optional<ExistingBranch> findBranch(String branchId);

    List<ExistingStudent> findStudents(String branchId);

    Optional<ExistingStudent> findStudent(String branchId, String studentId);
}
