package com.learnershigh.extension.assessment.integration.roster;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.dto.context.AcademicContextResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.MockHeaderAssessmentActorProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.integration.context.MockAcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.SubjectCatalog;
import com.learnershigh.extension.assessment.service.AdminStudentScope;
import com.learnershigh.extension.assessment.service.school.AcademicContextQueryService;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import com.learnershigh.extension.common.integration.learnershigh.MockExistingStudentClient;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * 개발용 시연 명단(플래그 ON)과 과목 카탈로그 단위 검증. DB·Docker 없이 실행한다.
 * 지점 격리: 시연 관리자는 담당 지점 학생만 찾고, 모든 지점을 보는 계정은 없다. 플래그 OFF면 시연 계정·학생이 없다.
 */
class DemoRosterTest {

    private final SubjectCatalog catalog = new SubjectCatalog();
    private final DemoRoster roster = new DemoRoster(catalog);
    private final MockExistingStudentClient existing = new MockExistingStudentClient();

    private static ObjectProvider<DemoRoster> provider(DemoRoster roster) {
        DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
        if (roster != null) {
            factory.registerSingleton("demoRoster", roster);
        }
        return factory.getBeanProvider(DemoRoster.class);
    }

    private static MockHttpServletRequest admin(String adminId) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(MockHeaderAssessmentActorProvider.ADMIN_HEADER, adminId);
        return request;
    }

    @Test
    void 카탈로그는_6개_학년학기_슬롯이고_기존_Mock_과목_ID를_유지한다() {
        for (int grade = 1; grade <= 3; grade++) {
            for (int semester = 1; semester <= 2; semester++) {
                assertThat(catalog.find(2026, grade, semester)).as(grade + "-" + semester).hasSizeGreaterThanOrEqualTo(10);
            }
        }
        assertThat(catalog.find(2026, 1, 1, "subj_11")).get().extracting(SubjectCatalog.CatalogSubject::name).isEqualTo("공통국어1");
        assertThat(catalog.find(2026, 1, 2, "subj_01")).get().extracting(SubjectCatalog.CatalogSubject::name).isEqualTo("공통국어2");
        assertThat(catalog.find(2026, 1, 1)).extracting(SubjectCatalog.CatalogSubject::curriculumVersion).containsOnly("2022");
        assertThat(catalog.find(2026, 3, 2)).extracting(SubjectCatalog.CatalogSubject::curriculumVersion).containsOnly("2015");
        assertThat(catalog.find(2027, 1, 1)).isEmpty();
    }

    @Test
    void 명단은_3개_지점_20명씩_15개교_4명씩_학년별_20명이고_학교학년반번호가_겹치지_않는다() {
        assertThat(roster.branches()).extracting(b -> b.branchId()).containsExactly("br_demo_a", "br_demo_b", "br_demo_c");
        List<ExistingStudent> all = roster.branches().stream().flatMap(b -> roster.studentsOf(b.branchId()).stream()).toList();
        assertThat(all).hasSize(60);
        roster.branches().forEach(b -> assertThat(roster.studentsOf(b.branchId())).hasSize(20));
        Map<String, Long> bySchool = all.stream().map(s -> roster.student(s.studentId()).orElseThrow())
                .collect(Collectors.groupingBy(s -> s.school().schoolId(), Collectors.counting()));
        assertThat(bySchool).hasSize(15).allSatisfy((school, count) -> assertThat(count).isEqualTo(4L));
        Map<Integer, Long> byGrade = all.stream().map(s -> roster.student(s.studentId()).orElseThrow())
                .collect(Collectors.groupingBy(DemoRoster.Student::grade, Collectors.counting()));
        assertThat(byGrade).containsEntry(1, 20L).containsEntry(2, 20L).containsEntry(3, 20L);
        Set<String> seats = new HashSet<>();
        all.forEach(s -> {
            DemoRoster.Student st = roster.student(s.studentId()).orElseThrow();
            assertThat(seats.add(st.school().schoolId() + st.grade() + "-" + st.schoolClassNumber() + "-" + st.schoolStudentNumber())).isTrue();
        });
        // 기존 Mock 학생 ID와 겹치지 않는다
        existing.findBranches().forEach(b -> existing.findStudents(b.branchId())
                .forEach(s -> assertThat(roster.student(s.studentId())).isEmpty()));
    }

    @Test
    void 시연_관리자_4명은_각자_한_지점만_가지고_모든_지점을_보는_계정은_없다() {
        MockHeaderAssessmentActorProvider auth = new MockHeaderAssessmentActorProvider(
                new AssessmentStudentDirectory(existing, provider(roster)), provider(roster));
        Map<String, Set<String>> expected = Map.of("adm_demo_a01", Set.of("br_demo_a"), "adm_demo_a02", Set.of("br_demo_a"),
                "adm_demo_b01", Set.of("br_demo_b"), "adm_demo_c01", Set.of("br_demo_c"));
        expected.forEach((id, branches) -> {
            AdminActor actor = auth.currentAdmin(admin(id)).orElseThrow();
            assertThat(actor.branchIds()).isEqualTo(branches);
            // 2026-11-13 OD-A08: 시연 관리자도 모든 학교 평가계획서를 운영한다 (학생 기록 지점은 그대로 한 곳)
            assertThat(actor.canOperateEvaluationPlans()).isTrue();
        });
        assertThat(roster.admins().values()).allSatisfy(a -> assertThat(a.branchIds()).hasSize(1));
        // 기존 Mock 관리자 범위는 그대로
        assertThat(auth.currentAdmin(admin("adm_demo_gangnam")).orElseThrow().branchIds()).containsExactly("br_gangnam");
        assertThat(auth.currentAdmin(admin("adm_demo_all"))).isEmpty();
    }

    @Test
    void 지점_격리_A관리자는_B학생을_읽을_수_없고_A01과_A02는_같은_A학생을_읽는다() {
        AssessmentStudentDirectory directory = new AssessmentStudentDirectory(existing, provider(roster));
        AdminStudentScope scope = new AdminStudentScope(directory);
        MockHeaderAssessmentActorProvider auth = new MockHeaderAssessmentActorProvider(directory, provider(roster));
        AdminActor a01 = auth.currentAdmin(admin("adm_demo_a01")).orElseThrow();
        AdminActor a02 = auth.currentAdmin(admin("adm_demo_a02")).orElseThrow();
        AdminActor b01 = auth.currentAdmin(admin("adm_demo_b01")).orElseThrow();
        AdminActor gangnam = auth.currentAdmin(admin("adm_demo_gangnam")).orElseThrow();
        String studentA = roster.studentsOf("br_demo_a").getFirst().studentId();
        String studentB = roster.studentsOf("br_demo_b").getFirst().studentId();

        scope.requireReadable(a01, studentA);
        scope.requireReadable(a02, studentA);
        scope.requireReadable(b01, studentB);
        assertThatThrownBy(() -> scope.requireReadable(a01, studentB)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> scope.requireReadable(b01, studentA)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> scope.requireReadable(gangnam, studentA)).isInstanceOf(BusinessException.class);
        assertThat(directory.findStudent("br_demo_b", studentA)).isEmpty();
        // 기존 지점은 기존 Client 그대로
        assertThat(directory.findStudents("br_gangnam")).isEqualTo(existing.findStudents("br_gangnam"));
    }

    @Test
    void 플래그_OFF면_시연_관리자와_학생이_없다() {
        AssessmentStudentDirectory directory = new AssessmentStudentDirectory(existing, provider(null));
        MockHeaderAssessmentActorProvider auth = new MockHeaderAssessmentActorProvider(directory, provider(null));
        assertThat(auth.currentAdmin(admin("adm_demo_a01"))).isEmpty();
        assertThat(directory.findBranches()).extracting(b -> b.branchId()).containsExactly("br_gangnam", "br_bundang");
        MockHttpServletRequest student = new MockHttpServletRequest();
        student.addHeader(MockHeaderAssessmentActorProvider.STUDENT_HEADER, "stu_demo_001");
        assertThat(auth.currentStudent(student)).isEmpty();
    }

    @Test
    void 시연_학생_Context는_학교_반번호_학기별_수강과목과_같은_학년학기_공통후보를_준다() {
        MockAcademicContextProvider contexts = new MockAcademicContextProvider(catalog, provider(roster));
        DemoRoster.Student student = roster.student("stu_demo_002").orElseThrow();
        for (int semester = 1; semester <= 2; semester++) {
            AcademicContextRecord context = contexts.find(student.studentId(), 2026, semester).orElseThrow();
            assertThat(context.schoolId()).isEqualTo(student.school().schoolId());
            assertThat(context.grade()).isEqualTo(student.grade());
            assertThat(context.schoolClassNumber()).isEqualTo(student.schoolClassNumber());
            assertThat(context.subjects()).extracting(AcademicContextRecord.Subject::subjectId)
                    .containsExactlyElementsOf(student.subjectIds().get(String.valueOf(semester)));
            assertThat(context.catalogSubjects()).isEqualTo(catalog.find(2026, student.grade(), semester));
            AcademicContextResponse response = AcademicContextQueryService.toResponse(context);
            assertThat(response.catalogSubjects().stream().filter(AcademicContextResponse.CatalogSubject::enrolled)
                    .map(AcademicContextResponse.CatalogSubject::subjectId).toList())
                    .containsExactlyInAnyOrderElementsOf(student.subjectIds().get(String.valueOf(semester)));
        }
        assertThat(contexts.find(student.studentId(), 2025, 1)).isEmpty();
    }

    @Test
    void 기존_Mock_학생_Context의_수강과목은_그대로이고_후보만_붙는다() {
        MockAcademicContextProvider contexts = new MockAcademicContextProvider(catalog, provider(roster));
        AcademicContextRecord context = contexts.find("stu_001", 2026, 2).orElseThrow();
        assertThat(context.schoolId()).isEqualTo("school_001");
        assertThat(context.subjects()).extracting(AcademicContextRecord.Subject::subjectId)
                .containsExactly("subj_01", "subj_02", "subj_03", "subj_04");
        assertThat(context.schoolClassNumber()).isNull();
        AcademicContextResponse response = AcademicContextQueryService.toResponse(context);
        assertThat(response.catalogSubjects()).hasSize(catalog.find(2026, 1, 2).size());
        assertThat(response.catalogSubjects().stream().filter(AcademicContextResponse.CatalogSubject::enrolled)
                .map(AcademicContextResponse.CatalogSubject::subjectId)).containsExactlyInAnyOrder("subj_01", "subj_02", "subj_03", "subj_04");
    }

    @Test
    void 학교학년반번호가_겹치는_명단은_시작을_멈춘다() {
        assertThatThrownBy(() -> new DemoRoster(catalog, "assessment/demo-roster/invalid-duplicate-seat.json"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("중복");
    }
}
