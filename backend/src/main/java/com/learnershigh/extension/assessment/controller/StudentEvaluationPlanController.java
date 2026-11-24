package com.learnershigh.extension.assessment.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.http.HttpStatus;
import com.learnershigh.extension.assessment.dto.plan.StudentOfficialEnsureResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentOfficialPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentTeachingPlanResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService;
import com.learnershigh.extension.assessment.service.plan.OfficialPlanQueryService;
import com.learnershigh.extension.assessment.service.plan.TeachingPlanQueryService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
 * Student 공통 평가계획서 조회 (api-contract.md §10-1) + 공개(확정)된 원문 열람(S-4, 2026-11-13). Actor: STUDENT.
 * §10-2 개인 업로드·§11 분석/개인 정정은 File Storage(API-OD-A03)와 학생 PDF 외부 전송 조건(OD-A13) 미결로 제공하지 않는다.
 */
@RestController
@RequestMapping(path = "/api/student/assessment/evaluation-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class StudentEvaluationPlanController {

    private final EvaluationPlanQueryService queryService;
    private final TeachingPlanQueryService teachingPlans;
    private final OfficialPlanQueryService officialPlans;
    private final com.learnershigh.extension.assessment.service.plan.StudentOfficialViewService officialViews;

    public StudentEvaluationPlanController(EvaluationPlanQueryService queryService,
            TeachingPlanQueryService teachingPlans, OfficialPlanQueryService officialPlans,
            com.learnershigh.extension.assessment.service.plan.StudentOfficialViewService officialViews) {
        this.queryService = queryService;
        this.teachingPlans = teachingPlans;
        this.officialPlans = officialPlans;
        this.officialViews = officialViews;
    }

    /**
     * §10-1-3 (DRAFT, A27-UX) 본인 학적 슬롯의 학교 공식 공개 원본. 관리자 분석·확정과 무관하게 열람할 수 있는 공개 자료만 돌려준다.
     * 공급자(학교알리미 수집기) 미연결이면 sourceConnected=false · 빈 목록.
     */
    @GetMapping("/official")
    public StudentOfficialPlanResponse official(StudentActor student,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return officialPlans.studentGet(student, academicYear, semester, grade);
    }

    /** §10-1-3 부록 K: 학생 진입 자동 확보(본문 없음). 학교는 서버가 학적에서 정한다. 진행 중이면 202. */
    @PostMapping("/official/ensure")
    public ResponseEntity<StudentOfficialEnsureResponse> ensureOfficial(StudentActor student) {
        OfficialPlanQueryService.Ensured e = officialPlans.studentEnsure(student);
        return ResponseEntity.status(e.running() ? HttpStatus.ACCEPTED : HttpStatus.OK).body(e.body());
    }

    /** §38-16 부록 O: 본인 학적 학교의 동명 후보·열람 선택 상태(학교알리미 ID 없음). */
    @GetMapping("/official/school-candidates")
    public com.learnershigh.extension.assessment.dto.plan.StudentOfficialViewResponse officialCandidates(StudentActor student) {
        return officialViews.get(student);
    }

    /** §38-16 부록 O: 본인 열람 대상 학교 선택(학적·관리자 매핑 불변). */
    @org.springframework.web.bind.annotation.PutMapping(path = "/official/view-selection", consumes = MediaType.APPLICATION_JSON_VALUE)
    public com.learnershigh.extension.assessment.dto.plan.StudentOfficialViewResponse selectOfficialView(StudentActor student,
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
            com.learnershigh.extension.assessment.dto.plan.StudentOfficialViewRequest request) {
        return officialViews.select(student, request.candidateId(), request.expectedVersion());
    }

    /** §38-16 부록 O: 본인 열람 선택 철회. */
    @org.springframework.web.bind.annotation.DeleteMapping("/official/view-selection")
    public com.learnershigh.extension.assessment.dto.plan.StudentOfficialViewResponse clearOfficialView(StudentActor student,
            @RequestParam(required = false) @Min(0) Long expectedVersion) {
        return officialViews.clear(student, expectedVersion);
    }

    /** §10-1-3 부록 K: 본인 학적 슬롯 공식 원본 내려받기(다른 칸·학교·삭제·보류 404). */
    @GetMapping(path = "/official/files/{sourceDocumentId}", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> officialFile(StudentActor student, @PathVariable @Size(max = 64) String sourceDocumentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear, @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return FileResponses.attachment(officialPlans.studentFile(student, academicYear, semester, grade, sourceDocumentId, false));
    }

    /** §10-1-3 부록 K: PDF 원본 미리보기(inline). HWP·HWPX 415. */
    @GetMapping(path = "/official/files/{sourceDocumentId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> officialPreview(StudentActor student, @PathVariable @Size(max = 64) String sourceDocumentId,
            @RequestParam @Min(2000) @Max(2100) int academicYear, @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Min(1) @Max(3) Integer grade) {
        return previewOf(officialPlans.studentPreview(student, academicYear, semester, grade, sourceDocumentId));
    }

    /** A6 §10-1-2: 공개(확정) Revision의 확정 운영계획 행만. 확정 전이면 NOT_CONFIRMED + 빈 목록. */
    @GetMapping("/{planId}/teaching-plan")
    public StudentTeachingPlanResponse teachingPlan(StudentActor student, @PathVariable String planId) {
        return teachingPlans.studentGet(student, planId);
    }

    @GetMapping
    public Map<String, List<StudentEvaluationPlanResponse>> list(StudentActor student,
            @RequestParam @NotBlank @Size(max = 64) String schoolId,
            @RequestParam @Min(2000) @Max(2100) int academicYear,
            @RequestParam @Min(1) @Max(3) int grade,
            @RequestParam @Min(1) @Max(2) int semester) {
        return queryService.studentList(student, schoolId, academicYear, grade, semester);
    }

    @GetMapping("/{planId}")
    public StudentEvaluationPlanResponse get(StudentActor student, @PathVariable String planId) {
        return queryService.studentGet(student, planId);
    }

    /** S-4: 공개(확정)된 Revision 원문 내려받기. 자기 슬롯이 아니거나 미확정이면 404. */
    @GetMapping(path = "/{planId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(StudentActor student, @PathVariable String planId) {
        return FileResponses.attachment(queryService.studentFile(student, planId, false));
    }

    /** S-4: 공개(확정)된 Revision 미리보기(inline). HWP·HWPX는 변환기가 있으면 변환 PDF(A25). */
    @GetMapping(path = "/{planId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(StudentActor student, @PathVariable String planId) {
        com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService.PreviewFile preview =
                queryService.studentPreview(student, planId);
        return FileResponses.preview(preview.file(), preview.converted());
    }

    /** A28-06: HWP·HWPX 는 변환 미리보기 PDF(X-Preview-Rendition: converted-pdf) */
    private static ResponseEntity<InputStreamResource> previewOf(com.learnershigh.extension.assessment.service.plan.EvaluationPlanQueryService.PreviewFile preview) {
        return FileResponses.preview(preview.file(), preview.converted());
    }
}
