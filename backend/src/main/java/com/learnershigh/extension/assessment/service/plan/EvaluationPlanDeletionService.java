package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanDeleteResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 평가계획서 문서 삭제 (A25, 2026-11-17 사용자 요구 · api-contract.md §38-9 DRAFT).
 * <ul>
 *   <li>논리 삭제만 한다: 문서에 삭제 표시(deleted_at·deleted_by)를 남기고 Revision·원문 파일·분석 Run·검토·확정 기록·운영계획은 그대로 둔다.</li>
 *   <li>삭제된 문서는 EvaluationPlan의 @SQLRestriction으로 관리자·학생 조회 전부에서 빠진다(학생 공개 해제 포함). 다시 삭제하면 404.</li>
 *   <li>학생에게 공개 중(확정된 Revision이 있음)이면 {@code confirmPublished=true}가 있어야 한다. 없으면 409 — 화면이 영향을 알리고 한 번 더 확인한다.</li>
 *   <li>요청의 schoolId가 문서의 학교와 다르면 404(다른 학교 문서를 잘못 지우지 않게). 운영 권한은 OD-A08 그대로.</li>
 *   <li>그 문서의 Revision을 지금 분석 중이면 409 PLAN_ANALYSIS_IN_PROGRESS.</li>
 * </ul>
 */
@Service
@Transactional
public class EvaluationPlanDeletionService {

    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final PlanAccess access;
    private final PlanAnalysisService analysis;
    private final AssessmentTimes times;

    public EvaluationPlanDeletionService(EvaluationPlanRepository plans, PlanRevisionRepository revisions,
            PlanAccess access, PlanAnalysisService analysis, AssessmentTimes times) {
        this.plans = plans;
        this.revisions = revisions;
        this.access = access;
        this.analysis = analysis;
        this.times = times;
    }

    public PlanDeleteResponse delete(AdminActor admin, String planId, String schoolId, boolean confirmPublished) {
        access.requireOperator(admin);
        EvaluationPlan plan = access.plan(admin, planId);
        if (!plan.schoolId().equals(schoolId)) {
            throw PlanAccess.planNotFound();
        }
        List<PlanRevision> planRevisions = revisions.findByPlanIds(Set.of(plan.id()));
        if (analysis.anyRunning(planRevisions.stream().map(PlanRevision::id).toList())) {
            throw new BusinessException(AssessmentErrorCode.PLAN_ANALYSIS_IN_PROGRESS);
        }
        boolean published = planRevisions.stream().anyMatch(PlanRevision::isConfirmed);
        if (published && !confirmPublished) {
            throw new BusinessException(AssessmentErrorCode.PLAN_DELETE_CONFIRMATION_REQUIRED);
        }
        Instant now = times.now();
        plan.markDeleted(admin.adminId(), now);
        plans.saveAndFlush(plan);
        return new PlanDeleteResponse(plan.id(), plan.schoolId(), now, published, planRevisions.size());
    }
}
