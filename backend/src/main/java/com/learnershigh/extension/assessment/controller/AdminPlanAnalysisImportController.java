package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.AnalysisImportParser;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 외부 평가계획서 분석 결과 수신 (PROPOSED — api-contract.md 미반영, 승인 전).
 * assessment.analysis-import.enabled=true 일 때만 등록된다(기본 false → 404). 결과는 후보로만 저장하고 검토 상태를 바꾸지 않는다.
 * 같은 Revision에 같은 내용을 다시 보내면 새로 만들지 않고 200으로 기존 결과를 돌려준다(처음은 201).
 */
@RestController
@ConditionalOnProperty(name = "assessment.analysis-import.enabled", havingValue = "true")
@RequestMapping(path = "/api/admin/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminPlanAnalysisImportController {

    private final EvaluationPlanService service;
    private final AnalysisImportParser parser;

    public AdminPlanAnalysisImportController(EvaluationPlanService service, AnalysisImportParser parser) {
        this.service = service;
        this.parser = parser;
    }

    @PostMapping(path = "/{planId}/revisions/{revisionId}/analysis-imports", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<PlanAnalysisResponse> importAnalysis(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId, @RequestBody String body) {
        EvaluationPlanService.ImportResult result = service.importAnalysis(admin, planId, revisionId,
                parser.parse(body));
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.analysis());
    }
}
