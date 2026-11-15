package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.plan.AdminEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanComparisonResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanSubjectsResponse;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanReviewRequest;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanReviewResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanUploadResponse;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanService;
import com.learnershigh.extension.assessment.service.plan.PdfInspector;
import com.learnershigh.extension.assessment.service.plan.PlanAnalysisService;
import com.learnershigh.extension.assessment.service.plan.PlanComparisonQueryService;
import com.learnershigh.extension.assessment.service.plan.PlanReviewDraftService;
import com.learnershigh.extension.assessment.service.plan.TeachingPlanQueryService;
import com.learnershigh.extension.assessment.service.plan.TeachingPlanReviewService;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Admin 학교 평가계획서 (api-contract.md §38·§39). Actor: 평가계획서 운영 권한이 있는 ADMIN (OD-A08 미결 → 학교별 명시 권한만).
 * §39 POST .../analysis(서버 분석 실행)는 원본 파일 보관(File Storage, API-OD-A03)이 없어 아직 제공하지 않는다.
 */
@RestController
@RequestMapping(path = "/api/admin/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminEvaluationPlanController {

    private static final String URL_PATTERN = "https?://\\S{1,990}";

    private final EvaluationPlanQueryService queryService;
    private final EvaluationPlanService service;
    private final PlanAnalysisService analysisService;
    private final PlanReviewDraftService draftService;
    private final TeachingPlanReviewService teachingPlanService;
    private final TeachingPlanQueryService teachingPlanQueries;
    private final PlanComparisonQueryService comparisonService;

    public AdminEvaluationPlanController(EvaluationPlanQueryService queryService, EvaluationPlanService service,
            PlanAnalysisService analysisService, PlanReviewDraftService draftService,
            TeachingPlanReviewService teachingPlanService, TeachingPlanQueryService teachingPlanQueries,
            PlanComparisonQueryService comparisonService) {
        this.comparisonService = comparisonService;
        this.queryService = queryService;
        this.service = service;
        this.analysisService = analysisService;
        this.draftService = draftService;
        this.teachingPlanService = teachingPlanService;
        this.teachingPlanQueries = teachingPlanQueries;
    }

    @GetMapping
    public Map<String, List<AdminEvaluationPlanResponse>> list(AdminActor admin,
            @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade,
            @RequestParam(required = false) @Min(1) @Max(2) Integer semester) {
        return queryService.adminList(admin, schoolId, academicYear, grade, semester);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PlanUploadResponse register(AdminActor admin,
            @RequestPart("file") MultipartFile file,
            @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(3) int grade,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Pattern(regexp = URL_PATTERN) String sourceUrl) {
        return service.register(admin, schoolId, academicYear, grade, semester, uploaded(file, sourceUrl));
    }

    @GetMapping("/{planId}")
    public AdminEvaluationPlanResponse get(AdminActor admin, @PathVariable String planId) {
        return queryService.adminGet(admin, planId);
    }

    @PostMapping(path = "/{planId}/revisions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PlanUploadResponse addRevision(AdminActor admin, @PathVariable String planId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) @Pattern(regexp = URL_PATTERN) String sourceUrl) {
        return service.addRevision(admin, planId, uploaded(file, sourceUrl));
    }

    /** S-4: Revision 원문 내려받기(형식 그대로, attachment). 크기·SHA-256 재확인 후 내보낸다. */
    @GetMapping(path = "/{planId}/revisions/{revisionId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        return FileResponses.attachment(queryService.adminFile(admin, planId, revisionId, false));
    }

    /** S-4: 서비스 안 미리보기(inline). 현재 PDF 원문만, HWP·HWPX는 415 PREVIEW_UNAVAILABLE(변환 Rendition 없음). */
    @GetMapping(path = "/{planId}/revisions/{revisionId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        return FileResponses.inline(queryService.adminFile(admin, planId, revisionId, true));
    }

    /**
     * §39 POST 분석 실행 (A3): Backend가 보관한 원문을 분석기로 보내고 결과를 AnalysisRun으로 저장한다.
     * 새 Run이면 201, 같은 결과가 이미 있으면 200(새 Run 없음). 응답은 GET .../analysis와 같은 모양.
     */
    @PostMapping("/{planId}/revisions/{revisionId}/analysis")
    public ResponseEntity<PlanAnalysisResponse> runAnalysis(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        EvaluationPlanService.ImportResult result = analysisService.analyze(admin, planId, revisionId);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.analysis());
    }

    @GetMapping("/{planId}/revisions/{revisionId}/analysis")
    public PlanAnalysisResponse analysis(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        return queryService.adminAnalysis(admin, planId, revisionId);
    }

    @PutMapping(path = "/{planId}/revisions/{revisionId}/review", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PlanAnalysisResponse review(AdminActor admin, @PathVariable String planId, @PathVariable String revisionId,
            @Valid @RequestBody PlanReviewRequest request) {
        return service.review(admin, planId, revisionId, request);
    }

    /** A5 공유 검토 초안 조회 (DRAFT §39-4). 학생 공개 아님. 최신 분석 결과의 초안 + 예전 결과의 보존 초안 + 저장 기록. */
    @GetMapping("/{planId}/revisions/{revisionId}/review-draft")
    public PlanReviewDraftResponse reviewDraft(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        return draftService.get(admin, planId, revisionId);
    }

    /** A5 공유 검토 초안 저장 (DRAFT §39-4). baseVersion 불일치·다른 결과 → 409. 확정은 PUT .../review만 한다. */
    @PutMapping(path = "/{planId}/revisions/{revisionId}/review-draft", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PlanReviewDraftResponse saveReviewDraft(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId, @Valid @RequestBody PlanReviewDraftRequest request) {
        return draftService.save(admin, planId, revisionId, request);
    }

    /**
     * A7 §38-5 학년도별 평가계획서 비교 (관리자 확정값만). years 2~5개, subjects/plans는 "학년도:ID" 형식.
     * 과목은 학년도마다 관리자가 고른 ID로만 맞춘다(이름으로 자동 병합하지 않음). 학생 응답 아님.
     */
    @GetMapping("/comparison")
    public PlanComparisonResponse comparison(AdminActor admin, @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam @Min(1) @Max(3) int grade, @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam List<Integer> years,
            @RequestParam(required = false) List<String> subjects,
            @RequestParam(required = false) List<String> plans) {
        return comparisonService.compare(admin, schoolId, grade, semester, years, subjects, plans);
    }

    /** A7 §39-6 운영계획 공유 초안 조회. 평가 정보 초안과 별도 — 평가 정보 확정 뒤에도 쓴다. */
    @GetMapping("/{planId}/revisions/{revisionId}/teaching-plan-draft")
    public PlanReviewDraftResponse teachingPlanDraft(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        return draftService.getTeachingPlan(admin, planId, revisionId);
    }

    /** A7 §39-6 운영계획 공유 초안 저장. fieldPath는 teachingPlan[n]만. 운영계획 확정 뒤 409. */
    @PutMapping(path = "/{planId}/revisions/{revisionId}/teaching-plan-draft", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PlanReviewDraftResponse saveTeachingPlanDraft(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId, @Valid @RequestBody PlanReviewDraftRequest request) {
        return draftService.saveTeachingPlan(admin, planId, revisionId, request);
    }

    /** A6 §38-4: 문서 슬롯의 학업 과목 (검토 화면 과목 선택용, 확정 검증과 같은 원천). */
    @GetMapping("/{planId}/subjects")
    public PlanSubjectsResponse subjects(AdminActor admin, @PathVariable String planId) {
        return queryService.adminSubjects(admin, planId);
    }

    /** A6 월별 운영계획 확정 조회 (DRAFT §39-6). review=null이면 아직 확정 전. */
    @GetMapping("/{planId}/revisions/{revisionId}/teaching-plan-review")
    public TeachingPlanReviewResponse teachingPlanReview(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId) {
        return teachingPlanQueries.adminGet(admin, planId, revisionId);
    }

    /** A6 월별 운영계획 확정 (DRAFT §39-6). 평가 정보 확정과 별도. Revision당 1건(재확정 409). */
    @PutMapping(path = "/{planId}/revisions/{revisionId}/teaching-plan-review", consumes = MediaType.APPLICATION_JSON_VALUE)
    public TeachingPlanReviewResponse confirmTeachingPlan(AdminActor admin, @PathVariable String planId,
            @PathVariable String revisionId, @Valid @RequestBody TeachingPlanReviewRequest request) {
        return teachingPlanService.confirm(admin, planId, revisionId, request);
    }

    private static EvaluationPlanService.UploadedPdf uploaded(MultipartFile file, String sourceUrl) {
        if (file.getSize() > PdfInspector.MAX_BYTES) {
            throw new BusinessException(AssessmentErrorCode.FILE_TOO_LARGE);
        }
        try {
            return new EvaluationPlanService.UploadedPdf(safeName(file), file.getContentType(), file.getBytes(),
                    sourceUrl);
        } catch (IOException exception) {
            throw new BusinessException(AssessmentErrorCode.PDF_EXTRACTION_FAILED);
        }
    }

    /** 경로 제거·길이 제한한 파일 이름 */
    private static String safeName(MultipartFile file) {
        String name = file.getOriginalFilename() == null || file.getOriginalFilename().isBlank() ? "plan.pdf"
                : file.getOriginalFilename();
        name = name.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        // 제어 문자(줄바꿈 등)는 Content-Disposition·로그에 섞이지 않게 바꾼다
        name = name.replaceAll("\\p{Cntrl}", "_");
        return name.length() > 200 ? name.substring(0, 200) : name;
    }
}
