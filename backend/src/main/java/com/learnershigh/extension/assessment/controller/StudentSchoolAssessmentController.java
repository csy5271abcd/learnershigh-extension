package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.context.AcademicContextResponse;
import com.learnershigh.extension.assessment.dto.school.ChangeStatusRequest;
import com.learnershigh.extension.assessment.dto.school.ChangeStatusResponse;
import com.learnershigh.extension.assessment.dto.school.CreateSchoolAssessmentRequest;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentListQuery;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.dto.school.UpdateSchoolAssessmentRequest;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.school.AcademicContextQueryService;
import com.learnershigh.extension.assessment.service.school.StudentMeQueryService;
import com.learnershigh.extension.assessment.service.school.OfficialAssessmentSyncService;
import com.learnershigh.extension.assessment.service.school.SchoolAssessmentQueryService;
import com.learnershigh.extension.assessment.service.school.SchoolAssessmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Student 학업 정보·학교 수행평가 API (api-contract.md §9-1, §12, §13). Actor: STUDENT.
 * 소유 학생은 인증 Actor에서만 정한다. §12 DELETE는 휴지통·복원 정책(OD-A11 / API-OD-A08) 미결이라 제공하지 않는다.
 */
@RestController
@RequestMapping(path = "/api/student/assessment", produces = MediaType.APPLICATION_JSON_VALUE)
public class StudentSchoolAssessmentController {

    private final SchoolAssessmentQueryService queryService;
    private final SchoolAssessmentService service;
    private final AcademicContextQueryService contextService;
    private final StudentMeQueryService meService;
    private final OfficialAssessmentSyncService officialSync;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(StudentSchoolAssessmentController.class);

    public StudentSchoolAssessmentController(SchoolAssessmentQueryService queryService,
            SchoolAssessmentService service, AcademicContextQueryService contextService, StudentMeQueryService meService,
            OfficialAssessmentSyncService officialSync) {
        this.officialSync = officialSync;
        this.queryService = queryService;
        this.service = service;
        this.contextService = contextService;
        this.meService = meService;
    }

    /** A28-12 학생 본인 표시 이름(api-contract.md §9-0) */
    @GetMapping("/me")
    public com.learnershigh.extension.assessment.dto.context.StudentMeResponse me(StudentActor student) {
        return meService.get(student);
    }

    @GetMapping("/academic-context")
    public AcademicContextResponse academicContext(StudentActor student,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(2) int semester) {
        return contextService.get(student, academicYear, semester);
    }

    /** A28-29 §9-1-c 학적이 있는 학기 목록(현재 학년도와 앞 두 학년도) */
    @GetMapping("/academic-terms")
    public com.learnershigh.extension.assessment.dto.context.AcademicTermsResponse academicTerms(StudentActor student) {
        return contextService.terms(student);
    }

    @GetMapping("/school-assessments")
    public PageResponse<SchoolAssessmentResponse> list(StudentActor student,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Size(max = 64) String subjectId,
            @RequestParam(required = false) @Pattern(regexp = "BEFORE_START|IN_PROGRESS|COMPLETED") String status,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(required = false, defaultValue = SchoolAssessmentListQuery.SORT_DEADLINE)
            @Pattern(regexp = "deadlineDate,asc|createdAt,desc|title,asc") String sort,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        // A28-20 §12-c: 목록 조회 전 학교 확정 수행평가 보완 등록(멱등 — 이미 있으면 0건). 실패해도 목록은 그대로 보인다
        try {
            officialSync.syncStudentOnRead(student.studentId(), academicYear, semester);
        } catch (RuntimeException e) {
            log.warn("official assessment sync on read failed student={} term={}-{} cause={}", student.studentId(), academicYear,
                    semester, e.getClass().getSimpleName());
        }
        return queryService.list(student,
                new SchoolAssessmentListQuery(academicYear, semester, subjectId, status, query, sort, page, size));
    }

    @PostMapping(path = "/school-assessments", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public SchoolAssessmentResponse create(StudentActor student,
            @Valid @RequestBody CreateSchoolAssessmentRequest request) {
        return service.create(student, request);
    }

    @GetMapping("/school-assessments/{assessmentId}")
    public SchoolAssessmentResponse get(StudentActor student, @PathVariable String assessmentId) {
        return queryService.get(student, assessmentId);
    }

    @PatchMapping(path = "/school-assessments/{assessmentId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SchoolAssessmentResponse update(StudentActor student, @PathVariable String assessmentId,
            @RequestBody Map<String, Object> body) {
        return service.update(student, assessmentId, UpdateSchoolAssessmentRequest.from(body));
    }

    @PatchMapping(path = "/school-assessments/{assessmentId}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ChangeStatusResponse changeStatus(StudentActor student, @PathVariable String assessmentId,
            @Valid @RequestBody ChangeStatusRequest request) {
        return service.changeStatus(student, assessmentId, request.status());
    }
}
