package com.learnershigh.extension.common.integration.learnershigh;

/** Existing LearnersHigh 학생. Admin Surface에서만 사용한다. */
public record ExistingStudent(String studentId, String branchId, String name, String className) {
}
