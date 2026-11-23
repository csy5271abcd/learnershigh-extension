package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A10 §38-6 HWP·HWPX 원문 구조 미리보기 (관리자 전용, 평가계획서 운영 권한 OD-A08).
 *
 * <p>보관된 원본 바이트를 크기·SHA-256 확인 뒤 메모리에서만 읽는다. 원본·Revision·Storage에 아무것도 쓰지 않으며
 * 임시 파일·파생 파일(PDF Rendition)을 만들지 않는다. 판독 결과는 저장하지 않는다(요청마다 원본에서 다시 읽는다 —
 * Revision 원문은 바뀌지 않으므로 오래된 결과가 남을 일이 없다).
 */
@Service
@Transactional(readOnly = true)
public class PlanStructurePreviewQueryService {

    private final PlanAccess access;
    private final EvaluationPlanQueryService files;
    private final long timeoutMillis;

    public PlanStructurePreviewQueryService(PlanAccess access, EvaluationPlanQueryService files,
            @Value("${assessment.plan-preview.structure-timeout-ms:10000}") long timeoutMillis) {
        this.access = access;
        this.files = files;
        this.timeoutMillis = timeoutMillis;
    }

    public PlanStructurePreviewResponse admin(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        if (!revision.hasStoredFile()) {
            throw new BusinessException(CommonErrorCode.NOT_FOUND, "이 개정본은 원문 파일을 보관하지 않았습니다.");
        }
        if (revision.format() == PlanDocumentFormat.PDF) {
            throw new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE); // PDF는 기존 /preview
        }
        byte[] bytes = files.verifiedBytes(revision);
        return render(plan.id(), revision.id(), revision.format(), revision.sha256(), bytes, timeoutMillis);
    }

    /** 판독만 (권한·무결성 확인 뒤 호출). 시험이 같은 경로로 실제 문서를 읽는다. */
    static PlanStructurePreviewResponse render(String planId, String revisionId, PlanDocumentFormat format, String sha256,
            byte[] bytes, long timeoutMillis) {
        StructureBudget budget = new StructureBudget(timeoutMillis);
        try {
            List<PlanStructurePreviewResponse.Block> blocks;
            int sections;
            List<String> notices = new ArrayList<>();
            PlanStructurePreviewResponse.Renderer renderer;
            if (format == PlanDocumentFormat.HWP) {
                HwpStructureReader.Result result = HwpStructureReader.read(bytes, budget);
                blocks = result.blocks();
                sections = result.sections();
                notices.addAll(result.notices());
                renderer = new PlanStructurePreviewResponse.Renderer(HwpStructureReader.NAME, HwpStructureReader.VERSION);
            } else {
                HwpxStructureReader.Result result = HwpxStructureReader.read(bytes, budget);
                blocks = result.blocks();
                sections = result.sections();
                notices.addAll(result.notices());
                renderer = new PlanStructurePreviewResponse.Renderer(HwpxStructureReader.NAME, HwpxStructureReader.VERSION);
            }
            return new PlanStructurePreviewResponse(planId, revisionId, format.name(), sha256, renderer, sections,
                    new PlanStructurePreviewResponse.Stats(budget.paragraphs, budget.tables, budget.cells,
                            budget.textChars()),
                    notices, blocks);
        } catch (StructureBudget.Failure failure) {
            throw BusinessException.withFields(AssessmentErrorCode.PLAN_PREVIEW_FAILED,
                    new FieldViolation("file", failure.reason()));
        }
    }
}
