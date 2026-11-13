package com.learnershigh.extension.assessment.integration.auth;

import com.learnershigh.extension.assessment.integration.roster.AssessmentStudentDirectory;
import com.learnershigh.extension.assessment.integration.roster.DemoRoster;
import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 개발용 Mock 인증 (사용자 승인 2026-11-09: 기존 인증 확정 전 Mock 인증 Adapter). 운영 인증이 아니다.
 * learnershigh.integration.mode=mock 일 때만 등록된다.
 *
 * <ul>
 *   <li>학생: {@code X-Assessment-Student-Id}. Existing 학생 목록에 있는 ID만 인정한다.</li>
 *   <li>관리자: {@code X-Assessment-Admin-Id}. 아래 고정 Mock 관리자만 인정한다.</li>
 * </ul>
 * Header가 없거나 알 수 없는 ID면 인증 실패(401)다. Header 없이 통과하는 기본 사용자는 없다.
 *
 * <p>개발용 시연 명단(DemoRoster, assessment.demo-roster.enabled=true일 때만)이 켜져 있으면 그 명단의 지점 관리자 Mock 계정
 * (adm_demo_a01·a02·b01·c01, 각자 담당 시연 지점만)을 더한다. 모든 지점을 보는 계정은 없다. 실제 로그인·Session이 아니다(API-OD-A01).
 */
@Component
@ConditionalOnProperty(name = "learnershigh.integration.mode", havingValue = "mock")
public class MockHeaderAssessmentActorProvider implements AssessmentActorProvider {

    public static final String STUDENT_HEADER = "X-Assessment-Student-Id";
    public static final String ADMIN_HEADER = "X-Assessment-Admin-Id";

    /**
     * Mock 관리자. 학생 기록 조회 지점과 평가계획서 운영 학교를 분리한다.
     * 평가계획서 운영 권한은 OD-A08 미결이라 시연용 운영자 한 명에게만 school_001을 준다(모든 관리자에게 주지 않는다).
     */
    private static final Map<String, AdminActor> ADMINS = Map.of(
            "adm_gangnam", new AdminActor("adm_gangnam", Set.of("br_gangnam"), Set.of()),
            "adm_bundang", new AdminActor("adm_bundang", Set.of("br_bundang"), Set.of()),
            "adm_plan_operator", new AdminActor("adm_plan_operator", Set.of(), Set.of("school_001")),
            // 2026-11-11 시연용: 학생 기록(강남 지점) 열람·피드백과 평가계획서 운영(school_001)을 한 화면에서 보여 주기 위한 개발용 Mock 관리자.
            // 운영 권한 모델(OD-A08)을 확정한 것이 아니다. 기존 Mock 관리자 3명의 범위는 바꾸지 않았다.
            "adm_demo_gangnam", new AdminActor("adm_demo_gangnam", Set.of("br_gangnam"), Set.of("school_001")));

    private final AssessmentStudentDirectory students;
    private final Map<String, AdminActor> admins;

    public MockHeaderAssessmentActorProvider(AssessmentStudentDirectory students, ObjectProvider<DemoRoster> roster) {
        this.students = students;
        Map<String, AdminActor> all = new HashMap<>(ADMINS);
        DemoRoster demo = roster.getIfAvailable();
        if (demo != null) {
            demo.admins().values().forEach(admin -> {
                // 시연 관리자는 학생 기록 열람 지점만 가진다. 평가계획서 운영 권한(OD-A08 미결)은 주지 않는다.
                if (all.putIfAbsent(admin.adminId(), new AdminActor(admin.adminId(), admin.branchIds(), Set.of())) != null) {
                    throw new IllegalStateException("시연 관리자 ID가 기존 Mock 관리자와 겹칩니다: " + admin.adminId());
                }
            });
        }
        this.admins = Map.copyOf(all);
    }

    @Override
    public Optional<StudentActor> currentStudent(HttpServletRequest request) {
        String studentId = request.getHeader(STUDENT_HEADER);
        if (studentId == null || studentId.isBlank()) {
            return Optional.empty();
        }
        for (ExistingBranch branch : students.findBranches()) {
            Optional<StudentActor> found = students.findStudent(branch.branchId(), studentId)
                    .map(student -> new StudentActor(student.studentId(), student.branchId()));
            if (found.isPresent()) {
                return found;
            }
        }
        return Optional.empty();
    }

    @Override
    public Optional<AdminActor> currentAdmin(HttpServletRequest request) {
        String adminId = request.getHeader(ADMIN_HEADER);
        return adminId == null ? Optional.empty() : Optional.ofNullable(admins.get(adminId));
    }
}
