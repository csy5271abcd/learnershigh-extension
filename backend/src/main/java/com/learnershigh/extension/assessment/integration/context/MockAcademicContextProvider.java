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
 * </ul>
 */
@Component
@ConditionalOnProperty(name = "learnershigh.integration.mode", havingValue = "mock")
public class MockAcademicContextProvider implements AcademicContextProvider {

    private static final String SOURCE = "EXISTING_LEARNERSHIGH";

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
        // 평가계획서 검토 확정용 학교 슬롯은 기존 예시고등학교만 있다. 시연 학교의 평가계획서 운영은 범위 밖이다(PDF는 참고자료).
        return CONTEXTS.stream()
                .filter(context -> context.schoolId().equals(schoolId) && context.academicYear() == academicYear
                        && context.grade() == grade && context.semester() == semester)
                .findFirst()
                .map(this::withCatalog);
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
