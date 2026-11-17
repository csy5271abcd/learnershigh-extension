package com.learnershigh.extension.assessment.integration.roster;

import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudentClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * Assessment가 학생·지점을 찾는 단일 진입점. 원천은 기존 LearnersHigh 학생 Client(Shared, 변경 없음)이고,
 * 개발용 시연 명단(DemoRoster, 기본 OFF)이 켜져 있으면 시연 지점의 학생만 여기에 더한다.
 *
 * <p>시연 지점은 {@code br_demo_} 접두사로 기존 지점과 겹치지 않는다. 명단이 꺼져 있으면 기존 Client와 완전히 같다.
 * Student Care는 이 Directory를 쓰지 않으므로 시연 명단의 영향을 받지 않는다.
 */
@Component
public class AssessmentStudentDirectory {

    private final ExistingStudentClient existing;
    private final ObjectProvider<DemoRoster> roster;

    public AssessmentStudentDirectory(ExistingStudentClient existing, ObjectProvider<DemoRoster> roster) {
        this.existing = existing;
        this.roster = roster;
    }

    public List<ExistingBranch> findBranches() {
        List<ExistingBranch> all = new ArrayList<>(existing.findBranches());
        DemoRoster demo = roster.getIfAvailable();
        if (demo != null) {
            all.addAll(demo.branches());
        }
        return all;
    }

    public List<ExistingStudent> findStudents(String branchId) {
        DemoRoster demo = roster.getIfAvailable();
        return demo != null && demo.isDemoBranch(branchId) ? demo.studentsOf(branchId) : existing.findStudents(branchId);
    }

    public Optional<ExistingStudent> findStudent(String branchId, String studentId) {
        DemoRoster demo = roster.getIfAvailable();
        return demo != null && demo.isDemoBranch(branchId) ? demo.find(branchId, studentId)
                : existing.findStudent(branchId, studentId);
    }
}
