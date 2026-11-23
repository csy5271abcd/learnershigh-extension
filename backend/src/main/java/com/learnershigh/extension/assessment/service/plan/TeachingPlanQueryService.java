package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.StudentTeachingPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanReviewResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.TeachingPlanReview;
import com.learnershigh.extension.assessment.entity.TeachingPlanReviewRow;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.TeachingPlanReviewRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** §39-6 관리자 운영계획 확정 조회 · §10-1-2 학생 운영계획 조회 (A6 DRAFT, 2026-11-15). */
@Service
@Transactional(readOnly = true)
public class TeachingPlanQueryService {

    private final PlanAccess access;
    private final PlanAnalysisRunRepository runs;
    private final TeachingPlanReviewRepository reviews;
    private final EvaluationPlanQueryService plans;
    private final AssessmentTimes times;
    private final JsonMapper mapper;

    public TeachingPlanQueryService(PlanAccess access, PlanAnalysisRunRepository runs,
            TeachingPlanReviewRepository reviews, EvaluationPlanQueryService plans, AssessmentTimes times,
            JsonMapper mapper) {
        this.access = access;
        this.runs = runs;
        this.reviews = reviews;
        this.plans = plans;
        this.times = times;
        this.mapper = mapper;
    }

    public TeachingPlanReviewResponse adminGet(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        return view(plan, revision, reviews.findByRevisionId(revision.id()), latestRun(runs, revision));
    }

    private List<TeachingPlanReviewResponse.RowView> rowViews(TeachingPlanReview review) {
        return review.rows().stream()
                .map(row -> new TeachingPlanReviewResponse.RowView(row.analysisSubjectIndex(), row.rowKey(),
                        row.subjectId(), row.decision(), mapper.readValue(row.rowJson(), Object.class),
                        row.candidateJson() == null ? null : mapper.readValue(row.candidateJson(), Object.class),
                        row.origin(), row.decisionBasis()))
                .toList();
    }

    /** A13 §39-10 운영계획 확정 이력 (관리자 전용, 최신 → 과거). reReviewOpen = 최신 분석 결과의 운영계획 초안이 열려 있음. */
    public TeachingPlanReviewResponse.History adminHistory(AdminActor admin, String planId, String revisionId,
            boolean reReviewOpen) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        List<TeachingPlanReview> history = reviews.findHistory(revision.id());
        List<TeachingPlanReviewResponse.Version> items = new java.util.ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            TeachingPlanReview review = history.get(i);
            int excluded = (int) review.rows().stream().filter(row -> "EXCLUDED".equals(row.decision())).count();
            items.add(new TeachingPlanReviewResponse.Version(review.getId(), review.versionNo(), review.analysisId(),
                    review.reviewedBy(), times.toOffset(review.reviewedAt()), i == 0, review.rows().size() - excluded,
                    excluded, rowViews(review)));
        }
        return new TeachingPlanReviewResponse.History(plan.id(), revision.id(), reReviewOpen && !history.isEmpty(), items);
    }

    /** 최신 분석 결과 ID (재검토 열림 판단용) */
    public Optional<String> latestAnalysisId(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        return latestRun(runs, access.revision(plan, revisionId)).map(PlanAnalysisRun::id);
    }

    TeachingPlanReviewResponse view(EvaluationPlan plan, PlanRevision revision, Optional<TeachingPlanReview> review,
            Optional<PlanAnalysisRun> latest) {
        int candidates = latest.map(run -> candidateRowCount(mapper.readTree(run.resultJson()))).orElse(0);
        TeachingPlanReviewResponse.Review body = review.map(r -> new TeachingPlanReviewResponse.Review(r.analysisId(),
                r.reviewedBy(), times.toOffset(r.reviewedAt()), rowViews(r), r.versionNo()))
                .orElse(null);
        return new TeachingPlanReviewResponse(plan.id(), revision.id(), latest.map(PlanAnalysisRun::id).orElse(null),
                candidates, body);
    }

    /**
     * 학생: 공개(최근 확정) Revision의 확정 운영계획 행만(EXCLUDED 제외). 확정 전이면 NOT_CONFIRMED + 빈 목록.
     * 후보·초안·issue는 보내지 않는다. 근거는 PDF 쪽 번호만(HWP·HWPX 위치는 보내지 않음).
     */
    public StudentTeachingPlanResponse studentGet(StudentActor student, String planId) {
        EvaluationPlanQueryService.PublicPlan visible = plans.studentPublic(student, planId);
        EvaluationPlan plan = visible.plan();
        PlanRevision revision = visible.revision();
        Optional<TeachingPlanReview> review = reviews.findByRevisionId(revision.id());
        List<StudentTeachingPlanResponse.Row> rows = review.map(r -> r.rows().stream()
                .filter(TeachingPlanReviewRow::published)
                .map(row -> studentRow(row))
                .toList()).orElse(List.of());
        return new StudentTeachingPlanResponse(plan.id(), revision.id(), plan.academicYear(), plan.grade(),
                plan.semester(), review.isPresent() ? StudentTeachingPlanResponse.CONFIRMED
                        : StudentTeachingPlanResponse.NOT_CONFIRMED,
                review.map(r -> times.toOffset(r.reviewedAt())).orElse(null), rows);
    }

    private StudentTeachingPlanResponse.Row studentRow(TeachingPlanReviewRow stored) {
        AnalysisImportRequest.TeachingPlanRow row = mapper.readValue(stored.rowJson(),
                AnalysisImportRequest.TeachingPlanRow.class);
        Integer page = row.sources() == null ? null : row.sources().stream()
                .map(AnalysisImportRequest.Locator::pdfPageNumber)
                .filter(java.util.Objects::nonNull)
                .min(Integer::compare)
                .orElse(null);
        if (stored.manual()) {
            // A14: 관리자 추가 행은 분석 근거가 없다. 관리자가 확인한 PDF 쪽만(없으면 null)
            tools.jackson.databind.JsonNode manualPage = mapper.readTree(stored.rowJson()).get("manualPdfPageNumber");
            page = manualPage != null && manualPage.isNumber() ? manualPage.intValue() : null;
        }
        return new StudentTeachingPlanResponse.Row(stored.subjectId(), row.rowKey(), row.month(), row.monthTo(),
                row.weekLabel(), row.weekFrom(), row.weekTo(), row.unit(), row.content(), row.note(),
                row.achievementStandards(), row.teachingMethods(), row.assessmentMethods(), row.specialSchedule(),
                row.schedule(), page);
    }

    static Optional<PlanAnalysisRun> latestRun(PlanAnalysisRunRepository runs, PlanRevision revision) {
        List<PlanAnalysisRun> list = runs.findByRevisionIds(List.of(revision.id()));
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getLast());
    }

    static int candidateRowCount(JsonNode subjects) {
        int count = 0;
        if (subjects != null && subjects.isArray()) {
            for (JsonNode subject : subjects) {
                JsonNode rows = subject.get("teachingPlan");
                if (rows != null && rows.isArray()) {
                    count += rows.size();
                }
            }
        }
        return count;
    }
}
