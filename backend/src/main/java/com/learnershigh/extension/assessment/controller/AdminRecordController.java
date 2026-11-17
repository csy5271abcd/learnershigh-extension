package com.learnershigh.extension.assessment.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import com.learnershigh.extension.assessment.service.record.TrashService;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.TrashedScrap;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactComparison;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.AdminArtifact;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.AdminArtifactVersion;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.AdminFeedbackDetail;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.AdminFeedbackRequest;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.DeliveredResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.DraftSavedResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.ReplyDraftRequest;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.AdminNote;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.GrowthDtos.GrowthRecordResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ReferenceScrapResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.VisibilityRequest;
import com.learnershigh.extension.assessment.service.record.AdminStudentQueryService;
import com.learnershigh.extension.assessment.service.record.AdminStudentQueryService.StudentAssessment;
import com.learnershigh.extension.assessment.service.record.AdminStudentQueryService.StudentDetail;
import com.learnershigh.extension.assessment.service.record.AdminStudentQueryService.StudentSummary;
import com.learnershigh.extension.assessment.service.record.ArtifactQueryService;
import com.learnershigh.extension.assessment.service.record.GrowthRecordService;
import com.learnershigh.extension.assessment.service.record.ResourceService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import tools.jackson.databind.JsonNode;
import com.learnershigh.extension.assessment.service.record.FeedbackQueryService;
import com.learnershigh.extension.assessment.service.record.FeedbackService;
import com.learnershigh.extension.assessment.service.record.NoteQueryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin 학생 기록 읽기·피드백 API (api-contract.md §35·36·26·44·45). Actor: ADMIN(담당 지점 학생만).
 * 학생 원본(노트·결과물)을 바꾸는 API는 없다. 쓰기는 피드백 초안·전달뿐이다.
 */
@RestController
@RequestMapping(path = "/api/admin/assessment", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminRecordController {

    private final NoteQueryService noteQuery;
    private final ArtifactQueryService artifactQuery;
    private final FeedbackQueryService feedbackQuery;
    private final FeedbackService feedbackService;
    private final AdminStudentQueryService studentQuery;
    private final GrowthRecordService growthService;
    private final ResourceService resourceService;
    private final TrashService trashService;

    public AdminRecordController(NoteQueryService noteQuery, ArtifactQueryService artifactQuery,
            FeedbackQueryService feedbackQuery, FeedbackService feedbackService, AdminStudentQueryService studentQuery,
            GrowthRecordService growthService, ResourceService resourceService, TrashService trashService) {
        this.trashService = trashService;
        this.studentQuery = studentQuery;
        this.growthService = growthService;
        this.resourceService = resourceService;
        this.noteQuery = noteQuery;
        this.artifactQuery = artifactQuery;
        this.feedbackQuery = feedbackQuery;
        this.feedbackService = feedbackService;
    }

    @GetMapping("/students/{studentId}/notes")
    public ItemsResponse<AdminNote> notes(AdminActor admin, @PathVariable String studentId,
            @RequestParam @NotBlank @Size(max = 30) String sourceType,
            @RequestParam @NotBlank @Size(max = 64) String sourceId) {
        return noteQuery.listForAdmin(admin, studentId, sourceType, sourceId);
    }

    @GetMapping("/students/{studentId}/artifacts")
    public ItemsResponse<AdminArtifact> artifacts(AdminActor admin, @PathVariable String studentId,
            @RequestParam @NotBlank @Size(max = 30) String sourceType,
            @RequestParam @NotBlank @Size(max = 64) String sourceId) {
        return artifactQuery.listForAdmin(admin, studentId, sourceType, sourceId);
    }

    @GetMapping("/artifacts/{artifactId}/versions")
    public ItemsResponse<AdminArtifactVersion> versions(AdminActor admin, @PathVariable String artifactId) {
        return artifactQuery.versionsForAdmin(admin, artifactId);
    }

    @GetMapping(path = "/artifacts/{artifactId}/versions/{versionId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(AdminActor admin, @PathVariable String artifactId,
            @PathVariable String versionId) {
        return FileResponses.inline(artifactQuery.previewForAdmin(admin, artifactId, versionId));
    }

    @GetMapping("/artifacts/{artifactId}/compare")
    public ArtifactComparison compare(AdminActor admin, @PathVariable String artifactId,
            @RequestParam @NotBlank @Size(max = 64) String fromVersionId,
            @RequestParam @NotBlank @Size(max = 64) String toVersionId) {
        return artifactQuery.compareForAdmin(admin, artifactId, fromVersionId, toVersionId);
    }

    @GetMapping(path = "/artifacts/{artifactId}/versions/{versionId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(AdminActor admin, @PathVariable String artifactId,
            @PathVariable String versionId) {
        return FileResponses.attachment(artifactQuery.downloadForAdmin(admin, artifactId, versionId));
    }

    @GetMapping("/feedback-requests")
    public ItemsResponse<AdminFeedbackRequest> feedbackRequests(AdminActor admin,
            @RequestParam(required = false) @Pattern(regexp = "PENDING|DELIVERED") String status,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(required = false) @Size(max = 64) String studentId,
            @RequestParam(required = false) @Size(max = 64) String sourceId) {
        return feedbackQuery.listForAdmin(admin, status, query, studentId, sourceId);
    }

    @GetMapping("/feedback-requests/{requestId}")
    public AdminFeedbackDetail feedbackRequest(AdminActor admin, @PathVariable String requestId) {
        return feedbackQuery.detailForAdmin(admin, requestId);
    }

    @PutMapping(path = "/feedback-requests/{requestId}/reply-draft", consumes = MediaType.APPLICATION_JSON_VALUE)
    public DraftSavedResponse saveDraft(AdminActor admin, @PathVariable String requestId,
            @Valid @RequestBody ReplyDraftRequest draft) {
        return feedbackService.saveDraft(admin, requestId, draft);
    }

    @PostMapping(path = "/feedback-requests/{requestId}/deliver", consumes = MediaType.APPLICATION_JSON_VALUE)
    public DeliveredResponse deliver(AdminActor admin, @PathVariable String requestId,
            @Valid @RequestBody ReplyDraftRequest draft) {
        return feedbackService.deliver(admin, requestId, draft);
    }

    // ---- §34 학생 목록·상세·성장 기록 ----

    @GetMapping("/students")
    public ItemsResponse<StudentSummary> students(AdminActor admin,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Size(max = 100) String query) {
        return studentQuery.list(admin, academicYear, semester, query);
    }

    @GetMapping("/students/{studentId}")
    public StudentDetail student(AdminActor admin, @PathVariable String studentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear) {
        return studentQuery.detail(admin, studentId, academicYear);
    }

    @GetMapping("/students/{studentId}/school-assessments/{assessmentId}")
    public StudentAssessment studentAssessment(AdminActor admin, @PathVariable String studentId,
            @PathVariable String assessmentId) {
        return studentQuery.assessment(admin, studentId, assessmentId);
    }

    @GetMapping("/students/{studentId}/growth-records")
    public ItemsResponse<GrowthRecordResponse> growthRecords(AdminActor admin, @PathVariable String studentId) {
        return growthService.listForAdmin(admin, studentId);
    }

    // ---- §43 참고자료실 (기본 비공개, 공개한 자료만 학생 조회) ----

    @GetMapping("/reference-library")
    public PageResponse<ReferenceScrapResponse> library(AdminActor admin,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(required = false) @Size(max = 50) String type,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return resourceService.adminList(admin, query, type, page, size);
    }

    @PostMapping(path = "/reference-library", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ReferenceScrapResponse createScrap(AdminActor admin, @RequestBody JsonNode body) {
        return resourceService.adminCreate(admin, body);
    }

    @GetMapping("/reference-library/trash")
    public ItemsResponse<TrashedScrap> scrapTrash(AdminActor admin) {
        return resourceService.adminTrash(trashService.trashedScraps(admin));
    }

    /** §43 DELETE: 소프트 삭제(휴지통). 만든 관리자만. 공개 중이면 학생 공개 목록에서도 빠진다 */
    @DeleteMapping("/reference-library/{scrapId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trashScrap(AdminActor admin, @PathVariable String scrapId) {
        trashService.trashScrap(admin, scrapId);
    }

    @PostMapping("/reference-library/{scrapId}/restore")
    public ReferenceScrapResponse restoreScrap(AdminActor admin, @PathVariable String scrapId) {
        trashService.restoreScrap(admin, scrapId);
        return resourceService.adminGet(admin, scrapId);
    }

    @GetMapping("/reference-library/{scrapId}")
    public ReferenceScrapResponse scrap(AdminActor admin, @PathVariable String scrapId) {
        return resourceService.adminGet(admin, scrapId);
    }

    @PatchMapping(path = "/reference-library/{scrapId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ReferenceScrapResponse updateScrap(AdminActor admin, @PathVariable String scrapId,
            @RequestBody JsonNode body) {
        return resourceService.adminUpdate(admin, scrapId, body);
    }

    @PutMapping(path = "/reference-library/{scrapId}/visibility", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ReferenceScrapResponse visibility(AdminActor admin, @PathVariable String scrapId,
            @RequestBody VisibilityRequest request) {
        return resourceService.setPublished(admin, scrapId, request.published());
    }
}
