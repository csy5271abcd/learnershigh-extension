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
    void 명단은_A_C지점_20명_B지점_72명이고_학교학년반번호가_겹치지_않는다() {
        assertThat(roster.branches()).extracting(b -> b.branchId()).containsExactly("br_demo_a", "br_demo_b", "br_demo_c");
        List<ExistingStudent> all = roster.branches().stream().flatMap(b -> roster.studentsOf(b.branchId()).stream()).toList();
        // A28-04: 기존 60명(지점마다 20명) + B지점 합성 학생 52명(13개 학교 × 4명)
        assertThat(all).hasSize(112);
        assertThat(roster.studentsOf("br_demo_a")).hasSize(20);
        assertThat(roster.studentsOf("br_demo_b")).hasSize(72);
        assertThat(roster.studentsOf("br_demo_c")).hasSize(20);
        Map<String, Long> bySchool = all.stream().map(s -> roster.student(s.studentId()).orElseThrow())
                .collect(Collectors.groupingBy(s -> s.school().schoolId(), Collectors.counting()));
        // 기존 15개교 + 새 10개교(광명·세화·제주는 기존 학교 키를 같은 학교로 재사용 → 8명)
        assertThat(bySchool).hasSize(25);
        assertThat(bySchool).containsEntry("sch_demo_gwangmyeong", 8L).containsEntry("sch_demo_sehwa", 8L).containsEntry("sch_demo_jeju", 8L)
                .containsEntry("sch_demo_gyeongil", 4L).containsEntry("sch_demo_hyundai", 4L).containsEntry("sch_demo_unjeong", 4L);
        Map<Integer, Long> byGrade = all.stream().map(s -> roster.student(s.studentId()).orElseThrow())
                .collect(Collectors.groupingBy(DemoRoster.Student::grade, Collectors.counting()));
        assertThat(byGrade).containsEntry(1, 37L).containsEntry(2, 38L).containsEntry(3, 37L);
        Set<String> seats = new HashSet<>();
        all.forEach(s -> {
            DemoRoster.Student st = roster.student(s.studentId()).orElseThrow();
            assertThat(seats.add(st.school().schoolId() + st.grade() + "-" + st.schoolClassNumber() + "-" + st.schoolStudentNumber())).isTrue();
        });
        assertThat(all.stream().map(ExistingStudent::name).distinct().count()).as("이름 중복 없음").isEqualTo(112);
        // 기존 Mock 학생 ID와 겹치지 않는다
        existing.findBranches().forEach(b -> existing.findStudents(b.branchId())
                .forEach(s -> assertThat(roster.student(s.studentId())).isEmpty()));
    }

    @Test
    void A28_13개_학교는_학교알리미_고유_ID와_주소로_고정되고_동명_학교는_지정한_주소의_학교다() {
        Map<String, String[]> expected = Map.of(
                "sch_demo_gyeongil", new String[] {"경일고등학교", "a0e95c21-74c7-4d65-b7f1-a8a0eb951342", "부산광역시 강서구 영강길 153-42"},
                "sch_demo_gwangmyeong", new String[] {"광명고등학교", "b277f9a9-2933-424f-9870-043119f35c36", "경기도 광명시 오리로876번길 17"},
                "sch_demo_sehwa", new String[] {"세화고등학교", "7e0cc566-7b34-4f5f-b2ed-41765e58af22", "서울특별시 서초구 신반포로 56-7"},
                "sch_demo_hyundai", new String[] {"현대고등학교", "e7624b61-e239-48af-b9e1-a91ccfa9b61c", "서울특별시 강남구 압구정로 127"},
                "sch_demo_pohangsteel", new String[] {"포항제철고등학교", "e2f3e18a-b8a7-40b2-a6ba-1b808b5c0318", "경상북도 포항시 남구 지곡로212번길 40"});
        expected.forEach((id, v) -> {
            DemoRoster.School school = roster.school(id).orElseThrow();
            assertThat(school.name()).isEqualTo(v[0]);
            assertThat(school.schoolinfoSchoolId()).isEqualTo(v[1]);
            assertThat(school.address()).isEqualTo(v[2]);
        });
        long pinned = roster.branches().stream().flatMap(b -> roster.studentsOf(b.branchId()).stream())
                .map(s -> roster.student(s.studentId()).orElseThrow().school()).filter(s -> s.schoolinfoSchoolId() != null)
                .map(DemoRoster.School::schoolId).distinct().count();
        assertThat(pinned).as("고정된 학교 = 사용자 지정 13곳").isEqualTo(13);
        // B지점 관리자가 새 학교 학생을 본다(같은 지점 범위), 기존 B지점 학생 유지
        assertThat(roster.studentsOf("br_demo_b")).extracting(ExistingStudent::studentId).contains("stu_demo_037", "stu_demo_061", "stu_demo_112");
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
    void 부록O_운영_이름의_Profile에서는_개발_Header를_받지_않는다() {
        AssessmentStudentDirectory directory = new AssessmentStudentDirectory(existing, provider(null));
        for (String profile : new String[] {"prod", "production", "staging"}) {
            org.springframework.mock.env.MockEnvironment env = new org.springframework.mock.env.MockEnvironment();
            env.setActiveProfiles(profile);
            MockHeaderAssessmentActorProvider auth = new MockHeaderAssessmentActorProvider(directory, provider(null), env);
            assertThat(auth.currentAdmin(admin("adm_plan_operator"))).as(profile).isEmpty();
            MockHttpServletRequest student = new MockHttpServletRequest();
            student.addHeader(MockHeaderAssessmentActorProvider.STUDENT_HEADER, "stu_001");
            assertThat(auth.currentStudent(student)).as(profile).isEmpty();
        }
        org.springframework.mock.env.MockEnvironment local = new org.springframework.mock.env.MockEnvironment();
        local.setActiveProfiles("local-run");
        assertThat(new MockHeaderAssessmentActorProvider(directory, provider(null), local).currentAdmin(admin("adm_plan_operator"))).isPresent();
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

    // ── A18: 학년별 개발용 시연 슬롯 (api-contract §38-4) ──

    @Test
    void A18_명단이_켜지면_합성_학교마다_1_3학년_1_2학기_카탈로그_슬롯이_있다() {
        MockAcademicContextProvider contexts = new MockAcademicContextProvider(catalog, provider(roster));
        DemoRoster.Student any = roster.student("stu_demo_001").orElseThrow();
        String schoolId = any.school().schoolId();
        for (int grade = 1; grade <= 3; grade++) {
            for (int semester = 1; semester <= 2; semester++) {
                AcademicContextRecord slot = contexts.findSlot(schoolId, 2026, grade, semester).orElseThrow();
                assertThat(slot.schoolId()).isEqualTo(schoolId);
                assertThat(slot.schoolName()).isEqualTo(any.school().name());
                assertThat(slot.grade()).isEqualTo(grade);
                assertThat(slot.semester()).isEqualTo(semester);
                assertThat(slot.source()).isEqualTo(MockAcademicContextProvider.DEMO_SLOT_SOURCE);
                assertThat(slot.subjects()).extracting(AcademicContextRecord.Subject::subjectId)
                        .containsExactlyElementsOf(catalog.find(2026, grade, semester).stream()
                                .map(SubjectCatalog.CatalogSubject::subjectId).toList());
                // 다른 학년·학기 과목은 이 슬롯 과목이 아니다
                int otherGrade = grade == 3 ? 1 : grade + 1;
                catalog.find(2026, otherGrade, semester).forEach(c -> assertThat(slot.hasSubject(c.subjectId())).isFalse());
            }
        }
    }

    @Test
    void A18_기존_예시고_1학년_슬롯은_그대로이고_없는_슬롯을_만들지_않는다() {
        MockAcademicContextProvider on = new MockAcademicContextProvider(catalog, provider(roster));
        MockAcademicContextProvider off = new MockAcademicContextProvider(catalog, provider(null));
        for (MockAcademicContextProvider contexts : List.of(on, off)) {
            AcademicContextRecord legacy = contexts.findSlot("school_001", 2026, 1, 2).orElseThrow();
            assertThat(legacy.source()).isEqualTo("EXISTING_LEARNERSHIGH");
            assertThat(legacy.subjects()).extracting(AcademicContextRecord.Subject::subjectId)
                    .containsExactly("subj_01", "subj_02", "subj_03", "subj_04");
            assertThat(contexts.findSlot("school_001", 2025, 1, 2)).isPresent();
            // 예시고 2·3학년은 여전히 없다(학교를 만들지 않음)
            assertThat(contexts.findSlot("school_001", 2026, 2, 1)).isEmpty();
            assertThat(contexts.findSlot("school_001", 2026, 3, 2)).isEmpty();
        }
        String schoolId = roster.student("stu_demo_001").orElseThrow().school().schoolId();
        assertThat(off.findSlot(schoolId, 2026, 2, 1)).as("플래그 OFF면 시연 슬롯 없음").isEmpty();
        assertThat(on.findSlot(schoolId, 2025, 2, 1)).as("카탈로그 없는 학년도").isEmpty();
        assertThat(on.findSlot(schoolId, 2026, 4, 1)).as("없는 학년").isEmpty();
        assertThat(on.findSlot(schoolId, 2026, 2, 3)).as("없는 학기").isEmpty();
        assertThat(on.findSlot("sch_demo_unknown", 2026, 2, 1)).as("명단에 없는 학교").isEmpty();
    }

    @Test
    void A18_2_3학년_시연_학생의_학업_Context는_자기_학교_학년_슬롯과만_맞는다() {
        MockAcademicContextProvider contexts = new MockAcademicContextProvider(catalog, provider(roster));
        for (int grade = 2; grade <= 3; grade++) {
            int g = grade;
            DemoRoster.Student student = roster.studentsOf("br_demo_a").stream()
                    .map(s -> roster.student(s.studentId()).orElseThrow())
                    .filter(s -> s.grade() == g).findFirst().orElseThrow();
            for (int semester = 1; semester <= 2; semester++) {
                AcademicContextRecord own = contexts.find(student.studentId(), 2026, semester).orElseThrow();
                AcademicContextRecord slot = contexts.findSlot(own.schoolId(), 2026, own.grade(), semester).orElseThrow();
                assertThat(own.grade()).isEqualTo(grade);
                assertThat(slot.grade()).isEqualTo(own.grade());
                // 학생 수강 과목은 모두 그 슬롯 과목이다 (확정값을 자기 학년 과목으로 볼 수 있음)
                own.subjects().forEach(s -> assertThat(slot.hasSubject(s.subjectId())).isTrue());
            }
        }
    }

    @Test
    void 학교학년반번호가_겹치는_명단은_시작을_멈춘다() {
        assertThatThrownBy(() -> new DemoRoster(catalog, "assessment/demo-roster/invalid-duplicate-seat.json"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("중복");
    }

    /** 부록 L: E2E 전용 추가 명단(파일)은 기본 명단 뒤에 더해지고 같은 무결성 검사를 거친다. 지정하지 않으면(기본) 없다 */
    @Test
    void E2E_추가_명단은_지정했을_때만_더해지고_같은_검사를_거친다() throws Exception {
        java.nio.file.Path fixture = java.nio.file.Path.of("..", "e2e", "assessment", "fixtures", "e2e-roster-hanbit-paju.json");
        DemoRoster withExtra = new DemoRoster(catalog, DemoRoster.RESOURCE, fixture.toString());
        assertThat(withExtra.student("stu_demo_e2e_hanbit2")).hasValueSatisfying(s -> {
            assertThat(s.school().name()).isEqualTo("한빛고등학교");
            assertThat(s.branchId()).isEqualTo("br_demo_c");
        });
        assertThat(withExtra.school("sch_e2e_hanbit_paju")).isPresent();
        assertThat(roster.student("stu_demo_e2e_hanbit2")).as("기본 명단에는 없다").isEmpty();
        java.nio.file.Path bad = java.nio.file.Files.createTempFile("roster-bad", ".json");
        java.nio.file.Files.writeString(bad, java.nio.file.Files.readString(fixture).replace("stu_demo_e2e_hanbit2", "stu_real_001"));
        assertThatThrownBy(() -> new DemoRoster(catalog, DemoRoster.RESOURCE, bad.toString())).isInstanceOf(IllegalStateException.class);
        java.nio.file.Files.deleteIfExists(bad);
    }
}
