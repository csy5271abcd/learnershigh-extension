package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.SchoolDirectorySearchResponse;
import com.learnershigh.extension.assessment.dto.plan.SchoolDirectorySelectionRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolDirectorySelectionResponse;
import com.learnershigh.extension.assessment.dto.plan.SchoolSearchResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.SchoolDirectoryService;
import com.learnershigh.extension.assessment.service.plan.SchoolSearchQueryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/admin/assessment/schools (A5 DRAFT §38-3): 평가계획서가 등록된 학교 검색. 전체 학교 목록이 아니다(coverage로 표시).
 * 부록 O §38-15: /directory — 학교알리미 공식 학교 검색(평가계획서 0건 학교 포함)·선택.
 */
@RestController
@RequestMapping(path = "/api/admin/assessment/schools", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminAssessmentSchoolController {

    private final SchoolSearchQueryService service;
    private final SchoolDirectoryService directory;

    public AdminAssessmentSchoolController(SchoolSearchQueryService service, SchoolDirectoryService directory) {
        this.service = service;
        this.directory = directory;
    }

    @GetMapping
    public SchoolSearchResponse search(AdminActor admin, @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit) {
        return service.search(admin, query, limit);
    }

    /** §38-15 학교알리미 공식 학교 검색(읽기 전용, 외부 검색은 서버가 상한·캐시). */
    @GetMapping("/directory")
    public SchoolDirectorySearchResponse directorySearch(AdminActor admin, @RequestParam @Size(max = 100) String query,
            @RequestParam(defaultValue = "false") boolean refresh) {
        return directory.search(admin, query, refresh);
    }

    /** §38-15 검색 후보 선택 → 그 학교의 3개 학년도 자동 확인 시작(진행 중이면 202). */
    @PostMapping(path = "/directory/selection", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SchoolDirectorySelectionResponse> directorySelect(AdminActor admin,
            @Valid @RequestBody SchoolDirectorySelectionRequest request) {
        SchoolDirectoryService.Selected s = directory.select(admin, request.candidateId());
        return ResponseEntity.status(s.running() ? HttpStatus.ACCEPTED : HttpStatus.OK).body(s.body());
    }
}
