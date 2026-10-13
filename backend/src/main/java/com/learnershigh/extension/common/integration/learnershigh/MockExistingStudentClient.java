package com.learnershigh.extension.common.integration.learnershigh;

import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 실제 Existing LearnersHigh API가 확정되기 전까지 쓰는 지점 / 학생 Mock (ADR-0002, ADR-0007).
 * 학생 Identity는 {@link MockStudyScenarios}와 같은 ID를 쓴다.
 */
@Component
@ConditionalOnProperty(name = "learnershigh.integration.mode", havingValue = "mock", matchIfMissing = true)
public class MockExistingStudentClient implements ExistingStudentClient {

    private static final List<ExistingBranch> BRANCHES = List.of(
            new ExistingBranch("br_gangnam", "러너스하이 강남점"),
            new ExistingBranch("br_bundang", "러너스하이 분당점"));

    private static final List<ExistingStudent> STUDENTS = List.of(
            new ExistingStudent("stu_001", "br_gangnam", "김서준", "고3 A반"),
            new ExistingStudent("stu_002", "br_gangnam", "최학생", "고3 A반"),
            new ExistingStudent("stu_003", "br_gangnam", "한유진", "고3 A반"),
            new ExistingStudent("stu_004", "br_gangnam", "정예준", "고3 A반"),
            new ExistingStudent("stu_005", "br_gangnam", "윤서연", "고3 A반"),
            new ExistingStudent("stu_006", "br_gangnam", "이학생", "고3 A반"),
            new ExistingStudent("stu_007", "br_gangnam", "오시윤", "고2 B반"),
            new ExistingStudent("stu_008", "br_gangnam", "장하준", "고2 B반"),
            new ExistingStudent("stu_009", "br_gangnam", "박민지", "고2 B반"),
            new ExistingStudent("stu_010", "br_gangnam", "이도현", "고2 B반"),
            new ExistingStudent("stu_101", "br_bundang", "강하늘", "고3 A반"),
            new ExistingStudent("stu_102", "br_bundang", "서지우", "고3 A반"),
            new ExistingStudent("stu_103", "br_bundang", "문지호", "고3 A반"));

    @Override
    public List<ExistingBranch> findBranches() {
        return BRANCHES;
    }

    @Override
    public Optional<ExistingBranch> findBranch(String branchId) {
        return BRANCHES.stream().filter(branch -> branch.branchId().equals(branchId)).findFirst();
    }

    @Override
    public List<ExistingStudent> findStudents(String branchId) {
        return STUDENTS.stream().filter(student -> student.branchId().equals(branchId)).toList();
    }

    @Override
    public Optional<ExistingStudent> findStudent(String branchId, String studentId) {
        return STUDENTS.stream()
                .filter(student -> student.branchId().equals(branchId) && student.studentId().equals(studentId))
                .findFirst();
    }
}
