package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.SchoolSearchResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.SchoolSearchQueryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/admin/assessment/schools (A5 DRAFT §38-3): 평가계획서가 등록된 학교 검색. 전체 학교 목록이 아니다(coverage로 표시). */
@RestController
@RequestMapping(path = "/api/admin/assessment/schools", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminAssessmentSchoolController {

    private final SchoolSearchQueryService service;

    public AdminAssessmentSchoolController(SchoolSearchQueryService service) {
        this.service = service;
    }

    @GetMapping
    public SchoolSearchResponse search(AdminActor admin, @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return service.search(admin, query, limit);
    }
}
