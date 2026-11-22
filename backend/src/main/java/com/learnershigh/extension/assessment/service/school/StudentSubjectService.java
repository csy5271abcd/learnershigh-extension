package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.entity.StudentSubject;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.StudentSubjectRepository;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A27-UX 학생 화면(api-contract '§12-a·§9-1-a', 2026-11-19 DRAFT) 학생이 더한 수강 과목.
 * 학업 Context 원천(AcademicContextProvider)은 바꾸지 않고, 학생 본인의 같은 학기 Context에만 덧붙인다.
 */
@Service
@Transactional
public class StudentSubjectService {

    private final StudentSubjectRepository repository;

    public StudentSubjectService(StudentSubjectRepository repository) {
        this.repository = repository;
    }

    /** 학생이 이 학기에 더한 과목 (생성 순) */
    @Transactional(readOnly = true)
    public List<StudentSubject> added(String studentId, int academicYear, int semester) {
        return repository.findByStudentIdAndAcademicYearAndSemesterOrderByCreatedAtAsc(studentId, academicYear, semester);
    }

    /** 원천 Context + 학생이 더한 과목(같은 ID는 한 번만). 다른 학생·다른 학기 것은 섞지 않는다 */
    @Transactional(readOnly = true)
    public AcademicContextRecord merged(String studentId, AcademicContextRecord context) {
        List<StudentSubject> extra = added(studentId, context.academicYear(), context.semester());
        if (extra.isEmpty()) {
            return context;
        }
        List<AcademicContextRecord.Subject> subjects = new ArrayList<>(context.subjects());
        for (StudentSubject subject : extra) {
            if (!context.hasSubject(subject.subjectId())) {
                subjects.add(new AcademicContextRecord.Subject(subject.subjectId(), subject.name()));
            }
        }
        return new AcademicContextRecord(context.schoolId(), context.schoolName(), context.academicYear(),
                context.grade(), context.semester(), subjects, context.source(), context.catalogSubjects(),
                context.schoolClassNumber(), context.schoolStudentNumber());
    }

    /** 응답 표시용: 학생이 더한 과목 ID (원래 수강 과목과 겹치면 원래 과목으로 본다) */
    @Transactional(readOnly = true)
    public Set<String> addedIds(String studentId, AcademicContextRecord original) {
        return added(studentId, original.academicYear(), original.semester()).stream()
                .map(StudentSubject::subjectId)
                .filter(id -> !original.hasSubject(id))
                .collect(Collectors.toUnmodifiableSet());
    }

    /**
     * 수행평가 등록과 같은 트랜잭션에서 이름으로 과목을 정한다(api-contract §12-a 순서).
     * ① 원래 수강 과목 같은 이름 ② 같은 학기 공통 후보 같은 이름(기존 ID 재사용, 학생 목록에 더함) ③ 이미 더한 개인 과목 ④ 새 개인 과목.
     * 이름이 잘못되면 IllegalArgumentException(호출 측이 400으로 바꾼다).
     */
    public String resolveForCreate(String studentId, AcademicContextRecord original, String rawName, Instant now) {
        String name = StudentSubject.cleanName(rawName);
        String key = StudentSubject.nameKey(name);
        Optional<AcademicContextRecord.Subject> enrolled = original.subjects().stream()
                .filter(subject -> StudentSubject.nameKey(subject.name()).equals(key)).findFirst();
        if (enrolled.isPresent()) {
            return enrolled.get().subjectId();
        }
        Optional<StudentSubject> existing = added(studentId, original.academicYear(), original.semester()).stream()
                .filter(subject -> subject.nameKey().equals(key)).findFirst();
        if (existing.isPresent()) {
            return existing.get().subjectId();
        }
        StudentSubject created = original.catalogSubjects().stream()
                .filter(candidate -> StudentSubject.nameKey(candidate.name()).equals(key))
                .findFirst()
                .map(candidate -> StudentSubject.reuse(studentId, original.academicYear(), original.semester(),
                        candidate.subjectId(), candidate.name(), now))
                .orElseGet(() -> StudentSubject.personal(studentId, original.academicYear(), original.semester(), name,
                        now));
        try {
            repository.saveAndFlush(created);
        } catch (DataIntegrityViolationException duplicate) {
            // 같은 이름을 동시에 더한 요청 — 이 트랜잭션은 되돌리고 다시 시도하게 한다(반쪽 등록 없음)
            throw new BusinessException(AssessmentErrorCode.RESOURCE_VERSION_CONFLICT,
                    "같은 과목을 방금 다른 요청에서 추가했어요. 다시 시도해 주세요.");
        }
        return created.subjectId();
    }
}
