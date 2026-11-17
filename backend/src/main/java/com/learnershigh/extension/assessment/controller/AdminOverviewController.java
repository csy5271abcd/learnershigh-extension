package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.record.AdminOverviewResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.record.AdminOverviewQueryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** §33 Admin Assessment 현황 (A12 구현). 수치는 요청 시점 DB 계산값이다. */
@Validated
@RestController
@RequestMapping(path = "/api/admin/assessment", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminOverviewController {

    private final AdminOverviewQueryService overview;

    public AdminOverviewController(AdminOverviewQueryService overview) {
        this.overview = overview;
    }

    @GetMapping("/overview")
    public AdminOverviewResponse overview(AdminActor admin,
            @RequestParam(required = false) @Size(max = 64) String schoolId,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Min(1) @Max(2) Integer semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return overview.overview(admin, blankToNull(schoolId), academicYear, semester, grade);
    }

    /** A13 §33-1 관리자 담당 학생의 학교(전체 학교 Master 아님). */
    @GetMapping("/managed-schools")
    public AdminOverviewResponse.ManagedSchools managedSchools(AdminActor admin,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Min(1) @Max(2) Integer semester) {
        return overview.managedSchools(admin, academicYear, semester);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
