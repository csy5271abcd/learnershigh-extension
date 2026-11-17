package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentListQuery;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AdminStudentScope;
import com.learnershigh.extension.common.error.BusinessException;
import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** §12 학생 조회 / §34 관리자 조회. 같은 Entity를 같은 응답 Shape으로 본다. */
@Service
@Transactional(readOnly = true)
public class SchoolAssessmentQueryService {

    private final SchoolAssessmentRepository repository;
    private final AcademicContextProvider contexts;
    private final AdminStudentScope adminScope;
    private final SchoolAssessmentMapper mapper;

    public SchoolAssessmentQueryService(SchoolAssessmentRepository repository, AcademicContextProvider contexts,
            AdminStudentScope adminScope, SchoolAssessmentMapper mapper) {
        this.repository = repository;
        this.contexts = contexts;
        this.adminScope = adminScope;
        this.mapper = mapper;
    }

    public PageResponse<SchoolAssessmentResponse> list(StudentActor student, SchoolAssessmentListQuery query) {
        List<SchoolAssessment> term = repository.findTerm(student.studentId(), query.academicYear(), query.semester());
        Optional<AcademicContextRecord> context = contexts.find(student.studentId(), query.academicYear(),
                query.semester());
        String keyword = query.query() == null ? "" : query.query().strip().toLowerCase(Locale.KOREAN);
        List<SchoolAssessmentResponse> matched = term.stream()
                .filter(a -> query.subjectId() == null || a.subjectId().equals(query.subjectId()))
                .filter(a -> query.status() == null || a.status().name().equals(query.status()))
                .filter(a -> keyword.isEmpty() || matchesKeyword(a, keyword, context))
                .sorted(comparator(query.sort()))
                .map(mapper::toResponse)
                .toList();
        return PageResponse.slice(matched, query.page(), query.size());
    }

    public SchoolAssessmentResponse get(StudentActor student, String assessmentId) {
        return mapper.toResponse(repository.findOwned(assessmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND)));
    }

    /** §34 관리자: 담당 범위 학생의 학기별 수행평가. 피드백 요청 여부와 무관하게 읽을 수 있다. 읽기 전용. */
    public PageResponse<SchoolAssessmentResponse> listForAdmin(AdminActor admin, String studentId, int academicYear,
            int semester, int page, int size) {
        adminScope.requireReadable(admin, studentId);
        List<SchoolAssessmentResponse> items = repository.findTerm(studentId, academicYear, semester).stream()
                .sorted(comparator(SchoolAssessmentListQuery.SORT_DEADLINE))
                .map(mapper::toResponse)
                .toList();
        return PageResponse.slice(items, page, size);
    }

    /** 제목 또는 과목명 검색 (Frontend Stage 1 Mock과 같은 범위). */
    private static boolean matchesKeyword(SchoolAssessment assessment, String keyword,
            Optional<AcademicContextRecord> context) {
        if (assessment.title().toLowerCase(Locale.KOREAN).contains(keyword)) {
            return true;
        }
        return context.flatMap(c -> c.subjectName(assessment.subjectId()))
                .map(name -> name.toLowerCase(Locale.KOREAN).contains(keyword))
                .orElse(false);
    }

    static Comparator<SchoolAssessment> comparator(String sort) {
        Comparator<SchoolAssessment> byCreated = Comparator.comparing(SchoolAssessment::createdAt)
                .thenComparing(SchoolAssessment::id);
        if (SchoolAssessmentListQuery.SORT_CREATED.equals(sort)) {
            return byCreated.reversed();
        }
        if (SchoolAssessmentListQuery.SORT_TITLE.equals(sort)) {
            Collator collator = Collator.getInstance(Locale.KOREAN);
            return Comparator.comparing(SchoolAssessment::title, collator).thenComparing(byCreated);
        }
        // deadlineDate,asc: 마감일 미정(null)은 뒤로. 같으면 먼저 등록한 것부터.
        return Comparator.comparing(SchoolAssessment::deadlineDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(byCreated);
    }
}
