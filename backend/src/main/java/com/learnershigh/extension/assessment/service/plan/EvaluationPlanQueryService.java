package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AdminEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 평가계획서 조회: 관리자(§38·§39) / 학생(§10-1). */
@Service
@Transactional(readOnly = true)
public class EvaluationPlanQueryService {

    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final PlanAccess access;
    private final PlanViews views;
    private final AcademicContextProvider contexts;
    private final AssessmentTimes times;
    private final PlanDocumentStorage storage;

    public EvaluationPlanQueryService(EvaluationPlanRepository plans, PlanRevisionRepository revisions,
            PlanAccess access, PlanViews views, AcademicContextProvider contexts, AssessmentTimes times,
            PlanDocumentStorage storage) {
        this.plans = plans;
        this.revisions = revisions;
        this.access = access;
        this.views = views;
        this.contexts = contexts;
        this.times = times;
        this.storage = storage;
    }

    public Map<String, List<AdminEvaluationPlanResponse>> adminList(AdminActor admin, String schoolId,
            Integer academicYear, Integer grade, Integer semester) {
        access.requireOperator(admin);
        return Map.of("items", views.admin(plans.search(schoolId, academicYear, grade, semester)));
    }

    public AdminEvaluationPlanResponse adminGet(AdminActor admin, String planId) {
        return views.admin(List.of(access.plan(admin, planId))).getFirst();
    }

    public PlanAnalysisResponse adminAnalysis(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        return views.analysis(plan, access.revision(plan, revisionId));
    }

    /**
     * §10-1 학생: 자기 학교·학년도·학년·학기 슬롯의 공통 문서만. 다른 학교·학년 요청은 403.
     * 관리자가 확정(CONFIRMED)한 Revision만 공개한다: 업로드·분석만 된 문서는 보이지 않는다(2026-11-13 OD-A08 결정).
     * 문서마다 가장 최근에 확정된 Revision을 보여 준다(확정 뒤 올라온 미확정 개정본은 보이지 않는다). AI 후보는 포함하지 않는다.
     */
    public Map<String, List<StudentEvaluationPlanResponse>> studentList(StudentActor student, String schoolId,
            int academicYear, int grade, int semester) {
        AcademicContextRecord context = contexts.find(student.studentId(), academicYear, semester)
                .filter(c -> c.schoolId().equals(schoolId) && c.grade() == grade)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.FORBIDDEN));
        List<EvaluationPlan> found = plans.search(context.schoolId(), academicYear, grade, semester);
        return Map.of("items", toStudent(found));
    }

    public StudentEvaluationPlanResponse studentGet(StudentActor student, String planId) {
        Optional<EvaluationPlan> plan = plans.findById(planId).filter(p -> contexts
                .find(student.studentId(), p.academicYear(), p.semester())
                .filter(c -> p.matchesSlot(c.schoolId(), c.academicYear(), c.grade(), c.semester()))
                .isPresent());
        List<StudentEvaluationPlanResponse> items = toStudent(plan.stream().toList());
        if (items.isEmpty()) {
            throw PlanAccess.planNotFound();
        }
        // 상세에만 그 공개 Revision의 확정값을 붙인다 (후보·근거 위치는 없다).
        StudentEvaluationPlanResponse item = items.getFirst();
        return item.withConfirmedFields(views.studentConfirmedFields(item.documentRevisionId()));
    }

    private List<StudentEvaluationPlanResponse> toStudent(List<EvaluationPlan> found) {
        if (found.isEmpty()) {
            return List.of();
        }
        Map<String, PlanRevision> latest = latestConfirmed(found);
        return found.stream()
                .filter(plan -> latest.containsKey(plan.id()))
                .map(plan -> {
                    PlanRevision revision = latest.get(plan.id());
                    return new StudentEvaluationPlanResponse(plan.id(), revision.id(), plan.schoolId(),
                            plan.academicYear(), plan.grade(), plan.semester(), revision.fileName(),
                            revision.sourceUrl(), revision.reviewStatus().name(), times.toOffset(revision.uploadedAt()),
                            PlanViews.file(revision), null);
                })
                .sorted(Comparator.comparing(StudentEvaluationPlanResponse::uploadedAt))
                .toList();
    }

    /** 문서별 가장 최근에 확정된 Revision. 확정 Revision이 없는 문서는 빠진다. */
    private Map<String, PlanRevision> latestConfirmed(List<EvaluationPlan> found) {
        return revisions.findByPlanIds(found.stream().map(EvaluationPlan::id).toList()).stream()
                .filter(PlanRevision::isConfirmed)
                .collect(Collectors.toMap(PlanRevision::planId, r -> r,
                        (a, b) -> a.revisionNumber() >= b.revisionNumber() ? a : b));
    }

    /** 관리자: Revision 원문 (§38 확장, S-4). preview=true면 서비스 안 미리보기용(PDF만). */
    public FileDownload adminFile(AdminActor admin, String planId, String revisionId, boolean preview) {
        EvaluationPlan plan = access.plan(admin, planId);
        return verifiedFile(access.revision(plan, revisionId), preview);
    }

    /**
     * 학생: 자기 슬롯 문서의 "학생에게 공개된" Revision(가장 최근 확정본) 원문만 (§10-1 확장, S-4).
     * 다른 학교·학년·학기 문서, 미확정 문서는 존재를 드러내지 않도록 404.
     */
    public FileDownload studentFile(StudentActor student, String planId, boolean preview) {
        EvaluationPlan plan = plans.findById(planId).filter(p -> contexts
                        .find(student.studentId(), p.academicYear(), p.semester())
                        .filter(c -> p.matchesSlot(c.schoolId(), c.academicYear(), c.grade(), c.semester()))
                        .isPresent())
                .orElseThrow(PlanAccess::planNotFound);
        PlanRevision revision = Optional.ofNullable(latestConfirmed(List.of(plan)).get(plan.id()))
                .orElseThrow(PlanAccess::planNotFound);
        return verifiedFile(revision, preview);
    }

    /**
     * 저장된 원문을 읽어 크기·SHA-256이 등록 당시와 같은지 확인한 뒤 내보낸다(다르면 409 FILE_INTEGRITY_FAILED).
     * 원문이 없는 이전 등록분은 404, HWP·HWPX 미리보기는 변환 Rendition이 없어 415 PREVIEW_UNAVAILABLE.
     */
    private FileDownload verifiedFile(PlanRevision revision, boolean preview) {
        if (!revision.hasStoredFile()) {
            throw new BusinessException(CommonErrorCode.NOT_FOUND, "이 개정본은 원문 파일을 보관하지 않았습니다.");
        }
        if (preview && !PlanViews.previewAvailable(revision)) {
            throw new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE);
        }
        return new FileDownload(revision.fileName(), revision.contentType(), revision.sizeBytes(),
                new ByteArrayInputStream(verifiedBytes(revision)));
    }

    /**
     * 보관된 원문 바이트 (크기·SHA-256이 등록 당시와 같을 때만). 원문을 보관한 Revision에만 부른다.
     * 다르거나 읽을 수 없으면 409 FILE_INTEGRITY_FAILED. 서버 분석 실행(A3)도 이 값만 분석기로 보낸다.
     */
    public byte[] verifiedBytes(PlanRevision revision) {
        byte[] bytes;
        try (InputStream in = storage.open(revision.fileRef())) {
            bytes = in.readAllBytes();
        } catch (IOException | UncheckedIOException failed) {
            throw new BusinessException(AssessmentErrorCode.FILE_INTEGRITY_FAILED);
        }
        if (bytes.length != revision.sizeBytes() || !PdfInspector.sha256(bytes).equals(revision.sha256())) {
            throw new BusinessException(AssessmentErrorCode.FILE_INTEGRITY_FAILED);
        }
        return bytes;
    }
}
