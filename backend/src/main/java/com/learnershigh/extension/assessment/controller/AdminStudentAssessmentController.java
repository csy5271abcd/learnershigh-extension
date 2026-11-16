package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.school.SchoolAssessmentQueryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin 학생 Assessment 읽기 (api-contract.md §34). Actor: ADMIN. GET만 제공한다(학생 원본 수정 API 없음).
 * 학생 목록(§34 GET /students)과 학생 상세는 응답 Shape이 계약에 없어 구현하지 않았다 (계약 보완 대상).
 */
@RestController
@RequestMapping(path = "/api/admin/assessment/students", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminStudentAssessmentController {

    private final SchoolAssessmentQueryService queryService;

    public AdminStudentAssessmentController(SchoolAssessmentQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/{studentId}/school-assessments")
    public PageResponse<SchoolAssessmentResponse> schoolAssessments(AdminActor admin, @PathVariable String studentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return queryService.listForAdmin(admin, studentId, academicYear, semester, page, size);
    }
}
