package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.ai.AiAnalysisResponse;
import com.learnershigh.extension.assessment.dto.ai.AiProviderStatusResponse;
import com.learnershigh.extension.assessment.dto.ai.MockExamAnalysisRequest;
import com.learnershigh.extension.assessment.exception.AssessmentAiErrorCode;
import com.learnershigh.extension.assessment.service.ai.AssessmentAiService;
import com.learnershigh.extension.assessment.service.ai.PdfTextExtractor;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Admin Assessment AI 분석 API (api-contract.md §47-A PROPOSED, P-31). Actor: ADMIN.
 * 인증·관리자 권한 검증은 기존 LearnersHigh 인증 연동 전이라 아직 없다 (Open Decision: Existing Authentication).
 * 그래서 Provider는 기본으로 꺼져 있고(assessment.ai.provider=none), 운영 배포 전 인증 연결이 필수다.
 * Controller는 입력 Shape 검증과 Service 호출만 한다. 파일은 서버가 받은 바이트만 쓰고 URL을 내려받지 않는다.
 */
@RestController
@Validated
@RequestMapping(path = "/api/admin/assessment/ai", produces = MediaType.APPLICATION_JSON_VALUE)
public class AssessmentAiController {

    private final AssessmentAiService service;

    public AssessmentAiController(AssessmentAiService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public AiProviderStatusResponse status() {
        return service.status();
    }

    @PostMapping(path = "/evaluation-plan-analyses", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AiAnalysisResponse<?> evaluationPlan(
            @RequestHeader(name = "Idempotency-Key", required = false) @Size(max = 100) String idempotencyKey,
            @RequestPart("file") MultipartFile file,
            @RequestParam(name = "hint", required = false) @Size(max = 200) String hint) {
        return service.analyzeEvaluationPlan(idempotencyKey, safeName(file), bytes(file), hint);
    }

    @PostMapping(path = "/university-exam-analyses", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AiAnalysisResponse<?> universityExam(
            @RequestHeader(name = "Idempotency-Key", required = false) @Size(max = 100) String idempotencyKey,
            @RequestPart("file") MultipartFile file,
            @RequestParam(name = "hint", required = false) @Size(max = 200) String hint) {
        return service.analyzeUniversityExam(idempotencyKey, safeName(file), bytes(file), hint);
    }

    @PostMapping(path = "/mock-exam-analyses", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AiAnalysisResponse<?> mockExam(
            @RequestHeader(name = "Idempotency-Key", required = false) @Size(max = 100) String idempotencyKey,
            @Valid @RequestBody MockExamAnalysisRequest request) {
        return service.analyzeMockExam(idempotencyKey, request);
    }

    private static byte[] bytes(MultipartFile file) {
        if (file.getSize() > PdfTextExtractor.MAX_BYTES) throw new BusinessException(AssessmentAiErrorCode.FILE_TOO_LARGE);
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new BusinessException(AssessmentAiErrorCode.PDF_EXTRACTION_FAILED);
        }
    }

    /** 응답에 되돌려 줄 파일 이름 (경로 제거·길이 제한) */
    private static String safeName(MultipartFile file) {
        String name = file.getOriginalFilename() == null ? "upload.pdf" : file.getOriginalFilename();
        name = name.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        return name.length() > 120 ? name.substring(0, 120) : name;
    }
}
