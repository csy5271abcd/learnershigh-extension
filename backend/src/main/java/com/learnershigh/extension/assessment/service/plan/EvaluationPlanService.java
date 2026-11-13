package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanUploadResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/**
 * 평가계획서 운영 (api-contract.md §38·§39, domain.md §9-0). Actor: 평가계획서 운영 권한이 있는 ADMIN.
 * 원본 Revision은 덮어쓰지 않고, AI 결과(후보)와 관리자 확정값을 서로 다른 Table에 둔다.
 * 관리자 확정은 사람이 검토 명령을 보낼 때만 생긴다: 분석 결과 수신이 검토 상태를 바꾸지 않는다.
 */
@Service
@Transactional
public class EvaluationPlanService {

    /** §11 fieldPath 화이트리스트: 평가 영역 아래의 속성/색인 경로만 허용한다. */
    static final Pattern FIELD_PATH = Pattern.compile(
            "(writtenEvaluation|performanceEvaluation|achievement|teachingPlan)(\\.[A-Za-z][A-Za-z0-9]{0,40}|\\[\\d{1,3}])*");
    private static final int VALUE_JSON_MAX = 4000;

    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final PlanAnalysisRunRepository runs;
    private final PlanReviewRepository reviews;
    private final PlanAccess access;
    private final PlanViews views;
    private final DocumentFormatInspector formatInspector;
    private final AnalysisImportValidator importValidator;
    private final AssessmentTimes times;
    private final JsonMapper mapper;
    private final AcademicContextProvider contexts;
    /** HWP·HWPX 공식 확정 허용(통제된 개발·합성 시험 전용). 기본 false — 실제 관리자 인증 연동 전 운영에서 켜지 않는다. */
    private final boolean structuredConfirmEnabled;

    public EvaluationPlanService(EvaluationPlanRepository plans, PlanRevisionRepository revisions,
            PlanAnalysisRunRepository runs, PlanReviewRepository reviews, PlanAccess access, PlanViews views,
            DocumentFormatInspector formatInspector, AnalysisImportValidator importValidator, AssessmentTimes times,
            JsonMapper mapper, AcademicContextProvider contexts,
            @Value("${assessment.plan-review.structured-confirm-dev:false}") boolean structuredConfirmEnabled) {
        this.plans = plans;
        this.revisions = revisions;
        this.runs = runs;
        this.reviews = reviews;
        this.access = access;
        this.views = views;
        this.formatInspector = formatInspector;
        this.importValidator = importValidator;
        this.times = times;
        this.mapper = mapper;
        this.contexts = contexts;
        this.structuredConfirmEnabled = structuredConfirmEnabled;
    }

    /** 업로드 파일 입력 (Controller가 multipart에서 꺼낸 값). */
    public record UploadedPdf(String fileName, String contentType, byte[] bytes, String sourceUrl) {
    }

    /** §38 POST: 슬롯에 새 문서 + 첫 Revision. */
    public PlanUploadResponse register(AdminActor admin, String schoolId, int academicYear, int grade, int semester,
            UploadedPdf file) {
        access.requireSchool(admin, schoolId);
        DocumentFormatInspector.Inspection inspection = formatInspector.inspect(file.bytes());
        Instant now = times.now();
        EvaluationPlan plan = plans.save(EvaluationPlan.register(schoolId, academicYear, grade, semester,
                admin.adminId(), now));
        return upload(admin, plan, file, inspection, now);
    }

    /** §38 POST .../revisions: 기존 문서에 개정본 추가. 이전 Revision·확정값·학생 기록은 바꾸지 않는다. */
    public PlanUploadResponse addRevision(AdminActor admin, String planId, UploadedPdf file) {
        EvaluationPlan plan = access.plan(admin, planId);
        DocumentFormatInspector.Inspection inspection = formatInspector.inspect(file.bytes());
        return upload(admin, plan, file, inspection, times.now());
    }

    private PlanUploadResponse upload(AdminActor admin, EvaluationPlan plan, UploadedPdf file,
            DocumentFormatInspector.Inspection inspection, Instant now) {
        int number = plan.reserveNextRevisionNumber();
        PlanRevision revision = revisions.save(PlanRevision.upload(plan.id(), number, file.fileName(),
                inspection.format().contentType(), inspection.sizeBytes(), inspection.sha256(), inspection.pageCount(),
                file.sourceUrl(), admin.adminId(), now));
        plans.flush();
        return new PlanUploadResponse(plan.id(), revision.id(), plan.schoolId(), plan.academicYear(), plan.grade(),
                plan.semester(), revision.fileRef(), PlanViews.NOT_REQUESTED, revision.reviewStatus().name());
    }

    /** 분석 수신 결과. created=false면 같은 Revision에 같은 내용이 이미 저장되어 있었다(재시도). */
    public record ImportResult(boolean created, PlanAnalysisResponse analysis) {
    }

    /**
     * 외부 분석기 결과 수신 (PROPOSED). 검증을 통과한 후보만 새 AnalysisRun으로 저장한다(값은 고치지 않는다).
     * 검토 상태(UNREVIEWED/CONFIRMED)와 학생 데이터는 바꾸지 않는다.
     */
    public ImportResult importAnalysis(AdminActor admin, String planId, String revisionId,
            AnalysisImportRequest request) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        AnalysisImportValidator.Result result = importValidator.validate(request, revision,
                formatInspector.experimentalEnabled());
        if (!result.valid()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR,
                    result.violations().toArray(FieldViolation[]::new));
        }
        String canonical = mapper.writeValueAsString(request);
        String payloadSha = PdfInspector.sha256(canonical.getBytes(StandardCharsets.UTF_8));
        Optional<PlanAnalysisRun> same = runs.findSamePayload(revision.id(), payloadSha);
        if (same.isPresent()) {
            return new ImportResult(false, views.analysis(plan, revision, same));
        }
        List<Map<String, String>> warnings = new ArrayList<>();
        if (request.warnings() != null) {
            request.warnings().forEach(message -> warnings.add(warning("ANALYZER", message)));
        }
        result.serverWarnings().forEach(message -> warnings.add(warning("SERVER", message)));
        PlanAnalysisRun saved = runs.saveAndFlush(PlanAnalysisRun.importExternal(revision.id(), PlanAnalysisStatus.valueOf(request.status()),
                request.analyzer().name(), request.analyzer().version(), payloadSha,
                mapper.writeValueAsString(request.subjects()), mapper.writeValueAsString(warnings), admin.adminId(),
                times.now()));
        return new ImportResult(true, views.analysis(plan, revision, Optional.of(saved)));
    }

    /**
     * §39 PUT .../review: 관리자가 원문과 대조해 확인한 값을 저장한다. decision=CONFIRM만 있다.
     * 실패한 분석, 다른 Revision의 분석에는 확정할 수 없다. 값을 냈으면 근거 쪽(pdfPageNumber)이 필요하다.
     */
    public PlanAnalysisResponse review(AdminActor admin, String planId, String revisionId, PlanReviewRequest request) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        boolean structured = revision.format() != PlanDocumentFormat.PDF;
        if (structured && !structuredConfirmEnabled) {
            // 운영 보호: 실제 관리자 인증·인가가 연결되지 않은 상태에서 HWP·HWPX 공식 확정은 거절한다.
            // 실험 Flag(multiformat.experimental)만 켰다고 Mock 관리자에게 확정 권한이 생기지 않는다.
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR,
                    new FieldViolation("revision.documentFormat", "verified_auth_required"));
        }
        List<FieldViolation> violations = new ArrayList<>();
        Optional<PlanAnalysisRun> run = runs.findById(request.analysisId())
                .filter(r -> r.revisionId().equals(revision.id()));
        if (run.isEmpty()) {
            violations.add(new FieldViolation("analysisId", "unknown"));
        } else if (run.get().status() == PlanAnalysisStatus.FAILED) {
            violations.add(new FieldViolation("analysisId", "analysis_failed"));
        }
        List<AnalysisImportRequest.Subject> analysisSubjects = structured && run.isPresent()
                ? analysisSubjects(run.get()) : List.of();
        PlanReview review = PlanReview.confirm(revision.id(), request.analysisId(), admin.adminId(), times.now());
        if (structured) {
            ReviewFieldRules.checkSource(request.sourceCheck(), revision.sha256(), violations::add);
            if (request.sourceCheck() != null) {
                review.recordSourceCheck(request.sourceCheck().method(), request.sourceCheck().localFileSha256(),
                        Boolean.TRUE.equals(request.sourceCheck().manualComparisonConfirmed()));
            }
        } else {
            ReviewFieldRules.rejectStructuredFieldsOnPdf(request, violations::add);
        }
        // 관리자가 고른 과목 ID는 이 문서 슬롯(학교·학년도·학년·학기)의 학업 과목이어야 한다. 과목명으로 추측해 맞추지 않는다.
        Optional<AcademicContextRecord> slot = contexts.findSlot(plan.schoolId(), plan.academicYear(), plan.grade(),
                plan.semester());
        Set<String> seenSubjects = new HashSet<>();
        Set<Integer> usedIndexes = new HashSet<>();
        Set<String> seenFields = ReviewFieldRules.newSeen();
        for (int s = 0; s < request.reviewedSubjects().size(); s++) {
            PlanReviewRequest.ReviewedSubject subject = request.reviewedSubjects().get(s);
            String subjectPath = "reviewedSubjects[" + s + "]";
            if (slot.isEmpty() || !slot.get().hasSubject(subject.subjectId())) {
                violations.add(new FieldViolation(subjectPath + ".subjectId", "unknown"));
            } else if (!seenSubjects.add(subject.subjectId())) {
                violations.add(new FieldViolation(subjectPath + ".subjectId", "duplicate"));
            }
            if (structured && run.isPresent()) {
                ReviewFieldRules.checkSubjectIndex(analysisSubjects, subject.analysisSubjectIndex(),
                        subjectPath + ".analysisSubjectIndex", usedIndexes, violations::add);
            }
            for (int f = 0; f < subject.confirmedFields().size(); f++) {
                PlanReviewRequest.ConfirmedField field = subject.confirmedFields().get(f);
                String path = subjectPath + ".confirmedFields[" + f + "]";
                String valueJson = field.value() == null ? null : mapper.writeValueAsString(field.value());
                if (!FIELD_PATH.matcher(field.fieldPath()).matches()) {
                    violations.add(new FieldViolation(path + ".fieldPath", "not_allowed"));
                } else if (!ReviewFieldRules.canonicalIndexes(field.fieldPath())) {
                    // [01]·[00]은 [1]·[0]과 같은 필드로 풀려 중복 검사를 우회한다(PDF 포함).
                    violations.add(new FieldViolation(path + ".fieldPath", "unknown"));
                } else if (ReviewFieldRules.duplicate(seenFields, subject.subjectId(), field.fieldPath())) {
                    violations.add(new FieldViolation(path + ".fieldPath", "duplicate"));
                }
                if (valueJson != null && valueJson.length() > VALUE_JSON_MAX) {
                    violations.add(new FieldViolation(path + ".value", "size"));
                }
                if (structured) {
                    if (run.isPresent()) {
                        ReviewFieldRules.checkStructuredField(analysisSubjects, subject.analysisSubjectIndex(), field,
                                path, revision.format(), violations::add);
                    }
                    String locatorJson = field.documentLocator() == null ? null
                            : mapper.writeValueAsString(field.documentLocator());
                    review.addStructuredConfirmedValue(subject.subjectId(), field.fieldPath(), valueJson,
                            revision.format().name(), locatorJson,
                            subject.analysisSubjectIndex() == null ? -1 : subject.analysisSubjectIndex());
                } else {
                    if (valueJson != null && field.pdfPageNumber() == null) {
                        violations.add(new FieldViolation(path + ".pdfPageNumber", "evidence_required"));
                    }
                    if (field.pdfPageNumber() != null && revision.pageCount() != null
                            && field.pdfPageNumber() > revision.pageCount()) {
                        violations.add(new FieldViolation(path + ".pdfPageNumber", "out_of_range"));
                    }
                    review.addConfirmedValue(subject.subjectId(), field.fieldPath(), valueJson, field.pdfPageNumber());
                }
            }
        }
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        reviews.save(review);
        revision.markConfirmed();
        revisions.flush();
        return views.analysis(plan, revision);
    }

    private List<AnalysisImportRequest.Subject> analysisSubjects(PlanAnalysisRun run) {
        return Arrays.asList(mapper.readValue(run.resultJson(), AnalysisImportRequest.Subject[].class));
    }

    private static Map<String, String> warning(String source, String message) {
        Map<String, String> warning = new LinkedHashMap<>();
        warning.put("source", source);
        warning.put("message", message);
        return warning;
    }
}
