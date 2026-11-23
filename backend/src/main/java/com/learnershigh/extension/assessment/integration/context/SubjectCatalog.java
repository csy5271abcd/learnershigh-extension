package com.learnershigh.extension.assessment.integration.context;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * 학년도·학년·학기별 공통 과목 후보 카탈로그 (api-contract.md §9-1 catalogSubjects, DRAFT 2026-11-12).
 *
 * <p>학교별로 나누지 않는다. 15개교 2026학년도 평가계획서를 참고해 구성한 <b>참고 카탈로그</b>이며 공식 학교 개설 과목·필수 과목이 아니다
 * (docs/specs/suyeon/assessment-15schools-60students-seed-202611/GRADE-SEMESTER-SUBJECT-CATALOG.md).
 * 실제 학생 수강 과목(AcademicContextRecord.subjects)과 구분한다. 원천 확정은 OD-A04 미결이다.
 */
@Component
public class SubjectCatalog {

    static final String RESOURCE = "assessment/subject-catalog/subject-catalog-2026.json";

    /** 카탈로그 과목 한 건. subjectId는 학년·학기 슬롯 안에서 고유하고 슬롯 사이에도 겹치지 않는다. */
    public record CatalogSubject(String subjectId, String name, String subjectGroup, String curriculumVersion) {
    }

    record SlotFile(int grade, int semester, String curriculumVersion, List<SubjectFile> subjects) {
    }

    record SubjectFile(String subjectId, String name, String subjectGroup) {
    }

    record CatalogFile(String catalogVersion, int academicYear, List<SlotFile> slots) {
    }

    private final Map<String, List<CatalogSubject>> bySlot = new LinkedHashMap<>();
    private final Map<String, String> slotOfSubject = new HashMap<>();

    @Autowired
    public SubjectCatalog() {
        this(RESOURCE);
    }

    SubjectCatalog(String resource) {
        CatalogFile file;
        try (InputStream in = new ClassPathResource(resource).getInputStream()) {
            file = JsonMapper.builder().build().readValue(in, CatalogFile.class);
        } catch (IOException e) {
            throw new IllegalStateException("과목 카탈로그를 읽지 못했습니다: " + resource, e);
        }
        Set<String> ids = new HashSet<>();
        for (SlotFile slot : file.slots()) {
            String key = key(file.academicYear(), slot.grade(), slot.semester());
            if (bySlot.containsKey(key)) {
                throw new IllegalStateException("과목 카탈로그 슬롯 중복: " + key);
            }
            Set<String> names = new HashSet<>();
            List<CatalogSubject> subjects = slot.subjects().stream().map(s -> {
                if (!ids.add(s.subjectId())) {
                    throw new IllegalStateException("과목 카탈로그 subjectId 중복: " + s.subjectId());
                }
                if (!names.add(s.name())) {
                    throw new IllegalStateException("같은 학년·학기에 과목명 중복: " + key + " " + s.name());
                }
                slotOfSubject.put(s.subjectId(), key);
                return new CatalogSubject(s.subjectId(), s.name(), s.subjectGroup(), slot.curriculumVersion());
            }).toList();
            bySlot.put(key, subjects);
        }
    }

    /** 해당 학년도·학년·학기 후보. 카탈로그가 없는 학기는 빈 목록(오류 아님: 후보 미구성). */
    public List<CatalogSubject> find(int academicYear, int grade, int semester) {
        return bySlot.getOrDefault(key(academicYear, grade, semester), List.of());
    }

    public Optional<CatalogSubject> find(int academicYear, int grade, int semester, String subjectId) {
        return find(academicYear, grade, semester).stream().filter(s -> s.subjectId().equals(subjectId)).findFirst();
    }

    public boolean belongsTo(String subjectId, int academicYear, int grade, int semester) {
        return key(academicYear, grade, semester).equals(slotOfSubject.get(subjectId));
    }

    private static String key(int academicYear, int grade, int semester) {
        return academicYear + "|" + grade + "|" + semester;
    }
}
