package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.StudentEvaluationPlanResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Student 공통 평가계획서 조회 (api-contract.md §10-1) + 공개(확정)된 원문 열람(S-4, 2026-11-13). Actor: STUDENT.
 * §10-2 개인 업로드·§11 분석/개인 정정은 File Storage(API-OD-A03)와 학생 PDF 외부 전송 조건(OD-A13) 미결로 제공하지 않는다.
 */
@RestController
@RequestMapping(path = "/api/student/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class StudentEvaluationPlanController {

    private final EvaluationPlanQueryService queryService;

    public StudentEvaluationPlanController(EvaluationPlanQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public Map<String, List<StudentEvaluationPlanResponse>> list(StudentActor student,
            @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(3) int grade,
            @RequestParam @Min(1) @Max(2) int semester) {
        return queryService.studentList(student, schoolId, academicYear, grade, semester);
    }

    @GetMapping("/{planId}")
    public StudentEvaluationPlanResponse get(StudentActor student, @PathVariable String planId) {
        return queryService.studentGet(student, planId);
    }

    /** S-4: 공개(확정)된 Revision 원문 내려받기. 자기 슬롯이 아니거나 미확정이면 404. */
    @GetMapping(path = "/{planId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(StudentActor student, @PathVariable String planId) {
        return FileResponses.attachment(queryService.studentFile(student, planId, false));
    }

    /** S-4: 공개(확정)된 Revision 미리보기(inline, PDF만). */
    @GetMapping(path = "/{planId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(StudentActor student, @PathVariable String planId) {
        return FileResponses.inline(queryService.studentFile(student, planId, true));
    }
}
