package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AdminEvaluationPlanResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentEvaluationPlanResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
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

    public EvaluationPlanQueryService(EvaluationPlanRepository plans, PlanRevisionRepository revisions,
            PlanAccess access, PlanViews views, AcademicContextProvider contexts, AssessmentTimes times) {
        this.plans = plans;
        this.revisions = revisions;
        this.access = access;
        this.views = views;
        this.contexts = contexts;
        this.times = times;
    }

    public Map<String, List<AdminEvaluationPlanResponse>> adminList(AdminActor admin, String schoolId,
            Integer academicYear, Integer grade, Integer semester) {
        access.requireSchool(admin, schoolId);
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
     * 문서마다 최신 Revision을 보여 준다. AI 후보는 포함하지 않는다.
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
        return items.getFirst();
    }

    private List<StudentEvaluationPlanResponse> toStudent(List<EvaluationPlan> found) {
        if (found.isEmpty()) {
            return List.of();
        }
        Map<String, PlanRevision> latest = revisions.findByPlanIds(found.stream().map(EvaluationPlan::id).toList())
                .stream()
                .collect(Collectors.toMap(PlanRevision::planId, r -> r,
                        (a, b) -> a.revisionNumber() >= b.revisionNumber() ? a : b));
        return found.stream()
                .filter(plan -> latest.containsKey(plan.id()))
                .map(plan -> {
                    PlanRevision revision = latest.get(plan.id());
                    return new StudentEvaluationPlanResponse(plan.id(), revision.id(), plan.schoolId(),
                            plan.academicYear(), plan.grade(), plan.semester(), revision.fileName(),
                            revision.sourceUrl(), revision.reviewStatus().name(), times.toOffset(revision.uploadedAt()));
                })
                .sorted(Comparator.comparing(StudentEvaluationPlanResponse::uploadedAt))
                .toList();
    }
}
