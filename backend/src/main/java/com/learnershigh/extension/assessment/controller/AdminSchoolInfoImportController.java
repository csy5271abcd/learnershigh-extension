package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.SchoolInfoImportRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoImportResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.SchoolInfoImportService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 학교 이름으로 평가계획서 불러오기 (학교알리미 → 등록 → 서버 분석). Actor: 평가계획서 운영 권한이 있는 ADMIN. */
@RestController
@RequestMapping(path = "/api/admin/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminSchoolInfoImportController {

    private final SchoolInfoImportService service;

    public AdminSchoolInfoImportController(SchoolInfoImportService service) {
        this.service = service;
    }

    @PostMapping(path = "/import-from-schoolinfo", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SchoolInfoImportResponse importFromSchoolInfo(AdminActor admin, @Valid @RequestBody SchoolInfoImportRequest request) {
        return service.importFromSchoolInfo(admin, request);
    }
}
