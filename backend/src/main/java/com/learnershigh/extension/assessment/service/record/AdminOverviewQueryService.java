package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.AdminOverviewResponse;
import com.learnershigh.extension.assessment.entity.AssessmentResource;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.FeedbackRequest;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.assessment.entity.PlanReviewDraft;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.TeachingPlanReview;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.repository.AssessmentResourceRepository;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.FeedbackRequestRepository;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewDraftRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.repository.TeachingPlanReviewRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * §33 Admin Assessment 현황 (A12). 요청 시점에 실제 Entity에서 계산한다 — 저장 Counter·Mock 수치 없음.
 *
 * <p>학생·피드백 수치는 관리자 담당 범위({@link AdminStudents#inScope})와 학교·학년 필터(학업 Context)로, 평가계획서 수치는
 * 평가계획서 운영 범위(OD-A08: 정상 관리자는 모든 학교)와 학교·학년도·학년 필터로 센다. Student Care 데이터는 읽지 않는다.
 */
@Service
@Transactional(readOnly = true)
public class AdminOverviewQueryService {

    private static final int RECENT_LIMIT = 10;
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private final AdminStudents adminStudents;
    private final SchoolAssessmentRepository assessments;
    private final FeedbackRequestRepository requests;
    private final AssessmentResourceRepository resources;
    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final PlanAnalysisRunRepository runs;
    private final PlanReviewRepository reviews;
    private final PlanReviewDraftRepository drafts;
    private final TeachingPlanReviewRepository teachingPlanReviews;
    private final AssessmentTimes times;

    public AdminOverviewQueryService(AdminStudents adminStudents, SchoolAssessmentRepository assessments,
            FeedbackRequestRepository requests, AssessmentResourceRepository resources, EvaluationPlanRepository plans,
            PlanRevisionRepository revisions, PlanAnalysisRunRepository runs, PlanReviewRepository reviews,
            PlanReviewDraftRepository drafts, TeachingPlanReviewRepository teachingPlanReviews, AssessmentTimes times) {
        this.adminStudents = adminStudents;
        this.assessments = assessments;
        this.requests = requests;
        this.resources = resources;
        this.plans = plans;
        this.revisions = revisions;
        this.runs = runs;
        this.reviews = reviews;
        this.drafts = drafts;
        this.teachingPlanReviews = teachingPlanReviews;
        this.times = times;
    }

    /** 학기: 3~8월 1학기, 그 밖 2학기(1·2월은 직전 학년도). academicYear·semester를 주면 그 학기. */
    public AdminOverviewResponse overview(AdminActor admin, String schoolId, Integer academicYear, Integer semester,
            Integer grade) {
        Instant now = times.now();
        LocalDate today = LocalDate.ofInstant(now, ZONE);
        int year = academicYear != null ? academicYear : today.getMonthValue() <= 2 ? today.getYear() - 1 : today.getYear();
        int term = semester != null ? semester : today.getMonthValue() >= 3 && today.getMonthValue() <= 8 ? 1 : 2;

        // ---- 학생·피드백 (담당 범위 + 학교·학년 필터) ----
        List<ExistingStudent> students = adminStudents.inScope(admin).stream()
                .filter(s -> (schoolId == null && grade == null) || adminStudents.context(s.studentId(), year, term)
                        .filter(c -> (schoolId == null || schoolId.equals(c.schoolId())) && (grade == null || grade == c.grade()))
                        .isPresent())
                .toList();
        Set<String> ids = students.stream().map(ExistingStudent::studentId).collect(Collectors.toSet());
        int schoolAssessments = 0;
        for (String id : ids) {
            schoolAssessments += (int) assessments.findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(id).stream()
                    .filter(a -> a.academicYear() == year && a.semester() == term).count();
        }
        List<FeedbackRequest> feedback = ids.isEmpty() ? List.of() : requests.findByStudentIdInOrderByRequestedAtDesc(ids);
        List<FeedbackRequest> pending = feedback.stream().filter(r -> !r.isDelivered()).toList();
        Instant oldestPending = pending.stream().map(FeedbackRequest::requestedAt).filter(Objects::nonNull)
                .min(Comparator.naturalOrder()).orElse(null);
        AdminOverviewResponse.Kpi kpi = new AdminOverviewResponse.Kpi(students.size(), schoolAssessments, 0,
                pending.size(), feedback.size() - pending.size());

        // ---- 평가계획서 (운영 범위 + 학교·학년도·학년 필터, 문서마다 최신 Revision) ----
        // search()는 학교가 정해져야 한다 — 전체 현황은 모든 문서에서 학년도·학년만 거른다
        List<EvaluationPlan> planList = schoolId != null ? plans.search(schoolId, academicYear, grade, null)
                : plans.findAll().stream().filter(p -> (academicYear == null || p.academicYear() == academicYear)
                        && (grade == null || p.grade() == grade)).toList();
        Map<String, EvaluationPlan> planById = planList.stream()
                .collect(Collectors.toMap(EvaluationPlan::id, p -> p, (a, b) -> a, LinkedHashMap::new));
        List<PlanRevision> allRevisions = planById.isEmpty() ? List.of() : revisions.findByPlanIds(planById.keySet());
        Map<String, PlanRevision> latestRevision = new LinkedHashMap<>();
        for (PlanRevision revision : allRevisions) {
            latestRevision.merge(revision.planId(), revision,
                    (a, b) -> b.revisionNumber() > a.revisionNumber() ? b : a);
        }
        List<String> revisionIds = allRevisions.stream().map(PlanRevision::id).toList();
        List<PlanAnalysisRun> allRuns = revisionIds.isEmpty() ? List.of() : runs.findByRevisionIds(revisionIds);
        Map<String, PlanAnalysisRun> latestRun = new LinkedHashMap<>();
        allRuns.forEach(run -> latestRun.put(run.revisionId(), run)); // 오래된 → 최근 순으로 온다
        Set<String> teachingConfirmed = revisionIds.isEmpty() ? Set.of()
                : new HashSet<>(teachingPlanReviews.findReviewedRevisionIds(revisionIds));

        int notRequested = 0, reviewRequired = 0, partial = 0, completed = 0, failed = 0;
        int reviewPending = 0, evaluationConfirmed = 0, teachingPlanConfirmed = 0, reReview = 0;
        for (PlanRevision revision : latestRevision.values()) {
            PlanAnalysisRun run = latestRun.get(revision.id());
            PlanAnalysisStatus status = run == null ? null : run.status();
            if (status == null) {
                notRequested++;
            } else {
                switch (status) {
                    case REVIEW_REQUIRED -> reviewRequired++;
                    case PARTIAL -> partial++;
                    case FAILED -> failed++;
                    default -> completed++;
                }
            }
            boolean usable = status != null && status != PlanAnalysisStatus.FAILED;
            if (revision.isConfirmed()) {
                evaluationConfirmed++;
                if (run != null && drafts.findByAnalysisId(run.id(), PlanReviewDraft.SCOPE_EVALUATION)
                        .filter(PlanReviewDraft::isActive).isPresent()) {
                    reReview++;
                }
            } else if (usable) {
                reviewPending++;
            }
            if (teachingConfirmed.contains(revision.id())) {
                teachingPlanConfirmed++;
            }
        }
        AdminOverviewResponse.EvaluationPlans planCounts = new AdminOverviewResponse.EvaluationPlans(
                (int) planList.stream().map(EvaluationPlan::schoolId).distinct().count(), planList.size(), allRevisions.size(),
                new AdminOverviewResponse.Analysis(notRequested, reviewRequired, partial, completed, failed),
                reviewPending, evaluationConfirmed, teachingPlanConfirmed, reReview);

        // ---- 최근 활동 (실제 기록 시각) ----
        Map<String, PlanRevision> revisionById = allRevisions.stream()
                .collect(Collectors.toMap(PlanRevision::id, r -> r));
        List<AdminOverviewResponse.Activity> recent = new ArrayList<>();
        for (PlanRevision revision : allRevisions) {
            recent.add(activity("PLAN_UPLOADED", revision, null, null, revision.uploadedAt()));
        }
        for (PlanAnalysisRun run : allRuns) {
            PlanRevision revision = revisionById.get(run.revisionId());
            recent.add(activity("PLAN_ANALYZED", revision, run.status().name(), null, run.receivedAt()));
        }
        if (!revisionIds.isEmpty()) {
            for (PlanReview review : reviews.findByRevisionIds(revisionIds)) {
                recent.add(activity("PLAN_CONFIRMED", revisionById.get(review.revisionId()),
                        review.confirmedValues().size() + "개 값", review.reviewedBy(), review.reviewedAt()));
            }
            for (String revisionId : teachingConfirmed) {
                teachingPlanReviews.findByRevisionId(revisionId).ifPresent((TeachingPlanReview review) -> recent.add(
                        activity("TEACHING_PLAN_CONFIRMED", revisionById.get(revisionId), review.rows().size() + "행",
                                review.reviewedBy(), review.reviewedAt())));
            }
        }
        for (FeedbackRequest request : feedback) {
            recent.add(new AdminOverviewResponse.Activity("FEEDBACK_REQUESTED", null, null, request.sourceType(),
                    null, request.studentId(), times.toOffset(request.requestedAt())));
            if (request.isDelivered() && request.deliveredAt() != null) {
                recent.add(new AdminOverviewResponse.Activity("FEEDBACK_DELIVERED", null, null, request.sourceType(),
                        null, request.studentId(), times.toOffset(request.deliveredAt())));
            }
        }
        List<AdminOverviewResponse.Activity> top = recent.stream().filter(a -> a.at() != null)
                .sorted(Comparator.comparing(AdminOverviewResponse.Activity::at).reversed()).limit(RECENT_LIMIT).toList();

        int scraps = resources.findByOwnerTypeAndDeletedAtIsNullOrderByUpdatedAtDesc(AssessmentResource.OWNER_ADMIN).size();
        return new AdminOverviewResponse(kpi, planCounts, times.toOffset(oldestPending),
                new AdminOverviewResponse.ContentCounts(null, scraps), top, times.toOffset(now));
    }

    /** A13 담당 학생의 학교(학교 ID 기준 중복 제거, 학생 수 많은 순 → 이름순). 다른 지점 학생의 학교는 나오지 않는다. */
    public AdminOverviewResponse.ManagedSchools managedSchools(AdminActor admin, Integer academicYear, Integer semester) {
        LocalDate today = LocalDate.ofInstant(times.now(), ZONE);
        int year = academicYear != null ? academicYear : today.getMonthValue() <= 2 ? today.getYear() - 1 : today.getYear();
        int term = semester != null ? semester : today.getMonthValue() >= 3 && today.getMonthValue() <= 8 ? 1 : 2;
        Map<String, String> names = new LinkedHashMap<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        int without = 0;
        for (ExistingStudent student : adminStudents.inScope(admin)) {
            var context = adminStudents.context(student.studentId(), year, term);
            if (context.isEmpty() || context.get().schoolId() == null) {
                without++;
                continue;
            }
            String schoolId = context.get().schoolId();
            names.putIfAbsent(schoolId, context.get().schoolName());
            counts.merge(schoolId, 1, Integer::sum);
        }
        List<AdminOverviewResponse.ManagedSchool> items = counts.entrySet().stream()
                .map(e -> new AdminOverviewResponse.ManagedSchool(e.getKey(), names.get(e.getKey()), e.getValue()))
                .sorted(Comparator.comparing(AdminOverviewResponse.ManagedSchool::studentCount).reversed()
                        .thenComparing(s -> s.name() == null ? s.schoolId() : s.name()))
                .toList();
        return new AdminOverviewResponse.ManagedSchools(year, term, "ASSIGNED_STUDENTS", items, without);
    }

    private AdminOverviewResponse.Activity activity(String type, PlanRevision revision, String detail, String actor,
            Instant at) {
        return new AdminOverviewResponse.Activity(type, revision == null ? null : revision.planId(),
                revision == null ? null : revision.id(), revision == null ? null : revision.fileName(), detail, actor,
                times.toOffset(at));
    }
}
