package com.learnershigh.extension.assessment.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import com.learnershigh.extension.assessment.service.record.TrashService;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.RestoreRequest;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactComparison;
import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactVersionResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.CreateArtifactRequest;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.CreateFeedbackRequestBody;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackReplyResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackRequestResponse;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.CreateNoteRequest;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteRevisionDetail;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteRevisionSummary;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.SaveNoteResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.UpdateNoteRequest;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.dto.record.GrowthDtos.GrowthRecordResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ArchiveItem;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.FavoriteRequest;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.SharedResourceResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.StudentResourceResponse;
import com.learnershigh.extension.assessment.service.record.ArchiveService;
import com.learnershigh.extension.assessment.service.record.ArtifactQueryService;
import com.learnershigh.extension.assessment.service.record.GrowthRecordService;
import com.learnershigh.extension.assessment.service.record.ResourceFileService;
import com.learnershigh.extension.assessment.service.record.ResourceService;
import org.springframework.web.bind.annotation.PatchMapping;
import tools.jackson.databind.JsonNode;
import com.learnershigh.extension.assessment.service.record.ArtifactService;
import com.learnershigh.extension.assessment.service.record.FeedbackQueryService;
import com.learnershigh.extension.assessment.service.record.FeedbackService;
import com.learnershigh.extension.assessment.service.record.NoteQueryService;
import com.learnershigh.extension.assessment.service.record.NoteService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.io.UncheckedIOException;
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
 * Student 학생 기록 API (api-contract.md §20·21 노트, §22 자료함, §24·25·26 결과물, §29 성장 기록, §30 보관함, §31·32 피드백). Actor: STUDENT.
 * 소유 학생은 인증 Actor에서만 정한다. 삭제 API는 삭제·보존 정책(OD-A11) 미결이라 두지 않는다.
 */
@RestController
@RequestMapping(path = "/api/student/assessment", produces = MediaType.APPLICATION_JSON_VALUE)
public class StudentRecordController {

    private final NoteService noteService;
    private final NoteQueryService noteQuery;
    private final ArtifactService artifactService;
    private final ArtifactQueryService artifactQuery;
    private final FeedbackService feedbackService;
    private final FeedbackQueryService feedbackQuery;
    private final GrowthRecordService growthService;
    private final ResourceService resourceService;
    private final ArchiveService archiveService;
    private final TrashService trashService;
    private final ResourceFileService resourceFileService;

    public StudentRecordController(NoteService noteService, NoteQueryService noteQuery,
            ArtifactService artifactService, ArtifactQueryService artifactQuery, FeedbackService feedbackService,
            FeedbackQueryService feedbackQuery, GrowthRecordService growthService, ResourceService resourceService,
            ArchiveService archiveService, TrashService trashService, ResourceFileService resourceFileService) {
        this.trashService = trashService;
        this.resourceFileService = resourceFileService;
        this.growthService = growthService;
        this.resourceService = resourceService;
        this.archiveService = archiveService;
        this.noteService = noteService;
        this.noteQuery = noteQuery;
        this.artifactService = artifactService;
        this.artifactQuery = artifactQuery;
        this.feedbackService = feedbackService;
        this.feedbackQuery = feedbackQuery;
    }

    // ---- §20·21 노트 ----

    @GetMapping("/notes")
    public ItemsResponse<NoteResponse> notes(StudentActor student,
            @RequestParam @NotBlank @Size(max = 30) String sourceType,
            @RequestParam @NotBlank @Size(max = 64) String sourceId) {
        return noteQuery.list(student, sourceType, sourceId);
    }

    @PostMapping(path = "/notes", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public SaveNoteResponse createNote(StudentActor student, @Valid @RequestBody CreateNoteRequest request) {
        return noteService.create(student, request);
    }

    @PutMapping(path = "/notes/{noteId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public SaveNoteResponse updateNote(StudentActor student, @PathVariable String noteId,
            @Valid @RequestBody UpdateNoteRequest request) {
        return noteService.update(student, noteId, request);
    }

    @GetMapping("/notes/{noteId}/revisions")
    public ItemsResponse<NoteRevisionSummary> revisions(StudentActor student, @PathVariable String noteId) {
        return noteQuery.revisions(student, noteId);
    }

    @GetMapping("/notes/{noteId}/revisions/{revisionId}")
    public NoteRevisionDetail revision(StudentActor student, @PathVariable String noteId,
            @PathVariable String revisionId) {
        return noteQuery.revision(student, noteId, revisionId);
    }

    // ---- §24·25·26 결과물 ----

    @GetMapping("/artifacts")
    public ItemsResponse<ArtifactResponse> artifacts(StudentActor student,
            @RequestParam @NotBlank @Size(max = 30) String sourceType,
            @RequestParam @NotBlank @Size(max = 64) String sourceId) {
        return artifactQuery.list(student, sourceType, sourceId);
    }

    @PostMapping(path = "/artifacts", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ArtifactResponse createArtifact(StudentActor student, @Valid @RequestBody CreateArtifactRequest request) {
        return artifactService.create(student, request);
    }

    @GetMapping("/artifacts/{artifactId}/versions")
    public ItemsResponse<ArtifactVersionResponse> versions(StudentActor student, @PathVariable String artifactId) {
        return artifactQuery.versions(student, artifactId);
    }

    @PostMapping(path = "/artifacts/{artifactId}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ArtifactVersionResponse upload(StudentActor student, @PathVariable String artifactId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) @Size(max = 1000) String changeNote,
            @RequestParam(required = false) @Size(max = 64) String expectedLatestVersionId) {
        return artifactService.upload(student, artifactId, file.getOriginalFilename(), bytes(file), changeNote,
                expectedLatestVersionId);
    }

    @GetMapping(path = "/artifacts/{artifactId}/versions/{versionId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(StudentActor student, @PathVariable String artifactId,
            @PathVariable String versionId) {
        return FileResponses.attachment(artifactQuery.download(student, artifactId, versionId));
    }

    /** §26 미리보기(PDF·이미지, 저장 SHA 확인 뒤 inline). 미지원 형식 415 PREVIEW_UNAVAILABLE */
    @GetMapping(path = "/artifacts/{artifactId}/versions/{versionId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(StudentActor student, @PathVariable String artifactId,
            @PathVariable String versionId) {
        return FileResponses.inline(artifactQuery.preview(student, artifactId, versionId));
    }

    /** §25-1 같은 결과물의 두 버전 비교(METADATA_ONLY) */
    @GetMapping("/artifacts/{artifactId}/compare")
    public ArtifactComparison compare(StudentActor student, @PathVariable String artifactId,
            @RequestParam @NotBlank @Size(max = 64) String fromVersionId,
            @RequestParam @NotBlank @Size(max = 64) String toVersionId) {
        return artifactQuery.compare(student, artifactId, fromVersionId, toVersionId);
    }

    // ---- 휴지통 (소프트 삭제, 2026-11-11). 영구 삭제 Endpoint는 없다 ----

    @DeleteMapping("/school-assessments/{assessmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trashSchoolAssessment(StudentActor student, @PathVariable String assessmentId) {
        trashService.trashSchoolAssessment(student, assessmentId);
    }

    @DeleteMapping("/artifacts/{artifactId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trashArtifact(StudentActor student, @PathVariable String artifactId) {
        trashService.trashArtifact(student, artifactId);
    }

    @DeleteMapping("/resources/{resourceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trashResource(StudentActor student, @PathVariable String resourceId) {
        trashService.trashResource(student, resourceId);
    }

    @DeleteMapping("/growth-records/{recordId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void trashGrowthRecord(StudentActor student, @PathVariable String recordId) {
        trashService.trashGrowthRecord(student, recordId);
    }

    @PostMapping(path = "/archive/restore", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ArchiveItem restore(StudentActor student, @RequestBody RestoreRequest request) {
        return trashService.restore(student, request.sourceType(), request.sourceId());
    }

    // ---- §31·32 피드백 ----

    @PostMapping(path = "/feedback-requests", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FeedbackRequestResponse requestFeedback(StudentActor student,
            @Valid @RequestBody CreateFeedbackRequestBody body) {
        return feedbackService.request(student, body);
    }

    @GetMapping("/feedback-requests")
    public PageResponse<FeedbackRequestResponse> feedbackRequests(StudentActor student,
            @RequestParam(required = false) @Pattern(regexp = "PENDING|DELIVERED") String status,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return feedbackQuery.list(student, status, page, size);
    }

    @GetMapping("/feedback-requests/{requestId}")
    public FeedbackRequestResponse feedbackRequest(StudentActor student, @PathVariable String requestId) {
        return feedbackQuery.get(student, requestId);
    }

    @GetMapping("/feedback-requests/{requestId}/reply")
    public FeedbackReplyResponse reply(StudentActor student, @PathVariable String requestId) {
        return feedbackQuery.reply(student, requestId);
    }

    // ---- §29 성장 기록 ----

    @GetMapping("/growth-records")
    public PageResponse<GrowthRecordResponse> growthRecords(StudentActor student,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return growthService.list(student, academicYear, query, page, size);
    }

    @PostMapping(path = "/growth-records", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public GrowthRecordResponse createGrowthRecord(StudentActor student, @RequestBody JsonNode body) {
        return growthService.create(student, body);
    }

    @GetMapping("/growth-records/{recordId}")
    public GrowthRecordResponse growthRecord(StudentActor student, @PathVariable String recordId) {
        return growthService.get(student, recordId);
    }

    @PatchMapping(path = "/growth-records/{recordId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public GrowthRecordResponse updateGrowthRecord(StudentActor student, @PathVariable String recordId,
            @RequestBody JsonNode body) {
        return growthService.update(student, recordId, body);
    }

    // ---- §22 자료함 (본인 비공개) + 관리자 공개 자료 ----

    @GetMapping("/resources")
    public PageResponse<StudentResourceResponse> resources(StudentActor student,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(required = false) @Size(max = 50) String type,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return resourceService.list(student, query, type, page, size);
    }

    @PostMapping(path = "/resources", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public StudentResourceResponse createResource(StudentActor student, @RequestBody JsonNode body) {
        return resourceService.create(student, body);
    }

    @GetMapping("/resources/{resourceId}")
    public StudentResourceResponse resource(StudentActor student, @PathVariable String resourceId) {
        return resourceService.get(student, resourceId);
    }

    @PatchMapping(path = "/resources/{resourceId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public StudentResourceResponse updateResource(StudentActor student, @PathVariable String resourceId,
            @RequestBody JsonNode body) {
        return resourceService.update(student, resourceId, body);
    }

    /** A27-UX §22-1 DRAFT 자료 파일 첨부(교체). 형식은 확장자+서명, 크기는 결과물과 같은 한도 */
    @PostMapping(path = "/resources/{resourceId}/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StudentResourceResponse attachResourceFile(StudentActor student, @PathVariable String resourceId,
            @RequestPart("file") MultipartFile file) {
        resourceFileService.attach(student, resourceId, file.getOriginalFilename(), bytes(file));
        return resourceService.get(student, resourceId);
    }

    @DeleteMapping("/resources/{resourceId}/file")
    public StudentResourceResponse detachResourceFile(StudentActor student, @PathVariable String resourceId) {
        resourceFileService.detach(student, resourceId);
        return resourceService.get(student, resourceId);
    }

    @GetMapping(path = "/resources/{resourceId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> resourceFile(StudentActor student, @PathVariable String resourceId) {
        return FileResponses.attachment(resourceFileService.download(student, resourceId, false));
    }

    /** PDF·이미지만 inline(원본 바이트 그대로). 그 밖은 415 PREVIEW_UNAVAILABLE */
    @GetMapping(path = "/resources/{resourceId}/file/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> resourceFilePreview(StudentActor student, @PathVariable String resourceId) {
        return FileResponses.inline(resourceFileService.download(student, resourceId, true));
    }

    @GetMapping("/shared-resources")
    public ItemsResponse<SharedResourceResponse> sharedResources(StudentActor student) {
        return resourceService.shared(student);
    }

    // ---- §30 보관함·중요 표시 ----

    @GetMapping("/archive")
    public PageResponse<ArchiveItem> archive(StudentActor student,
            @RequestParam(defaultValue = "recent") @Pattern(regexp = "recent|favorites|completed|previous-semesters|trash") String tab,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            // 중요 표시 상태를 한 번에 읽는 화면(useFavorites, 200건)이 있어 최대 500
            @RequestParam(defaultValue = "20") @Min(1) @Max(500) int size) {
        return archiveService.list(student, tab, academicYear, query, page, size);
    }

    @PutMapping(path = "/archive/favorites", consumes = MediaType.APPLICATION_JSON_VALUE)
    public FavoriteRequest favorite(StudentActor student, @RequestBody FavoriteRequest request) {
        return archiveService.setFavorite(student, request);
    }

    private static byte[] bytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
    }
}
