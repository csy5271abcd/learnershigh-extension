package com.learnershigh.extension.studentcare.controller;

import com.learnershigh.extension.studentcare.dto.BranchListResponse;
import com.learnershigh.extension.studentcare.dto.CareBoardResponse;
import com.learnershigh.extension.studentcare.dto.CareCaseResponse;
import com.learnershigh.extension.studentcare.dto.CareDecisionRequest;
import com.learnershigh.extension.studentcare.dto.CareEventResponse;
import com.learnershigh.extension.studentcare.dto.CareNoteRequest;
import com.learnershigh.extension.studentcare.dto.CareSettingsRequest;
import com.learnershigh.extension.studentcare.dto.CareSettingsResponse;
import com.learnershigh.extension.studentcare.dto.CareSummaryResponse;
import com.learnershigh.extension.studentcare.dto.OpenCareCaseRequest;
import com.learnershigh.extension.studentcare.dto.StudentCareDetailResponse;
import com.learnershigh.extension.studentcare.dto.StudentHistoryResponse;
import com.learnershigh.extension.studentcare.service.StudentCareQueryService;
import com.learnershigh.extension.studentcare.service.StudentCareService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin 학생 케어 API (api-contract.md §65). Actor: ADMIN. */
@RestController
@RequestMapping("/api/admin/student-care")
public class StudentCareController {

    private final StudentCareQueryService queryService;
    private final StudentCareService service;

    public StudentCareController(StudentCareQueryService queryService, StudentCareService service) {
        this.queryService = queryService;
        this.service = service;
    }

    @GetMapping("/branches")
    public BranchListResponse branches() {
        return queryService.branches();
    }

    @GetMapping("/board")
    public CareBoardResponse board(@RequestParam @NotBlank String branchId) {
        return queryService.board(branchId);
    }

    @GetMapping("/students/{studentId}")
    public StudentCareDetailResponse detail(@PathVariable String studentId, @RequestParam @NotBlank String branchId) {
        return queryService.detail(branchId, studentId);
    }

    @GetMapping("/students/{studentId}/history")
    public StudentHistoryResponse history(@PathVariable String studentId, @RequestParam @NotBlank String branchId) {
        return queryService.history(branchId, studentId);
    }

    @PostMapping("/cases")
    @ResponseStatus(HttpStatus.CREATED)
    public CareCaseResponse open(@Valid @RequestBody OpenCareCaseRequest request) {
        return service.open(request);
    }

    @PostMapping("/cases/{caseId}/decisions")
    public CareCaseResponse decide(@PathVariable String caseId, @Valid @RequestBody CareDecisionRequest request) {
        return service.decide(caseId, request);
    }

    @PostMapping("/cases/{caseId}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public CareEventResponse addNote(@PathVariable String caseId, @Valid @RequestBody CareNoteRequest request) {
        return service.addNote(caseId, request);
    }

    @GetMapping("/settings")
    public CareSettingsResponse settings(@RequestParam @NotBlank String branchId) {
        return queryService.settings(branchId);
    }

    @PutMapping("/settings")
    public CareSettingsResponse updateSettings(@RequestParam @NotBlank String branchId,
            @Valid @RequestBody CareSettingsRequest request) {
        return service.updateSettings(branchId, request);
    }

    @GetMapping("/summary")
    public CareSummaryResponse summary(@RequestParam @NotBlank String branchId) {
        return queryService.summary(branchId);
    }
}
