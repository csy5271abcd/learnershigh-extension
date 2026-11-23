package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.SchoolInfoClassificationRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSelectionRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSourcesResponse;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.SchoolInfoClassificationService;
import com.learnershigh.extension.assessment.service.plan.SchoolInfoSyncService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** §38-12 학교알리미 최근 3개 학년도 자동 확인 (A27-UX 부록 E). */
@RestController
@RequestMapping(path = "/api/admin/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminSchoolInfoSyncController {

    private final SchoolInfoSyncService service;
    private final SchoolInfoClassificationService classification;

    public AdminSchoolInfoSyncController(SchoolInfoSyncService service, SchoolInfoClassificationService classification) {
        this.service = service;
        this.classification = classification;
    }

    /** 작업 시작·진행 중이면 202, 기록만으로 답하면 200. */
    @PostMapping(path = "/schoolinfo-sync", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SchoolInfoSyncResponse> ensureSynced(AdminActor admin, @Valid @RequestBody SchoolInfoSyncRequest request) {
        SchoolInfoSyncService.Ensured r = service.ensureSynced(admin, request);
        return ResponseEntity.status(r.running() ? HttpStatus.ACCEPTED : HttpStatus.OK).body(r.body());
    }

    /** 읽기 전용 상태 조회. */
    @GetMapping(path = "/schoolinfo-sync/{jobId}")
    public SchoolInfoSyncResponse status(AdminActor admin, @PathVariable String jobId) {
        return service.status(admin, jobId);
    }

    /** §38-13 동명 학교 선택 (부록 F). 고른 학교 하나만 세 학년도를 다시 확인한다 → 202. */
    @PostMapping(path = "/schoolinfo-sync/school-selection", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SchoolInfoSyncResponse> selectSchool(AdminActor admin, @Valid @RequestBody SchoolInfoSelectionRequest request) {
        SchoolInfoSyncService.Ensured r = service.selectSchool(admin, request);
        return ResponseEntity.status(r.running() ? HttpStatus.ACCEPTED : HttpStatus.OK).body(r.body());
    }

    /** §38-14 확인되지 않은 원본·분류한 원본 목록 (읽기 전용). */
    @GetMapping(path = "/schoolinfo-sources")
    public SchoolInfoSourcesResponse sources(AdminActor admin, @RequestParam @NotBlank @Size(max = 64) String schoolId) {
        return classification.list(admin, schoolId);
    }

    /** §38-14 원본 내려받기 (관리자만). */
    @GetMapping(path = "/schoolinfo-sources/{sourceFileId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<byte[]> original(AdminActor admin, @PathVariable String sourceFileId,
            @RequestParam @NotBlank @Size(max = 64) String schoolId) {
        SchoolInfoClassificationService.Original o = classification.original(admin, schoolId, sourceFileId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, o.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(o.fileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(o.bytes());
    }

    /** §38-14 학년·학기 분류 (Revision + 칸 연결). */
    @PutMapping(path = "/schoolinfo-sources/{sourceFileId}/classification", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SchoolInfoSourcesResponse.Item classify(AdminActor admin, @PathVariable String sourceFileId,
            @Valid @RequestBody SchoolInfoClassificationRequest request) {
        return classification.classify(admin, sourceFileId, request);
    }
}
