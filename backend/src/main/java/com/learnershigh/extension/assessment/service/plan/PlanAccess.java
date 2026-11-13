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
 * 관리자 평가계획서 운영 권한 검사 (OD-A08 미결: 학교별로 명시적으로 받은 운영 권한만 인정, 학생 기록 조회 권한과 분리).
 * 없는 문서와 권한 밖 문서는 같은 404로 응답한다. 계약 §53에 평가계획서 전용 Not Found code가 없어 공통 NOT_FOUND를 쓴다.
 */
@Component
public class PlanAccess {

    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;

    public PlanAccess(EvaluationPlanRepository plans, PlanRevisionRepository revisions) {
        this.plans = plans;
        this.revisions = revisions;
    }

    public void requireSchool(AdminActor admin, String schoolId) {
        if (!admin.canOperatePlansOf(schoolId)) {
            throw new BusinessException(AssessmentErrorCode.FORBIDDEN, "이 학교의 평가계획서를 관리할 권한이 없습니다.");
        }
    }

    public EvaluationPlan plan(AdminActor admin, String planId) {
        return plans.findById(planId)
                .filter(plan -> admin.canOperatePlansOf(plan.schoolId()))
                .orElseThrow(PlanAccess::planNotFound);
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
