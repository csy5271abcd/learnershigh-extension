package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerClient;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * §39 POST .../revisions/{revisionId}/analysis — Backend가 보관한 원문을 읽어 분석기를 직접 호출하고 결과를 저장한다 (A3, 2026-11-13).
 * Frontend 개발용 Proxy·브라우저 재전송을 거치지 않는다.
 *
 * <p>이 클래스에는 Transaction을 두지 않는다: 분석기 호출(최대 약 2분) 동안 DB Transaction을 잡지 않고, 저장만
 * {@link EvaluationPlanService#recordServerAnalysis}의 짧은 Transaction에서 한다.
 *
 * <ul>
 *   <li>Run 상태는 분석기 판정을 따른다. Envelope PARTIAL(부분 결과)은 PARTIAL Run으로 저장한다(A3.5) —
 *       REVIEW_REQUIRED로 바꾸지 않는다. 분석기 errors[] 코드는 경고(source=ANALYZER_ERROR)로 함께 보존한다.</li>
 *   <li>연결 실패·BUSY·Timeout·응답 오류는 Run을 만들지 않는다 → 기존 Revision·이전 Run·검토는 그대로다.</li>
 *   <li>HWP·HWPX: 분석 결과 계약이 실험 단계(S-8)라 실험 기능이 꺼져 있으면 분석기를 부르지 않고 422(format_contract_pending).</li>
 *   <li>같은 Revision 동시 요청은 409(이 서버 인스턴스 기준). 같은 결과 재요청은 새 Run 없이 기존 Run을 돌려준다.</li>
 * </ul>
 */
@Service
public class PlanAnalysisService {

    private static final String FIELD = "analyzer";

    private final PlanAccess access;
    private final EvaluationPlanQueryService queries;
    private final EvaluationPlanService plans;
    private final PlanAnalyzerClient client;
    private final AnalysisImportParser parser;
    private final DocumentFormatInspector formatInspector;
    private final String analyzerVersion;
    private final Set<String> running = ConcurrentHashMap.newKeySet();

    public PlanAnalysisService(PlanAccess access, EvaluationPlanQueryService queries, EvaluationPlanService plans,
            PlanAnalyzerClient client, AnalysisImportParser parser, DocumentFormatInspector formatInspector,
            @Value("${assessment.analyzer.version:v21.1}") String analyzerVersion) {
        this.access = access;
        this.queries = queries;
        this.plans = plans;
        this.client = client;
        this.parser = parser;
        this.formatInspector = formatInspector;
        this.analyzerVersion = analyzerVersion;
    }

    public EvaluationPlanService.ImportResult analyze(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        if (!revision.hasStoredFile()) {
            throw rejected(AssessmentErrorCode.PLAN_ANALYSIS_UNSUPPORTED, "original_missing");
        }
        if (revision.format() != PlanDocumentFormat.PDF && !formatInspector.experimentalEnabled()) {
            throw rejected(AssessmentErrorCode.PLAN_ANALYSIS_UNSUPPORTED, "format_contract_pending");
        }
        if (!client.configured()) {
            throw new BusinessException(AssessmentErrorCode.PLAN_ANALYZER_NOT_CONFIGURED);
        }
        if (!running.add(revision.id())) {
            throw new BusinessException(AssessmentErrorCode.PLAN_ANALYSIS_IN_PROGRESS);
        }
        try {
            byte[] bytes = queries.verifiedBytes(revision);
            PlanAnalyzerClient.Result result;
            try {
                result = client.analyze(new PlanAnalyzerClient.Request(bytes, revision.fileName(), fileId(revision),
                        analyzerVersion));
            } catch (PlanAnalyzerException failure) {
                throw translate(failure);
            }
            if (!revision.sha256().equals(result.sourceSha256())) {
                throw rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, "sha_mismatch");
            }
            if (result.payloadJson() == null || !result.importable()) {
                String reason = result.blockerCodes().isEmpty() ? "not_importable"
                        : "not_importable:" + String.join(",", result.blockerCodes()).toLowerCase(Locale.ROOT);
                throw rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, reason);
            }
            AnalysisImportRequest request;
            try {
                request = parser.parse(result.payloadJson());
            } catch (BusinessException invalid) {
                throw rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, "payload_invalid");
            }
            PlanAnalysisStatus status = runStatus(result.envelopeStatus(), request.status());
            return plans.recordServerAnalysis(admin, planId, revisionId, request, status, result.warnings(),
                    result.errorCodes(), List.of());
        } finally {
            running.remove(revision.id());
        }
    }

    /**
     * 분석기 Envelope 판정 → 저장 상태. 분석기 Adapter는 과목이 하나라도 있으면 payload status를 REVIEW_REQUIRED로 내므로
     * Envelope 판정을 먼저 본다. PARTIAL은 payload가 후보를 담은 경우(REVIEW_REQUIRED)에만 PARTIAL로 저장한다.
     * 알 수 없거나 payload와 모순되는 판정(PARTIAL인데 payload FAILED 등)은 저장하지 않는다(502 status_conflict).
     */
    static PlanAnalysisStatus runStatus(String envelopeStatus, String payloadStatus) {
        return switch (envelopeStatus) {
            case "PARTIAL" -> {
                if (!"REVIEW_REQUIRED".equals(payloadStatus)) {
                    throw rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, "status_conflict");
                }
                yield PlanAnalysisStatus.PARTIAL;
            }
            case "OK_REVIEW_REQUIRED" -> PlanAnalysisStatus.valueOf(payloadStatus);
            case "PARSE_FAILED" -> {
                if (!"FAILED".equals(payloadStatus)) {
                    throw rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, "status_conflict");
                }
                yield PlanAnalysisStatus.FAILED;
            }
            default -> throw rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, "unknown_status");
        };
    }

    private static BusinessException translate(PlanAnalyzerException failure) {
        String code = failure.analyzerCode() == null ? null : failure.analyzerCode().toLowerCase(Locale.ROOT);
        return switch (failure.kind()) {
            case NOT_CONFIGURED -> new BusinessException(AssessmentErrorCode.PLAN_ANALYZER_NOT_CONFIGURED);
            case CONNECTION_FAILED -> rejected(AssessmentErrorCode.PLAN_ANALYZER_UNAVAILABLE, "connection_failed");
            case BUSY -> rejected(AssessmentErrorCode.PLAN_ANALYZER_UNAVAILABLE, "busy");
            case TIMEOUT -> rejected(AssessmentErrorCode.PLAN_ANALYZER_UNAVAILABLE, "timeout");
            case AUTH_FAILED -> rejected(AssessmentErrorCode.PLAN_ANALYZER_UNAVAILABLE, "analyzer_auth_failed");
            case REJECTED -> rejected(AssessmentErrorCode.PLAN_ANALYSIS_UNSUPPORTED,
                    code == null ? "analyzer_rejected" : "analyzer_rejected:" + code);
            case SERVER_ERROR -> rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE,
                    code == null ? "analyzer_error" : "analyzer_error:" + code);
            case BAD_RESPONSE -> rejected(AssessmentErrorCode.PLAN_ANALYZER_BAD_RESPONSE, "invalid_response");
        };
    }

    private static BusinessException rejected(AssessmentErrorCode code, String reason) {
        return BusinessException.withFields(code, new FieldViolation(FIELD, reason));
    }

    /** 분석기 fileId 규칙([A-Za-z0-9_-]{1,40})에 맞춘 Revision 기반 ID. 분석기 로그와 이 Revision을 잇는다. */
    static String fileId(PlanRevision revision) {
        String id = revision.id().replace("plan_rev_", "rev").replaceAll("[^A-Za-z0-9_]", "");
        return id.length() > 40 ? id.substring(id.length() - 40) : id;
    }
}
