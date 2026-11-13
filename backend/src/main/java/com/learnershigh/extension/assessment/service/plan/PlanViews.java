package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AdminEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.ConfirmedFieldView;
import com.learnershigh.extension.assessment.dto.plan.SourceReviewView;
import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanFileView;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** 평가계획서 Entity → 응답 조립 (읽기 전용 Helper). */
@Component
public class PlanViews {

    public static final String NOT_REQUESTED = "NOT_REQUESTED";
    private static final String FILE_REF_PREFIX = "plan_file_";

    private final PlanRevisionRepository revisions;
    private final PlanAnalysisRunRepository runs;
    private final PlanReviewRepository reviews;
    private final AssessmentTimes times;
    private final JsonMapper mapper;

    public PlanViews(PlanRevisionRepository revisions, PlanAnalysisRunRepository runs, PlanReviewRepository reviews,
            AssessmentTimes times, JsonMapper mapper) {
        this.revisions = revisions;
        this.runs = runs;
        this.reviews = reviews;
        this.times = times;
        this.mapper = mapper;
    }

    public List<AdminEvaluationPlanResponse> admin(Collection<EvaluationPlan> plans) {
        if (plans.isEmpty()) {
            return List.of();
        }
        List<PlanRevision> allRevisions = revisions.findByPlanIds(plans.stream().map(EvaluationPlan::id).toList());
        List<String> revisionIds = allRevisions.stream().map(PlanRevision::id).toList();
        Map<String, PlanAnalysisRun> latestRun = latest(revisionIds.isEmpty() ? List.of()
                : runs.findByRevisionIds(revisionIds), PlanAnalysisRun::revisionId);
        Map<String, PlanReview> latestReview = latest(revisionIds.isEmpty() ? List.of()
                : reviews.findByRevisionIds(revisionIds), PlanReview::revisionId);
        Map<String, List<PlanRevision>> byPlan = allRevisions.stream()
                .collect(Collectors.groupingBy(PlanRevision::planId, LinkedHashMap::new, Collectors.toList()));
        return plans.stream().map(plan -> new AdminEvaluationPlanResponse(plan.id(), plan.schoolId(),
                plan.academicYear(), plan.grade(), plan.semester(),
                byPlan.getOrDefault(plan.id(), List.of()).stream()
                        .map(revision -> revision(revision, latestRun.get(revision.id()),
                                latestReview.get(revision.id())))
                        .toList()))
                .toList();
    }

    /** §39 GET: 그 Revision에 가장 최근 수신된 Run을 보여준다. */
    public PlanAnalysisResponse analysis(EvaluationPlan plan, PlanRevision revision) {
        return analysis(plan, revision, Optional.ofNullable(
                latest(runs.findByRevisionIds(List.of(revision.id())), PlanAnalysisRun::revisionId).get(revision.id())));
    }

    /**
     * 특정 Run 기준 응답 (수신 응답용). 수신 시각이 같은 Run이 여럿이면 "가장 최근"이 방금 저장한 Run이 아닐 수 있어,
     * 수신 응답의 analysisId는 반드시 그 요청이 만든(또는 재전송으로 찾은) Run이어야 한다.
     */
    public PlanAnalysisResponse analysis(EvaluationPlan plan, PlanRevision revision, Optional<PlanAnalysisRun> run) {
        Optional<PlanReview> review = Optional.ofNullable(
                latest(reviews.findByRevisionIds(List.of(revision.id())), PlanReview::revisionId).get(revision.id()));
        return new PlanAnalysisResponse(plan.id(), revision.id(),
                run.map(PlanAnalysisRun::id).orElse(null),
                run.map(r -> r.status().name()).orElse(NOT_REQUESTED),
                revision.reviewStatus().name(),
                run.map(r -> new PlanAnalysisResponse.Analyzer(r.origin(), r.analyzerName(), r.analyzerVersion()))
                        .orElse(null),
                run.map(r -> times.toOffset(r.receivedAt())).orElse(null),
                run.map(r -> json(r.resultJson())).orElse(List.of()),
                run.map(r -> json(r.warningsJson())).orElse(List.of()),
                review.map(this::confirmedFields).orElse(List.of()),
                review.map(r -> new PlanAnalysisResponse.Review(r.analysisId(), r.reviewedBy(),
                        times.toOffset(r.reviewedAt()), sourceReview(r))).orElse(null));
    }

    private AdminEvaluationPlanResponse.Revision revision(PlanRevision revision, PlanAnalysisRun run,
            PlanReview review) {
        return new AdminEvaluationPlanResponse.Revision(revision.id(), revision.revisionNumber(), revision.fileName(),
                fileRef(revision), revision.sizeBytes(), revision.pageCount(), revision.sourceUrl(),
                times.toOffset(revision.uploadedAt()), run == null ? NOT_REQUESTED : run.status().name(),
                revision.reviewStatus().name(), review == null ? List.of() : confirmedFields(review),
                revision.sha256(), revision.format().name(), review == null ? null : sourceReview(review),
                file(revision));
    }

    /** 불투명 파일 참조 (저장 키를 내보내지 않는다). 원문이 없으면 null. */
    public static String fileRef(PlanRevision revision) {
        return revision.hasStoredFile() ? FILE_REF_PREFIX + revision.id() : null;
    }

    /** 원문 미리보기 가능 여부: 보관된 PDF 원문만. HWP·HWPX 변환 Rendition은 아직 없다(검증된 엔진 없음). */
    public static boolean previewAvailable(PlanRevision revision) {
        return revision.hasStoredFile() && revision.format() == PlanDocumentFormat.PDF;
    }

    public static PlanFileView file(PlanRevision revision) {
        return new PlanFileView(fileRef(revision), revision.fileName(), revision.contentType(), revision.sizeBytes(),
                revision.sha256(), revision.format().name(), revision.pageCount(), revision.hasStoredFile(),
                previewAvailable(revision));
    }

    /** HWP·HWPX 검토 기록. PDF 검토(원문 확인 기록 없음)는 null → 응답에서 빠진다. */
    private SourceReviewView sourceReview(PlanReview review) {
        if (review.sourceCheckMethod() == null) {
            return null;
        }
        return new SourceReviewView(review.id(), review.analysisId(), review.reviewedBy(),
                times.toOffset(review.reviewedAt()), review.reviewerAuth(), review.sourceCheckMethod(),
                review.sourceCheckSha256(), Boolean.TRUE.equals(review.manualComparisonConfirmed()),
                review.confirmedValues().size());
    }

    private List<ConfirmedFieldView> confirmedFields(PlanReview review) {
        return review.confirmedValues().stream()
                .map(value -> "PDF".equals(value.evidenceFormat())
                        ? new ConfirmedFieldView(value.subjectId(), value.fieldPath(),
                                value.valueJson() == null ? null : json(value.valueJson()), value.pdfPageNumber())
                        : new ConfirmedFieldView(value.subjectId(), value.fieldPath(),
                                value.valueJson() == null ? null : json(value.valueJson()), null,
                                value.analysisSubjectIndex(), json(value.evidenceLocatorJson()),
                                value.valueJson() == null ? "NOT_IN_SOURCE" : null))
                .toList();
    }

    private Object json(String raw) {
        return mapper.readValue(raw, Object.class);
    }

    /** 정렬된 목록(오래된 것 → 최근)에서 Key별 마지막 항목. */
    private static <T> Map<String, T> latest(List<T> ordered, Function<T, String> key) {
        Map<String, T> result = new LinkedHashMap<>();
        ordered.forEach(item -> result.put(key.apply(item), item));
        return result;
    }
}
