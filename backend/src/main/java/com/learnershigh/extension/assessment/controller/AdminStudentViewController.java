package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.service.plan.OfficialPlanQueryService;
import com.learnershigh.extension.assessment.dto.plan.StudentOfficialPlanResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactComparison;
import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.context.AcademicContextResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.ArtifactVersionResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackReplyResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackRequestResponse;
import com.learnershigh.extension.assessment.dto.record.GrowthDtos.GrowthRecordResponse;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteRevisionDetail;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteRevisionSummary;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ArchiveItem;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.SharedResourceResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.StudentResourceResponse;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentListQuery;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService;
import com.learnershigh.extension.assessment.service.record.AdminStudentViewAccess;
import com.learnershigh.extension.assessment.service.record.ArchiveService;
import com.learnershigh.extension.assessment.service.record.ArtifactQueryService;
import com.learnershigh.extension.assessment.service.record.FeedbackQueryService;
import com.learnershigh.extension.assessment.service.record.GrowthRecordService;
import com.learnershigh.extension.assessment.service.record.NoteQueryService;
import com.learnershigh.extension.assessment.service.record.ResourceService;
import com.learnershigh.extension.assessment.service.school.AcademicContextQueryService;
import com.learnershigh.extension.assessment.service.school.SchoolAssessmentQueryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 "학생 화면 보기" 읽기 전용 API (2026-11-11). Actor: ADMIN.
 * 경로 뒤쪽은 학생 API(`/api/student/assessment/...`)와 같고 응답 Shape도 같다 — 같은 Student 화면을 그대로 그리기 위해서다.
 * 학생 인증 Header를 쓰지 않으며, 담당 지점 범위 검사(범위 밖 404) 뒤 조회 Service만 호출한다. 쓰기 Endpoint는 두지 않는다.
 * 학생 본인 화면에서 숨겨진 것(관리자 답변 초안 등)은 여기서도 보이지 않는다(같은 조회 Service).
 */
@RestController
@RequestMapping(path = "/api/admin/assessment/students/{studentId}/student-view", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminStudentViewController {

    private final AdminStudentViewAccess access;
    private final AcademicContextQueryService contexts;
    private final SchoolAssessmentQueryService assessments;
    private final EvaluationPlanQueryService plans;
    private final NoteQueryService notes;
    private final ArtifactQueryService artifacts;
    private final FeedbackQueryService feedback;
    private final GrowthRecordService growth;
    private final ResourceService resources;
    private final ArchiveService archive;
    private final OfficialPlanQueryService officialPlans;

    public AdminStudentViewController(AdminStudentViewAccess access, AcademicContextQueryService contexts,
            SchoolAssessmentQueryService assessments, EvaluationPlanQueryService plans, NoteQueryService notes,
            ArtifactQueryService artifacts, FeedbackQueryService feedback, GrowthRecordService growth,
            ResourceService resources, ArchiveService archive, OfficialPlanQueryService officialPlans) {
        this.access = access;
        this.contexts = contexts;
        this.assessments = assessments;
        this.plans = plans;
        this.notes = notes;
        this.artifacts = artifacts;
        this.feedback = feedback;
        this.growth = growth;
        this.resources = resources;
        this.archive = archive;
        this.officialPlans = officialPlans;
    }

    /**
     * §10-1-3 부록 L: 학생 공식 원본(학교알리미 수집 원본) — 학생 GET 과 같은 응답. 읽기만 한다(자동 확보 POST 는 두지 않는다 —
     * 관리자 미리보기가 학교알리미 수집을 시작하지 않게). 담당 지점 범위 밖 학생 404.
     */
    @GetMapping("/evaluation-plans/official")
    public StudentOfficialPlanResponse officialPlans(AdminActor admin, @PathVariable String studentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear, @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return officialPlans.studentGet(access.readOnlyContext(admin, studentId), academicYear, semester, grade);
    }

    /** §10-1-3 부록 L: 그 학생 학적 칸의 공식 원본 내려받기(학생 결과물 파일과 같은 읽기 전용 정책). 다른 칸·학교 404 */
    @GetMapping(path = "/evaluation-plans/official/files/{sourceDocumentId}", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> officialFile(AdminActor admin, @PathVariable String studentId,
            @PathVariable @Size(max = 64) String sourceDocumentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear, @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return FileResponses.attachment(officialPlans.studentFile(access.readOnlyContext(admin, studentId), academicYear, semester, grade, sourceDocumentId, false));
    }

    @GetMapping(path = "/evaluation-plans/official/files/{sourceDocumentId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> officialPreview(AdminActor admin, @PathVariable String studentId,
            @PathVariable @Size(max = 64) String sourceDocumentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear, @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return previewOf(officialPlans.studentPreview(access.readOnlyContext(admin, studentId), academicYear, semester, grade, sourceDocumentId));
    }

    @GetMapping("/academic-context")
    public AcademicContextResponse academicContext(AdminActor admin, @PathVariable String studentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear, @RequestParam @Min(1) @Max(2) int semester) {
        return contexts.get(access.readOnlyContext(admin, studentId), academicYear, semester);
    }

    @GetMapping("/school-assessments")
    public PageResponse<SchoolAssessmentResponse> schoolAssessments(AdminActor admin, @PathVariable String studentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Size(max = 64) String subjectId,
            @RequestParam(required = false) @Pattern(regexp = "BEFORE_START|IN_PROGRESS|COMPLETED") String status,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(required = false, defaultValue = SchoolAssessmentListQuery.SORT_DEADLINE)
            @Pattern(regexp = "deadlineDate,asc|createdAt,desc|title,asc") String sort,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return assessments.list(access.readOnlyContext(admin, studentId),
                new SchoolAssessmentListQuery(academicYear, semester, subjectId, status, query, sort, page, size));
    }

    @GetMapping("/school-assessments/{assessmentId}")
    public SchoolAssessmentResponse schoolAssessment(AdminActor admin, @PathVariable String studentId,
            @PathVariable String assessmentId) {
        return assessments.get(access.readOnlyContext(admin, studentId), assessmentId);
    }

    @GetMapping("/evaluation-plans")
    public Map<String, List<StudentEvaluationPlanResponse>> evaluationPlans(AdminActor admin, @PathVariable String studentId,
            @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(3) int grade,
            @RequestParam @Min(1) @Max(2) int semester) {
        return plans.studentList(access.readOnlyContext(admin, studentId), schoolId, academicYear, grade, semester);
    }

    @GetMapping("/evaluation-plans/{planId}")
    public StudentEvaluationPlanResponse evaluationPlan(AdminActor admin, @PathVariable String studentId,
            @PathVariable String planId) {
        return plans.studentGet(access.readOnlyContext(admin, studentId), planId);
    }

    @GetMapping("/notes")
    public ItemsResponse<NoteResponse> notes(AdminActor admin, @PathVariable String studentId,
            @RequestParam @NotBlank @Size(max = 30) String sourceType,
            @RequestParam @NotBlank @Size(max = 64) String sourceId) {
        return notes.list(access.readOnlyContext(admin, studentId), sourceType, sourceId);
    }

    @GetMapping("/notes/{noteId}/revisions")
    public ItemsResponse<NoteRevisionSummary> revisions(AdminActor admin, @PathVariable String studentId,
            @PathVariable String noteId) {
        return notes.revisions(access.readOnlyContext(admin, studentId), noteId);
    }

    @GetMapping("/notes/{noteId}/revisions/{revisionId}")
    public NoteRevisionDetail revision(AdminActor admin, @PathVariable String studentId, @PathVariable String noteId,
            @PathVariable String revisionId) {
        return notes.revision(access.readOnlyContext(admin, studentId), noteId, revisionId);
    }

    @GetMapping("/artifacts")
    public ItemsResponse<ArtifactResponse> artifacts(AdminActor admin, @PathVariable String studentId,
            @RequestParam @NotBlank @Size(max = 30) String sourceType,
            @RequestParam @NotBlank @Size(max = 64) String sourceId) {
        return artifacts.list(access.readOnlyContext(admin, studentId), sourceType, sourceId);
    }

    @GetMapping("/artifacts/{artifactId}/versions")
    public ItemsResponse<ArtifactVersionResponse> versions(AdminActor admin, @PathVariable String studentId,
            @PathVariable String artifactId) {
        return artifacts.versions(access.readOnlyContext(admin, studentId), artifactId);
    }

    @GetMapping(path = "/artifacts/{artifactId}/versions/{versionId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(AdminActor admin, @PathVariable String studentId,
            @PathVariable String artifactId, @PathVariable String versionId) {
        return FileResponses.attachment(artifacts.download(access.readOnlyContext(admin, studentId), artifactId, versionId));
    }

    @GetMapping(path = "/artifacts/{artifactId}/versions/{versionId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(AdminActor admin, @PathVariable String studentId,
            @PathVariable String artifactId, @PathVariable String versionId) {
        return FileResponses.inline(artifacts.preview(access.readOnlyContext(admin, studentId), artifactId, versionId));
    }

    @GetMapping("/artifacts/{artifactId}/compare")
    public ArtifactComparison compare(AdminActor admin, @PathVariable String studentId, @PathVariable String artifactId,
            @RequestParam @NotBlank @Size(max = 64) String fromVersionId,
            @RequestParam @NotBlank @Size(max = 64) String toVersionId) {
        return artifacts.compare(access.readOnlyContext(admin, studentId), artifactId, fromVersionId, toVersionId);
    }

    @GetMapping("/feedback-requests")
    public PageResponse<FeedbackRequestResponse> feedbackRequests(AdminActor admin, @PathVariable String studentId,
            @RequestParam(required = false) @Pattern(regexp = "PENDING|DELIVERED") String status,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return feedback.list(access.readOnlyContext(admin, studentId), status, page, size);
    }

    @GetMapping("/feedback-requests/{requestId}")
    public FeedbackRequestResponse feedbackRequest(AdminActor admin, @PathVariable String studentId,
            @PathVariable String requestId) {
        return feedback.get(access.readOnlyContext(admin, studentId), requestId);
    }

    @GetMapping("/feedback-requests/{requestId}/reply")
    public FeedbackReplyResponse reply(AdminActor admin, @PathVariable String studentId, @PathVariable String requestId) {
        return feedback.reply(access.readOnlyContext(admin, studentId), requestId);
    }

    @GetMapping("/growth-records")
    public PageResponse<GrowthRecordResponse> growthRecords(AdminActor admin, @PathVariable String studentId,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return growth.list(access.readOnlyContext(admin, studentId), academicYear, query, page, size);
    }

    @GetMapping("/growth-records/{recordId}")
    public GrowthRecordResponse growthRecord(AdminActor admin, @PathVariable String studentId,
            @PathVariable String recordId) {
        return growth.get(access.readOnlyContext(admin, studentId), recordId);
    }

    @GetMapping("/resources")
    public PageResponse<StudentResourceResponse> resources(AdminActor admin, @PathVariable String studentId,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(required = false) @Size(max = 50) String type,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return resources.list(access.readOnlyContext(admin, studentId), query, type, page, size);
    }

    @GetMapping("/resources/{resourceId}")
    public StudentResourceResponse resource(AdminActor admin, @PathVariable String studentId,
            @PathVariable String resourceId) {
        return resources.get(access.readOnlyContext(admin, studentId), resourceId);
    }

    @GetMapping("/shared-resources")
    public ItemsResponse<SharedResourceResponse> sharedResources(AdminActor admin, @PathVariable String studentId) {
        return resources.shared(access.readOnlyContext(admin, studentId));
    }

    @GetMapping("/archive")
    public PageResponse<ArchiveItem> archive(AdminActor admin, @PathVariable String studentId,
            @RequestParam(defaultValue = "recent") @Pattern(regexp = "recent|favorites|completed|previous-semesters|trash") String tab,
            @RequestParam(required = false) @Min(2000) @Max(2100) Integer academicYear,
            @RequestParam(required = false) @Size(max = 100) String query,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(500) int size) {
        return archive.list(access.readOnlyContext(admin, studentId), tab, academicYear, query, page, size);
    }

    /** A28-06: HWP·HWPX 는 변환 미리보기 PDF(X-Preview-Rendition: converted-pdf) */
    private static ResponseEntity<InputStreamResource> previewOf(com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService.PreviewFile preview) {
        return FileResponses.preview(preview.file(), preview.converted());
    }
}
