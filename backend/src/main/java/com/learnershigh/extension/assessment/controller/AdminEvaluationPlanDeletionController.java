package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.PlanDeleteResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanDeletionService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 평가계획서 문서 삭제 (A25 · api-contract.md §38-9 DRAFT). 논리 삭제 — 규칙은 {@link EvaluationPlanDeletionService}.
 * <pre>DELETE /api/admin/assessment/evaluation-plans/{planId}?schoolId=…&amp;confirmPublished=true|false</pre>
 */
@RestController
@Validated
@RequestMapping(path = "/api/admin/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminEvaluationPlanDeletionController {

    private final EvaluationPlanDeletionService service;

    public AdminEvaluationPlanDeletionController(EvaluationPlanDeletionService service) {
        this.service = service;
    }

    @DeleteMapping("/{planId}")
    public PlanDeleteResponse delete(AdminActor admin, @PathVariable String planId,
            @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam(defaultValue = "false") boolean confirmPublished) {
        return service.delete(admin, planId, schoolId, confirmPublished);
    }
}
