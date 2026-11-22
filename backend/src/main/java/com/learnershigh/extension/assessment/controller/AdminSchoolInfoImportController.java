package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.SchoolInfoImportRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoImportResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.SchoolInfoImportService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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

    /** 받기·등록 후 202 + 작업 번호. 분석은 서버가 차례로 돌린다. */
    @PostMapping(path = "/import-from-schoolinfo", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SchoolInfoImportResponse importFromSchoolInfo(AdminActor admin, @Valid @RequestBody SchoolInfoImportRequest request) {
        return service.importFromSchoolInfo(admin, request);
    }

    /** 불러오기 진행 상황 (화면 진행바). */
    @GetMapping(path = "/import-from-schoolinfo/{jobId}")
    public SchoolInfoImportResponse status(AdminActor admin, @PathVariable String jobId) {
        return service.status(admin, jobId);
    }
}
