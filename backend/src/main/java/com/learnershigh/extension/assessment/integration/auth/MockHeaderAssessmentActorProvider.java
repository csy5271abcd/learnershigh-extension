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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
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
     * 평가계획서 운영 권한 (OD-A08, 2026-11-13 사용자 승인): 정상 인증된 관리자는 모두 모든 학교의 평가계획서를 운영한다.
     * 이 권한은 평가계획서에만 적용한다. 학생 기록 조회 지점(branchIds)·Student Care 권한은 그대로다.
     */
    private static final boolean EVERY_ADMIN_OPERATES_PLANS = true;

    /** Mock 관리자. 학생 기록 조회 지점은 관리자마다 다르다. */
    private static final Map<String, AdminActor> ADMINS = Map.of(
            "adm_gangnam", admin("adm_gangnam", Set.of("br_gangnam")),
            "adm_bundang", admin("adm_bundang", Set.of("br_bundang")),
            // 학생 기록 지점이 없는 평가계획서 운영 전용 Mock 관리자 (지점 학생은 볼 수 없다)
            "adm_plan_operator", admin("adm_plan_operator", Set.of()),
            // 2026-11-11 시연용: 학생 기록(강남 지점) 열람·피드백과 평가계획서 운영을 한 화면에서 보여 주기 위한 개발용 Mock 관리자.
            "adm_demo_gangnam", admin("adm_demo_gangnam", Set.of("br_gangnam")));

    private static AdminActor admin(String adminId, Set<String> branchIds) {
        return new AdminActor(adminId, branchIds, EVERY_ADMIN_OPERATES_PLANS);
    }

    private final AssessmentStudentDirectory students;
    private final Map<String, AdminActor> admins;
    /**
     * 부록 O: 운영 이름의 Profile(prod·production·staging)에서는 개발 Header 를 받지 않는다(늘 401, fail-closed).
     * 실제 인증 공급자는 1팀 담당 — 그 전까지 운영 Profile 은 개발 인증으로 열리지 않는다.
     */
    private final boolean headersAllowed;

    public MockHeaderAssessmentActorProvider(AssessmentStudentDirectory students, ObjectProvider<DemoRoster> roster) {
        this(students, roster, null);
    }

    @Autowired
    public MockHeaderAssessmentActorProvider(AssessmentStudentDirectory students, ObjectProvider<DemoRoster> roster, Environment environment) {
        this.students = students;
        this.headersAllowed = environment == null || !environment.acceptsProfiles(Profiles.of("prod | production | staging"));
        Map<String, AdminActor> all = new HashMap<>(ADMINS);
        DemoRoster demo = roster.getIfAvailable();
        if (demo != null) {
            demo.admins().values().forEach(admin -> {
                // 시연 관리자: 학생 기록은 담당 시연 지점만, 평가계획서는 다른 관리자와 같이 모든 학교 (OD-A08 2026-11-13)
                if (all.putIfAbsent(admin.adminId(), admin(admin.adminId(), admin.branchIds())) != null) {
                    throw new IllegalStateException("시연 관리자 ID가 기존 Mock 관리자와 겹칩니다: " + admin.adminId());
                }
            });
        }
        this.admins = Map.copyOf(all);
    }

    @Override
    public Optional<StudentActor> currentStudent(HttpServletRequest request) {
        String studentId = headersAllowed ? request.getHeader(STUDENT_HEADER) : null;
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
        String adminId = headersAllowed ? request.getHeader(ADMIN_HEADER) : null;
        return adminId == null ? Optional.empty() : Optional.ofNullable(admins.get(adminId));
    }
}
