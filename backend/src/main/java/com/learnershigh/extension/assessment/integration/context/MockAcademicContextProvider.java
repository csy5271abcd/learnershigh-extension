package com.learnershigh.extension.assessment.integration.context;

import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord.Subject;
import com.learnershigh.extension.assessment.integration.context.SubjectCatalog.CatalogSubject;
import com.learnershigh.extension.assessment.integration.roster.DemoRoster;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 학업 Context Mock (OD-A04 해결 전). Frontend Canonical Fixture(assessmentFixture.ts)와 같은 학교·과목 ID를 쓴다.
 *
 * <ul>
 *   <li>기존 Mock 학생(stu_*): 모두 같은 가상 학교(예시고등학교) 1학년이라고 가정한다. 실제 학교 정보가 아니다. 수강 과목은 바꾸지 않았다.</li>
 *   <li>개발용 시연 명단 학생(stu_demo_*, 플래그 ON일 때만): 명단의 학교·학년·학교 반·번호·학기별 수강 과목을 쓴다.</li>
 *   <li>모든 학생에게 같은 학년도·학년·학기의 공통 과목 후보(SubjectCatalog)를 붙인다(§9-1 catalogSubjects DRAFT). 학교별 후보가 아니다.</li>
 *   <li>평가계획서 문서 슬롯(findSlot): 예시고등학교 1학년 슬롯 + (명단 플래그 ON일 때만) 명단 합성 학교의 1~3학년 × 1·2학기
 *       카탈로그 슬롯(A18, §38-4, 출처 {@code DEV_DEMO_CATALOG}).</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(name = "learnershigh.integration.mode", havingValue = "mock")
public class MockAcademicContextProvider implements AcademicContextProvider {

    private static final String SOURCE = "EXISTING_LEARNERSHIGH";
    /** A18: 시연 학교 학년별 슬롯의 출처 — 개발용 공통 카탈로그(실제 학교 개설 과목 아님) */
    public static final String DEMO_SLOT_SOURCE = "DEV_DEMO_CATALOG";

    private static final List<AcademicContextRecord> CONTEXTS = List.of(
            new AcademicContextRecord("school_001", "예시고등학교", 2026, 1, 2, List.of(
                    new Subject("subj_01", "공통국어2"),
                    new Subject("subj_02", "통합과학2"),
                    new Subject("subj_03", "통합사회2"),
                    new Subject("subj_04", "과학탐구실험2")), SOURCE),
            new AcademicContextRecord("school_001", "예시고등학교", 2026, 1, 1, List.of(
                    new Subject("subj_11", "공통국어1"),
                    new Subject("subj_12", "통합과학1"),
                    new Subject("subj_13", "통합사회1"),
                    new Subject("subj_14", "과학탐구실험1")), SOURCE));

    /**
     * 3개년 평가계획서 비교(A7, 2026-11-15)용 <b>과거 학년도 문서 슬롯</b> — 개발용 Mock. 평가계획서 확정 검증(findSlot)에만 쓰고
     * 학생 학기 조회(find)에는 쓰지 않는다. 2025는 2026과 같은 과목 ID(ID가 유지되는 경우), 2024는 이름이 비슷해도 다른 과목 ID
     * (교육과정이 달라 같은 과목으로 단정할 수 없는 경우)를 흉내 낸다. 실제 학교·과목 정보가 아니다(실제 원천은 API-OD-A01·1팀).
     */
    private static final List<AcademicContextRecord> PAST_PLAN_SLOTS = List.of(
            new AcademicContextRecord("school_001", "예시고등학교", 2025, 1, 2, List.of(
                    new Subject("subj_01", "공통국어2"),
                    new Subject("subj_02", "통합과학2"),
                    new Subject("subj_03", "통합사회2"),
                    new Subject("subj_04", "과학탐구실험2")), SOURCE),
            new AcademicContextRecord("school_001", "예시고등학교", 2024, 1, 2, List.of(
                    new Subject("subj24_01", "국어"),
                    new Subject("subj24_02", "통합과학"),
                    new Subject("subj24_03", "통합사회"),
                    new Subject("subj24_04", "과학탐구실험")), SOURCE));

    private final SubjectCatalog catalog;
    private final ObjectProvider<DemoRoster> roster;

    public MockAcademicContextProvider(SubjectCatalog catalog, ObjectProvider<DemoRoster> roster) {
        this.catalog = catalog;
        this.roster = roster;
    }

    @Override
    public Optional<AcademicContextRecord> find(String studentId, int academicYear, int semester) {
        DemoRoster demo = roster.getIfAvailable();
        if (demo != null) {
            Optional<DemoRoster.Student> student = demo.student(studentId);
            if (student.isPresent()) {
                return demoContext(student.get(), academicYear, semester);
            }
        }
        return CONTEXTS.stream()
                .filter(context -> context.academicYear() == academicYear && context.semester() == semester)
                .findFirst()
                .map(this::withCatalog);
    }

    @Override
    public Optional<AcademicContextRecord> findSlot(String schoolId, int academicYear, int grade, int semester) {
        // 기존 예시고등학교 슬롯(1학년)이 먼저다 — 바뀌지 않는다.
        Optional<AcademicContextRecord> existing = java.util.stream.Stream.concat(CONTEXTS.stream(), PAST_PLAN_SLOTS.stream())
                .filter(context -> context.schoolId().equals(schoolId) && context.academicYear() == academicYear
                        && context.grade() == grade && context.semester() == semester)
                .findFirst()
                .map(this::withCatalog);
        return existing.isPresent() ? existing : demoSlot(schoolId, academicYear, grade, semester);
    }

    /**
     * A18 학년별 개발용 시연 슬롯 (api-contract §38-4, 시연 명단 플래그 ON일 때만). 명단의 합성 학교 × 카탈로그가 있는 학년도·학년·학기.
     * 과목 = 그 학년·학기 공통 카탈로그 후보(학교별 실제 개설 과목이 아님) — 출처를 {@link #DEMO_SLOT_SOURCE}로 구분한다.
     * 학생 공개 범위는 그대로 학생 학업 Context(학교·학년도·학년·학기) = 문서 슬롯이고, 학년 문맥 충돌 검사도 그대로다.
     */
    private Optional<AcademicContextRecord> demoSlot(String schoolId, int academicYear, int grade, int semester) {
        DemoRoster demo = roster.getIfAvailable();
        if (demo == null) {
            return Optional.empty();
        }
        List<CatalogSubject> candidates = catalog.find(academicYear, grade, semester);
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        return demo.school(schoolId).map(school -> new AcademicContextRecord(school.schoolId(), school.name(), academicYear,
                grade, semester, candidates.stream().map(c -> new Subject(c.subjectId(), c.name())).toList(),
                DEMO_SLOT_SOURCE, candidates, null, null));
    }

    private AcademicContextRecord withCatalog(AcademicContextRecord context) {
        return context.withCatalog(catalog.find(context.academicYear(), context.grade(), context.semester()));
    }

    private Optional<AcademicContextRecord> demoContext(DemoRoster.Student student, int academicYear, int semester) {
        if (student.academicYear() != academicYear) {
            return Optional.empty();
        }
        List<CatalogSubject> candidates = catalog.find(academicYear, student.grade(), semester);
        List<Subject> subjects = student.subjectIds().getOrDefault(String.valueOf(semester), List.of()).stream()
                .map(id -> catalog.find(academicYear, student.grade(), semester, id)
                        .orElseThrow(() -> new IllegalStateException("카탈로그에 없는 시연 수강 과목: " + id)))
                .map(c -> new Subject(c.subjectId(), c.name()))
                .toList();
        return Optional.of(new AcademicContextRecord(student.school().schoolId(), student.school().name(), academicYear,
                student.grade(), semester, subjects, SOURCE, candidates, student.schoolClassNumber(),
                student.schoolStudentNumber()));
    }
}
