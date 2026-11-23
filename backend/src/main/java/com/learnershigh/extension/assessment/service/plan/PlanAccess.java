package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import org.springframework.stereotype.Component;

/**
 * 관리자 평가계획서 운영 권한 검사.
 * OD-A08 결정(2026-11-13 사용자 승인): 평가계획서 운영 권한이 있는 관리자({@link AdminActor#canOperateEvaluationPlans()})는
 * 모든 학교의 평가계획서를 등록·분석·검토·확정한다. 학교별 운영 목록은 두지 않는다.
 * 인증되지 않은 요청은 이 검사 전에 Actor Resolver가 401로 막는다. 학생 기록 조회 범위(branchIds)와는 별개다.
 * 없는 문서는 404로 응답한다. 계약 §53에 평가계획서 전용 Not Found code가 없어 공통 NOT_FOUND를 쓴다.
 */
@Component
public class PlanAccess {

    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;

    public PlanAccess(EvaluationPlanRepository plans, PlanRevisionRepository revisions) {
        this.plans = plans;
        this.revisions = revisions;
    }

    /** 평가계획서 운영 권한 (학교 무관). 권한 없는 관리자 역할이 생기면 403. */
    public void requireOperator(AdminActor admin) {
        if (admin == null || !admin.canOperateEvaluationPlans()) {
            throw new BusinessException(AssessmentErrorCode.FORBIDDEN, "평가계획서를 관리할 권한이 없습니다.");
        }
    }

    public EvaluationPlan plan(AdminActor admin, String planId) {
        requireOperator(admin);
        return plans.findById(planId).orElseThrow(PlanAccess::planNotFound);
    }

    public PlanRevision revision(EvaluationPlan plan, String revisionId) {
        return revisions.findById(revisionId)
                .filter(revision -> revision.planId().equals(plan.id()))
                .orElseThrow(PlanAccess::planNotFound);
    }

    static BusinessException planNotFound() {
        return new BusinessException(CommonErrorCode.NOT_FOUND, "평가계획서를 찾을 수 없습니다.");
    }
}
