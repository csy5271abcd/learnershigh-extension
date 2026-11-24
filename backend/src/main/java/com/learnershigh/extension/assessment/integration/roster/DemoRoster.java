package com.learnershigh.extension.assessment.integration.roster;

import com.learnershigh.extension.assessment.integration.context.SubjectCatalog;
import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * 개발용 다지점 시연 명단 (2026-11-12 사용자 결정: "플래그로 켜는 시연 지점"). <b>운영 데이터가 아니다.</b>
 *
 * <ul>
 *   <li>{@code learnershigh.integration.mode=mock} <b>그리고</b> {@code assessment.demo-roster.enabled=true}일 때만 등록된다(기본 OFF).</li>
 *   <li>시연 지점 3개(학원 관리 단위)와 지점별 합성 학생 20명, 지점 관리자 Mock 계정 4개를 정의한다. 학교는 학생의 소속 정보이고 지점과 다르다.</li>
 *   <li>Shared {@code MockExistingStudentClient}와 Wangyu Student Care는 바꾸지 않는다: 이 명단은 Assessment 도메인 안에서만 보인다.</li>
 *   <li>모든 학생은 합성 인물이며 실제 학생·개인정보가 아니다.</li>
 * </ul>
 * 읽을 때 명단 무결성(ID 중복, 학교·학년·반·번호 중복, 카탈로그에 없는 과목, 없는 지점을 가진 관리자)을 검사하고 어기면 시작을 멈춘다.
 */
@Component
@ConditionalOnExpression("'${learnershigh.integration.mode:}' == 'mock' and ${assessment.demo-roster.enabled:false}")
public class DemoRoster {

    static final String RESOURCE = "assessment/demo-roster/demo-roster-2026.json";

    public record Admin(String adminId, String displayName, Set<String> branchIds) {
        public Admin {
            branchIds = Set.copyOf(branchIds);
        }
    }

    /**
     * A28-04: schoolinfoSchoolId·address(선택) = 이 시연 학교가 가리키는 학교알리미 학교(사용자 지정 주소로 검색·대조해 확인한 고유 ID).
     * 있으면 학교알리미 수집이 이름 검색 대신 그 학교만 확인한다(동명 학교 오연결 방지). 같은 학교 키의 학생은 모두 같은 값이어야 한다.
     */
    public record School(String schoolId, String name, String schoolinfoSchoolId, String address) {
        public School(String schoolId, String name) {
            this(schoolId, name, null, null);
        }
    }

    /** subjectIds: 학기("1"/"2") → 그 학기 수강 과목 ID (카탈로그 ID) */
    public record Student(String studentId, String branchId, String displayName, String academyClassName, School school,
            int academicYear, int grade, int schoolClassNumber, int schoolStudentNumber,
            Map<String, List<String>> subjectIds) {
    }

    record RosterFile(String rosterVersion, List<ExistingBranch> branches, List<Admin> admins, List<Student> students) {
    }

    private final Map<String, ExistingBranch> branches = new LinkedHashMap<>();
    private final Map<String, Admin> admins = new LinkedHashMap<>();
    private final Map<String, Student> students = new LinkedHashMap<>();

    public DemoRoster(SubjectCatalog catalog) {
        this(catalog, RESOURCE, "");
    }

    /**
     * A27-UX 부록 L: {@code assessment.demo-roster.e2e-extra-file}(기본 비어 있음)이 있으면 그 파일(파일 시스템)의 합성 학생을 기본 명단 뒤에 더한다.
     * 일회용 E2E 전용 — 운영·기본 실행에는 없다. 더한 학생도 아래 무결성 검사(ID 접두·지점·좌석·카탈로그 과목)를 똑같이 거친다.
     */
    @Autowired
    public DemoRoster(SubjectCatalog catalog, Environment environment) {
        this(catalog, RESOURCE, environment.getProperty("assessment.demo-roster.e2e-extra-file", ""));
    }

    DemoRoster(SubjectCatalog catalog, String resource) {
        this(catalog, resource, "");
    }

    DemoRoster(SubjectCatalog catalog, String resource, String extraFile) {
        RosterFile file;
        JsonMapper mapper = JsonMapper.builder().build();
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            file = mapper.readValue(in, RosterFile.class);
        } catch (IOException e) {
            throw new IllegalStateException("시연 명단을 읽지 못했습니다: " + resource, e);
        }
        if (extraFile != null && !extraFile.isBlank()) {
            RosterFile extra;
            try (InputStream in = java.nio.file.Files.newInputStream(java.nio.file.Path.of(extraFile))) {
                extra = mapper.readValue(in, RosterFile.class);
            } catch (IOException e) {
                throw new IllegalStateException("E2E 추가 명단을 읽지 못했습니다: " + extraFile, e);
            }
            List<Student> all = new java.util.ArrayList<>(file.students());
            all.addAll(extra.students());
            file = new RosterFile(file.rosterVersion(), file.branches(), file.admins(), all);
        }
        for (ExistingBranch branch : file.branches()) {
            if (!branch.branchId().startsWith("br_demo_") || branches.put(branch.branchId(), branch) != null) {
                throw new IllegalStateException("시연 지점 ID는 br_demo_ 로 시작하고 중복되지 않아야 합니다: " + branch.branchId());
            }
        }
        for (Admin admin : file.admins()) {
            if (!admin.adminId().startsWith("adm_demo_") || admin.branchIds().isEmpty()
                    || !branches.keySet().containsAll(admin.branchIds()) || admins.put(admin.adminId(), admin) != null) {
                throw new IllegalStateException("시연 관리자 범위가 올바르지 않습니다: " + admin.adminId());
            }
        }
        Set<String> seats = new HashSet<>();
        Map<String, School> schoolsById = new LinkedHashMap<>();
        for (Student student : file.students()) {
            if (!student.studentId().startsWith("stu_demo_") || students.put(student.studentId(), student) != null) {
                throw new IllegalStateException("시연 학생 ID는 stu_demo_ 로 시작하고 중복되지 않아야 합니다: " + student.studentId());
            }
            if (!branches.containsKey(student.branchId())) {
                throw new IllegalStateException("시연 학생의 지점이 없습니다: " + student.studentId());
            }
            School previous = schoolsById.putIfAbsent(student.school().schoolId(), student.school());
            if (previous != null && !previous.equals(student.school())) {
                throw new IllegalStateException("같은 학교 키의 이름·학교알리미 학교가 다릅니다: " + student.school().schoolId());
            }
            if ((student.school().schoolinfoSchoolId() == null) != (student.school().address() == null)) {
                throw new IllegalStateException("학교알리미 학교 고정은 고유 ID와 주소가 함께 있어야 합니다: " + student.school().schoolId());
            }
            String seat = student.school().schoolId() + "|" + student.grade() + "|" + student.schoolClassNumber() + "|"
                    + student.schoolStudentNumber();
            if (student.grade() < 1 || student.grade() > 3 || !seats.add(seat)) {
                throw new IllegalStateException("학교·학년·반·번호가 올바르지 않거나 중복입니다: " + student.studentId());
            }
            for (int semester = 1; semester <= 2; semester++) {
                List<String> ids = student.subjectIds().getOrDefault(String.valueOf(semester), List.of());
                if (ids.isEmpty() || Set.copyOf(ids).size() != ids.size()) {
                    throw new IllegalStateException("학기 수강 과목이 비었거나 중복입니다: " + student.studentId() + " " + semester);
                }
                for (String id : ids) {
                    if (!catalog.belongsTo(id, student.academicYear(), student.grade(), semester)) {
                        throw new IllegalStateException("카탈로그의 학년·학기 과목이 아닙니다: " + student.studentId() + " " + id);
                    }
                }
            }
        }
    }

    public List<ExistingBranch> branches() {
        return List.copyOf(branches.values());
    }

    public boolean isDemoBranch(String branchId) {
        return branches.containsKey(branchId);
    }

    public Map<String, Admin> admins() {
        return Map.copyOf(admins);
    }

    public Optional<Student> student(String studentId) {
        return Optional.ofNullable(students.get(studentId));
    }

    /** 명단 학생이 소속된 합성 학교 (A18 학년별 시연 슬롯용). 명단에 없는 학교는 empty — 학교를 만들지 않는다. */
    /** A28-10: 이 학교알리미 학교를 고정한 시연 학교 키 */
    public Optional<String> pinnedSchoolId(String schoolinfoSchoolId) {
        return students.values().stream().map(Student::school).filter(s -> schoolinfoSchoolId.equals(s.schoolinfoSchoolId()))
                .map(School::schoolId).sorted().findFirst();
    }

    public Optional<School> school(String schoolId) {
        return students.values().stream().map(Student::school).filter(s -> s.schoolId().equals(schoolId)).findFirst();
    }

    public List<ExistingStudent> studentsOf(String branchId) {
        return students.values().stream().filter(s -> s.branchId().equals(branchId)).map(DemoRoster::asExisting).toList();
    }

    public Optional<ExistingStudent> find(String branchId, String studentId) {
        return student(studentId).filter(s -> s.branchId().equals(branchId)).map(DemoRoster::asExisting);
    }

    private static ExistingStudent asExisting(Student s) {
        return new ExistingStudent(s.studentId(), s.branchId(), s.displayName(), s.academyClassName());
    }
}
