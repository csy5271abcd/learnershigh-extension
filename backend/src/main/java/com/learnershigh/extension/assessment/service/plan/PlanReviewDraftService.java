package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftResponse;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanManualRowRequest;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.assessment.entity.PlanReviewDraft;
import com.learnershigh.extension.assessment.entity.PlanReviewDraftEvent;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewDraftEventRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewDraftRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewRepository;
import com.learnershigh.extension.assessment.repository.TeachingPlanReviewRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 관리자 공유 검토 초안 (A5, 2026-11-14 사용자 승인). Actor: 평가계획서 운영 권한이 있는 ADMIN(OD-A08: 인증된 관리자 모두).
 * <ul>
 *   <li>초안은 이 Revision의 <b>가장 최근 분석 결과</b>에만 저장한다. 예전 결과에 묶인 초안은 보존하지만 새 결과에 적용하지 않는다(409 STALE).</li>
 *   <li>동시 저장: 요청 baseVersion ≠ 현재 version이면 409 CONFLICT(현재 version·저장자 안내). 같은 순간 두 저장은 @Version이 막는다.</li>
 *   <li>확정된 Revision에는 초안을 저장하지 않는다(재검토 정책 미결 — 기존 동작 유지). 확정되면 초안을 닫는다({@link #closeOnConfirm}).</li>
 *   <li>범위(scope, A7 2026-11-15): 평가 정보 초안(EVALUATION)과 월별 운영계획 초안(TEACHING_PLAN)은 분석 결과마다 하나씩 따로 둔다.
 *       평가 정보 확정은 EVALUATION만 닫고, 운영계획 초안은 운영계획 확정(§39-6) 때 닫는다. fieldPath도 범위별로 나눈다.</li>
 *   <li>초안은 학생 응답 어디에도 들어가지 않는다. 학생 공개는 확정값(Review)뿐이다.</li>
 *   <li>후보값(candidate)은 서버가 분석 결과에서 직접 읽어 저장한다(화면이 보낸 값을 믿지 않는다).</li>
 * </ul>
 */
@Service
@Transactional
public class PlanReviewDraftService {

    private static final int HISTORY_LIMIT = 20;
    private static final int CHANGED_PATHS_LIMIT = 50;
    private static final Pattern SEGMENT = Pattern.compile("([A-Za-z][A-Za-z0-9]*)|\\[(\\d{1,3})]");

    private final PlanAccess access;
    private final PlanAnalysisRunRepository runs;
    private final PlanReviewDraftRepository drafts;
    private static final Pattern TEACHING_PLAN_ROW = Pattern.compile("teachingPlan\\[(0|[1-9]\\d{0,2})]");

    private final PlanReviewDraftEventRepository events;
    private final TeachingPlanReviewRepository teachingPlanReviews;
    private final PlanReviewRepository reviews;
    private final AssessmentTimes times;
    private final JsonMapper mapper;

    public PlanReviewDraftService(PlanAccess access, PlanAnalysisRunRepository runs, PlanReviewDraftRepository drafts,
            PlanReviewDraftEventRepository events, TeachingPlanReviewRepository teachingPlanReviews,
            PlanReviewRepository reviews, AssessmentTimes times, JsonMapper mapper) {
        this.access = access;
        this.runs = runs;
        this.drafts = drafts;
        this.events = events;
        this.teachingPlanReviews = teachingPlanReviews;
        this.reviews = reviews;
        this.times = times;
        this.mapper = mapper;
    }

    /** 저장 본문 (payload_json) */
    record Payload(List<PlanReviewDraftResponse.StoredDecision> decisions,
            List<PlanReviewDraftRequest.SubjectLink> subjectLinks,
            // A14: 운영계획 초안의 관리자 직접 추가 행(이전 초안 JSON에는 없음 → 빈 목록)
            List<PlanReviewDraftResponse.ManualRow> manualRows,
            // A27-UX 관리자 추가 수정: 이 문서 검토 대상에서 뺀 분석 과목(이전 초안 JSON에는 없음 → 빈 목록)
            List<PlanReviewDraftRequest.SubjectExclusion> subjectExclusions) {

        Payload {
            manualRows = manualRows == null ? List.of() : List.copyOf(manualRows);
            subjectExclusions = subjectExclusions == null ? List.of() : List.copyOf(subjectExclusions);
        }

        Payload(List<PlanReviewDraftResponse.StoredDecision> decisions,
                List<PlanReviewDraftRequest.SubjectLink> subjectLinks,
                List<PlanReviewDraftResponse.ManualRow> manualRows) {
            this(decisions, subjectLinks, manualRows, List.of());
        }

        Payload(List<PlanReviewDraftResponse.StoredDecision> decisions,
                List<PlanReviewDraftRequest.SubjectLink> subjectLinks) {
            this(decisions, subjectLinks, List.of(), List.of());
        }
    }

    @Transactional(readOnly = true)
    public PlanReviewDraftResponse get(AdminActor admin, String planId, String revisionId) {
        return get(admin, planId, revisionId, PlanReviewDraft.SCOPE_EVALUATION);
    }

    /** §39-6 운영계획 초안 조회 (A7). 평가 정보 확정 여부와 무관하다. */
    @Transactional(readOnly = true)
    public PlanReviewDraftResponse getTeachingPlan(AdminActor admin, String planId, String revisionId) {
        return get(admin, planId, revisionId, PlanReviewDraft.SCOPE_TEACHING_PLAN);
    }

    private PlanReviewDraftResponse get(AdminActor admin, String planId, String revisionId, String scope) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        return view(plan, revision, latestRun(revision), scope);
    }

    public PlanReviewDraftResponse save(AdminActor admin, String planId, String revisionId,
            PlanReviewDraftRequest request) {
        return save(admin, planId, revisionId, request, PlanReviewDraft.SCOPE_EVALUATION);
    }

    /**
     * §39-6 운영계획 초안 저장 (A7). 평가 정보가 확정된 뒤에도 저장한다(평가 확정값은 건드리지 않음).
     * 운영계획이 이미 확정된 Revision에는 저장하지 않는다(재확정 정책 미결).
     */
    public PlanReviewDraftResponse saveTeachingPlan(AdminActor admin, String planId, String revisionId,
            PlanReviewDraftRequest request) {
        return save(admin, planId, revisionId, request, PlanReviewDraft.SCOPE_TEACHING_PLAN);
    }

    private PlanReviewDraftResponse save(AdminActor admin, String planId, String revisionId,
            PlanReviewDraftRequest request, String scope) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        boolean teachingPlan = PlanReviewDraft.SCOPE_TEACHING_PLAN.equals(scope);
        Optional<PlanAnalysisRun> latest = latestRun(revision);
        if (teachingPlan && teachingPlanReviews.findByRevisionId(revision.id()).isPresent()
                && !draftOpen(latest, PlanReviewDraft.SCOPE_TEACHING_PLAN)) {
            // A13: 확정된 운영계획은 재검토를 시작한 뒤에만 초안을 받는다
            throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    new FieldViolation("revision", "teaching_plan_already_confirmed"));
        }
        if (!teachingPlan && revision.isConfirmed() && !reReviewOpen(latest)) {
            // A12: 확정된 Revision은 재검토를 시작(POST .../review-draft/reopen)한 뒤에만 초안을 받는다
            throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    new FieldViolation("revision", "already_confirmed"));
        }
        if (latest.isEmpty() || !latest.get().id().equals(request.analysisId())) {
            boolean known = runs.findById(request.analysisId()).filter(r -> r.revisionId().equals(revision.id())).isPresent();
            if (!known) {
                throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("analysisId", "unknown"));
            }
            throw stale(latest.map(PlanAnalysisRun::id).orElse(null));
        }
        PlanAnalysisRun run = latest.get();
        if (run.status() == PlanAnalysisStatus.FAILED) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("analysisId", "analysis_failed"));
        }
        Payload payload = validate(request, run, revision, teachingPlan);
        if (teachingPlan) {
            // A14: 행 결정 저장(자동 저장)은 관리자 추가 행을 바꾸지 않는다 — 추가 행은 전용 API로만 생성·수정한다
            Optional<PlanReviewDraft> held = drafts.findByAnalysisId(run.id(), scope);
            if (held.isPresent()) {
                payload = new Payload(payload.decisions(), payload.subjectLinks(), read(held.get()).manualRows());
            }
        } else if (request.subjectExclusions() == null) {
            // 과목 제외 필드를 보내지 않은 저장(이전 클라이언트)은 기존 제외를 그대로 둔다 — 조용히 복원하지 않는다
            Optional<PlanReviewDraft> held = drafts.findByAnalysisId(run.id(), scope);
            if (held.isPresent()) {
                Payload before = read(held.get());
                payload = new Payload(payload.decisions(), payload.subjectLinks(), before.manualRows(), before.subjectExclusions());
            }
        }
        String payloadJson = mapper.writeValueAsString(payload);
        Instant now = times.now();

        Optional<PlanReviewDraft> existing = drafts.findByAnalysisId(run.id(), scope);
        PlanReviewDraft draft;
        List<String> changed;
        if (existing.isEmpty()) {
            if (request.baseVersion() != null) {
                // 화면은 초안이 있다고 알고 있지만 서버에는 없다 (예: 다른 결과에서 온 화면) — 새로 만들지 않고 다시 읽게 한다
                throw conflict(null);
            }
            draft = PlanReviewDraft.start(scope, revision.id(), run.id(), revision.sha256(), run.analyzerVersion(), payloadJson,
                    payload.decisions().size(), admin.adminId(), now);
            changed = changedPaths(new Payload(List.of(), List.of()), payload);
            try {
                draft = drafts.saveAndFlush(draft);
            } catch (DataIntegrityViolationException raced) {
                // 같은 순간 다른 관리자가 먼저 초안을 만들었다
                throw conflict(null);
            }
        } else {
            draft = existing.get();
            if (!draft.isActive()) {
                throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                        new FieldViolation("draft", "closed"));
            }
            if (request.baseVersion() == null || draft.version() != request.baseVersion()) {
                throw conflict(draft);
            }
            changed = changedPaths(read(draft), payload);
            draft.replace(payloadJson, payload.decisions().size(), admin.adminId(), now);
            draft = drafts.saveAndFlush(draft);
        }
        events.save(PlanReviewDraftEvent.record(draft.id(), draft.version(), admin.adminId(), now, changed.size(),
                mapper.writeValueAsString(changed.stream().limit(CHANGED_PATHS_LIMIT).toList())));
        return view(plan, revision, Optional.of(run), scope);
    }

    private boolean reReviewOpen(Optional<PlanAnalysisRun> latest) {
        return draftOpen(latest, PlanReviewDraft.SCOPE_EVALUATION);
    }

    private boolean draftOpen(Optional<PlanAnalysisRun> latest, String scope) {
        return latest.flatMap(run -> drafts.findByAnalysisId(run.id(), scope)).filter(PlanReviewDraft::isActive).isPresent();
    }

    /** A13: 이 분석 결과의 운영계획 초안이 열려 있는가(확정된 운영계획의 재확정 허용 조건). */
    @Transactional(readOnly = true)
    public boolean teachingPlanDraftOpen(String analysisId) {
        return drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_TEACHING_PLAN).filter(PlanReviewDraft::isActive).isPresent();
    }

    /**
     * A13 운영계획 재검토 시작 (POST .../teaching-plan-draft/reopen). 운영계획이 확정된 Revision만(아니면 409 teaching_plan_not_confirmed).
     * 확정으로 닫힌 운영계획 초안을 다시 열거나, 없으면 최신 확정 행으로 새 초안을 채운다(같은 분석 결과일 때만).
     * 평가 정보 초안·확정은 건드리지 않는다. 재확정 전까지 학생에게는 최신 확정 버전이 그대로 보인다.
     */
    public PlanReviewDraftResponse reopenTeachingPlan(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        Optional<com.learnershigh.extension.assessment.entity.TeachingPlanReview> confirmed =
                teachingPlanReviews.findByRevisionId(revision.id());
        if (confirmed.isEmpty()) {
            throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    new FieldViolation("revision", "teaching_plan_not_confirmed"));
        }
        PlanAnalysisRun run = latestRun(revision).orElseThrow(() -> BusinessException.withFields(
                AssessmentErrorCode.INVALID_STATE_TRANSITION, new FieldViolation("analysisId", "unknown")));
        Instant now = times.now();
        Optional<PlanReviewDraft> existing = drafts.findByAnalysisId(run.id(), PlanReviewDraft.SCOPE_TEACHING_PLAN);
        PlanReviewDraft draft;
        if (existing.isPresent()) {
            draft = existing.get();
            if (draft.isActive()) {
                throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                        new FieldViolation("draft", "already_open"));
            }
            draft.reopenForReReview(admin.adminId(), now);
            draft = drafts.saveAndFlush(draft);
        } else {
            Payload payload = confirmed.get().analysisId().equals(run.id())
                    ? prefillFromTeachingPlan(confirmed.get(), run) : new Payload(List.of(), List.of());
            draft = PlanReviewDraft.start(PlanReviewDraft.SCOPE_TEACHING_PLAN, revision.id(), run.id(), revision.sha256(),
                    run.analyzerVersion(), mapper.writeValueAsString(payload), payload.decisions().size(), admin.adminId(), now);
            try {
                draft = drafts.saveAndFlush(draft);
            } catch (DataIntegrityViolationException raced) {
                throw conflict(null);
            }
        }
        events.save(PlanReviewDraftEvent.record(draft.id(), draft.version(), admin.adminId(), now, 0,
                mapper.writeValueAsString(List.of("reopened"))));
        return view(plan, revision, Optional.of(run), PlanReviewDraft.SCOPE_TEACHING_PLAN);
    }

    /** 확정 행 → 운영계획 초안 결정(teachingPlan[n]): CONFIRMED 그대로, EXCLUDED → ABSENT, EDITED → 고친 칸만 edits JSON. */
    private Payload prefillFromTeachingPlan(com.learnershigh.extension.assessment.entity.TeachingPlanReview review,
            PlanAnalysisRun run) {
        JsonNode subjects = mapper.readTree(run.resultJson());
        List<PlanReviewDraftResponse.StoredDecision> decisions = new ArrayList<>();
        Map<Integer, String> links = new LinkedHashMap<>();
        List<PlanReviewDraftResponse.ManualRow> manualRows = new ArrayList<>();
        for (com.learnershigh.extension.assessment.entity.TeachingPlanReviewRow row : review.rows()) {
            int index = row.analysisSubjectIndex();
            if (index < 0 || index >= subjects.size()) {
                continue;
            }
            if (row.manual()) {
                // A14: 관리자 추가 행은 같은 키로 초안에 다시 둔다(제외였으면 제외 상태로)
                links.putIfAbsent(index, row.subjectId());
                manualRows.add(TeachingPlanManualRows.fromConfirmed(mapper, row, review.reviewedBy(),
                        times.toOffset(review.reviewedAt())));
                continue;
            }
            JsonNode rows = subjects.get(index).get("teachingPlan");
            int position = -1;
            for (int i = 0; rows != null && rows.isArray() && i < rows.size(); i++) {
                if (row.rowKey().equals(rows.get(i).path("rowKey").asText(null))) {
                    position = i;
                    break;
                }
            }
            if (position < 0) {
                continue;
            }
            links.putIfAbsent(index, row.subjectId());
            String fieldPath = "teachingPlan[" + position + "]";
            String decision = switch (row.decision()) {
                case "EXCLUDED" -> "ABSENT";
                case "EDITED" -> "EDITED";
                default -> "CONFIRMED";
            };
            String value = null;
            if ("EDITED".equals(decision)) {
                JsonNode finalRow = mapper.readTree(row.rowJson());
                JsonNode candidate = mapper.readTree(row.candidateJson());
                tools.jackson.databind.node.ObjectNode edits = mapper.createObjectNode();
                for (String key : List.of("unit", "content", "note", "specialSchedule", "schedule")) {
                    JsonNode now = finalRow.get(key);
                    if (!Objects.equals(now, candidate.get(key))) {
                        edits.set(key, now == null ? tools.jackson.databind.node.NullNode.getInstance() : now);
                    }
                }
                value = edits.toString();
            }
            Integer page = null;
            JsonNode sources = mapper.readTree(row.rowJson()).get("sources");
            if (sources != null && sources.isArray() && !sources.isEmpty() && sources.get(0).has("pdfPageNumber")
                    && sources.get(0).get("pdfPageNumber").isNumber()) {
                page = sources.get(0).get("pdfPageNumber").asInt();
            }
            decisions.add(new PlanReviewDraftResponse.StoredDecision(index, fieldPath, decision, value, page,
                    candidate(subjects.get(index), fieldPath)));
        }
        return new Payload(decisions, links.entrySet().stream()
                .map(e -> new PlanReviewDraftRequest.SubjectLink(e.getKey(), e.getValue())).toList(), manualRows);
    }

    /** 부록 O §39-13: 이 분석 결과의 평가 정보 초안 version(없으면 empty). 한 번에 확정의 stale 검사용. */
    @Transactional(readOnly = true)
    public java.util.Optional<Long> evaluationDraftVersion(String analysisId) {
        return drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_EVALUATION).map(PlanReviewDraft::version);
    }

    /** A12: 이 분석 결과의 평가 정보 초안이 열려 있는가(확정된 Revision의 재확정 허용 조건). */
    @Transactional(readOnly = true)
    public boolean evaluationDraftOpen(String analysisId) {
        return drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_EVALUATION).filter(PlanReviewDraft::isActive).isPresent();
    }

    /**
     * A12 재검토 시작 (POST .../review-draft/reopen). 확정된 Revision만. 최신 분석 결과의 평가 정보 초안을 다시 열거나,
     * 초안이 없으면(API로 확정한 경우 등) 그 분석 결과로 확정한 최신 확정값으로 새 초안을 만든다(과목 번호가 있는 값만 채움).
     * 이전 확정 기록·학생 공개값은 바뀌지 않는다. 이미 열려 있으면 409(draft: already_open).
     */
    public PlanReviewDraftResponse reopen(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        if (!revision.isConfirmed()) {
            throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    new FieldViolation("revision", "not_confirmed"));
        }
        PlanAnalysisRun run = latestRun(revision).orElseThrow(() -> BusinessException.withFields(
                AssessmentErrorCode.INVALID_STATE_TRANSITION, new FieldViolation("analysisId", "unknown")));
        if (run.status() == PlanAnalysisStatus.FAILED) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("analysisId", "analysis_failed"));
        }
        Instant now = times.now();
        Optional<PlanReviewDraft> existing = drafts.findByAnalysisId(run.id(), PlanReviewDraft.SCOPE_EVALUATION);
        PlanReviewDraft draft;
        if (existing.isPresent()) {
            draft = existing.get();
            if (draft.isActive()) {
                throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                        new FieldViolation("draft", "already_open"));
            }
            draft.reopenForReReview(admin.adminId(), now);
            draft = drafts.saveAndFlush(draft);
        } else {
            Payload payload = prefillFromLatestReview(revision, run);
            draft = PlanReviewDraft.start(PlanReviewDraft.SCOPE_EVALUATION, revision.id(), run.id(), revision.sha256(),
                    run.analyzerVersion(), mapper.writeValueAsString(payload), payload.decisions().size(), admin.adminId(), now);
            try {
                draft = drafts.saveAndFlush(draft);
            } catch (DataIntegrityViolationException raced) {
                throw conflict(null);
            }
        }
        events.save(PlanReviewDraftEvent.record(draft.id(), draft.version(), admin.adminId(), now, 0,
                mapper.writeValueAsString(List.of("reopened"))));
        return view(plan, revision, Optional.of(run), PlanReviewDraft.SCOPE_EVALUATION);
    }

    /** 최신 확정값(이 분석 결과로 확정한 것)에서 초안 결정을 채운다. 과목 번호가 없는 값은 과목을 알 수 없어 넣지 않는다. */
    private Payload prefillFromLatestReview(PlanRevision revision, PlanAnalysisRun run) {
        List<PlanReview> all = reviews.findByRevisionIds(List.of(revision.id()));
        if (all.isEmpty() || !all.getLast().analysisId().equals(run.id())) {
            return new Payload(List.of(), List.of());
        }
        JsonNode subjects = mapper.readTree(run.resultJson());
        List<PlanReviewDraftResponse.StoredDecision> decisions = new ArrayList<>();
        java.util.Map<Integer, String> links = new java.util.LinkedHashMap<>();
        for (PlanReview.PlanConfirmedValue value : all.getLast().confirmedValues()) {
            Integer index = value.analysisSubjectIndex();
            if (index == null || index < 0 || index >= subjects.size()) {
                continue;
            }
            links.putIfAbsent(index, value.subjectId());
            String text = null;
            if (value.valueJson() != null) {
                JsonNode node = mapper.readTree(value.valueJson());
                text = node.isTextual() ? node.asText() : node.toString();
            }
            decisions.add(new PlanReviewDraftResponse.StoredDecision(index, value.fieldPath(),
                    text == null ? "ABSENT" : "EDITED", text, value.pdfPageNumber(),
                    candidate(subjects.get(index), value.fieldPath())));
        }
        return new Payload(decisions, links.entrySet().stream()
                .map(e -> new PlanReviewDraftRequest.SubjectLink(e.getKey(), e.getValue())).toList());
    }

    /** 최종 확정(PUT review)과 같은 Transaction에서 호출: 그 분석 결과의 초안을 닫는다. 초안이 없으면 아무것도 하지 않는다. */
    /**
     * A14 §39-11 관리자 직접 추가 행 생성(rowKey = null) · 수정(rowKey). 운영계획 초안에만 저장한다(학생 비공개).
     * 저장 규칙은 운영계획 초안 저장과 같다: 최신 분석 결과만, 확정된 운영계획은 재검토 중에만, baseVersion 낙관적 잠금
     * (초안이 없으면 null → 새 초안). 같은 요청을 다시 보내면 version이 이미 올라가 409 — 행이 두 번 생기지 않는다.
     * 수정은 같은 초안에 있는 키만(없으면 404 — 다른 Revision·다른 분석 결과의 키 포함), 과목(subjectIndex)은 바꿀 수 없다.
     */
    public PlanReviewDraftResponse writeManualRow(AdminActor admin, String planId, String revisionId, String rowKey,
            TeachingPlanManualRowRequest request) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        String scope = PlanReviewDraft.SCOPE_TEACHING_PLAN;
        Optional<PlanAnalysisRun> latest = latestRun(revision);
        if (teachingPlanReviews.findByRevisionId(revision.id()).isPresent() && !draftOpen(latest, scope)) {
            throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    new FieldViolation("revision", "teaching_plan_already_confirmed"));
        }
        if (latest.isEmpty() || !latest.get().id().equals(request.analysisId())) {
            boolean known = runs.findById(request.analysisId()).filter(r -> r.revisionId().equals(revision.id())).isPresent();
            if (!known) {
                throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("analysisId", "unknown"));
            }
            throw stale(latest.map(PlanAnalysisRun::id).orElse(null));
        }
        PlanAnalysisRun run = latest.get();
        JsonNode subjects = mapper.readTree(run.resultJson());
        if (run.status() == PlanAnalysisStatus.FAILED || TeachingPlanQueryService.candidateRowCount(subjects) == 0) {
            // 분석 결과에 운영계획이 전혀 없는 문서의 수동 전체 작성은 이번 범위가 아니다
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("analysisId",
                    run.status() == PlanAnalysisStatus.FAILED ? "analysis_failed" : "no_teaching_plan"));
        }
        Optional<PlanReviewDraft> existing = drafts.findByAnalysisId(run.id(), scope);
        if (existing.isEmpty()) {
            if (rowKey != null) {
                throw manualRowNotFound();
            }
            if (request.baseVersion() != null) {
                throw conflict(null);
            }
        } else {
            if (!existing.get().isActive()) {
                throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                        new FieldViolation("draft", "closed"));
            }
            if (request.baseVersion() == null || existing.get().version() != request.baseVersion()) {
                throw conflict(existing.get());
            }
        }
        Payload current = existing.map(this::read).orElse(new Payload(List.of(), List.of()));
        List<PlanReviewDraftResponse.ManualRow> rows = new ArrayList<>(current.manualRows());
        List<FieldViolation> violations = new ArrayList<>();
        TeachingPlanManualRows.validate("row", request.row(), subjects.isArray() ? subjects.size() : 0,
                revision.pageCount(), violations);
        Instant now = times.now();
        java.time.OffsetDateTime at = times.toOffset(now);
        String key;
        if (rowKey == null) {
            if (rows.size() >= TeachingPlanManualRows.MAX_ROWS) {
                violations.add(new FieldViolation("row", "too_many"));
            }
            key = TeachingPlanManualRows.newKey(subjects, request.row().subjectIndex(), rows);
            if (violations.isEmpty()) {
                rows.add(TeachingPlanManualRows.of(key, request.row(), admin.adminId(), at, admin.adminId(), at));
            }
        } else {
            key = rowKey;
            int position = -1;
            for (int i = 0; i < rows.size(); i++) {
                if (rows.get(i).rowKey().equals(rowKey)) {
                    position = i;
                }
            }
            if (position < 0) {
                throw manualRowNotFound();
            }
            PlanReviewDraftResponse.ManualRow before = rows.get(position);
            if (before.subjectIndex() != request.row().subjectIndex()) {
                violations.add(new FieldViolation("row.subjectIndex", "conflict"));
            }
            if (violations.isEmpty()) {
                rows.set(position, TeachingPlanManualRows.of(key, request.row(), before.createdBy(), before.createdAt(),
                        admin.adminId(), at));
            }
        }
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        Payload payload = new Payload(current.decisions(), current.subjectLinks(), rows);
        String payloadJson = mapper.writeValueAsString(payload);
        PlanReviewDraft draft;
        if (existing.isEmpty()) {
            draft = PlanReviewDraft.start(scope, revision.id(), run.id(), revision.sha256(), run.analyzerVersion(),
                    payloadJson, payload.decisions().size(), admin.adminId(), now);
            try {
                draft = drafts.saveAndFlush(draft);
            } catch (DataIntegrityViolationException raced) {
                throw conflict(null);
            }
        } else {
            draft = existing.get();
            draft.replace(payloadJson, payload.decisions().size(), admin.adminId(), now);
            draft = drafts.saveAndFlush(draft);
        }
        events.save(PlanReviewDraftEvent.record(draft.id(), draft.version(), admin.adminId(), now, 1,
                mapper.writeValueAsString(List.of(request.row().subjectIndex() + "|manual:" + key))));
        return view(plan, revision, Optional.of(run), scope);
    }

    /** A14: 확정 요청이 가리키는 관리자 추가 행(열려 있는 운영계획 초안에 있는 것만). 키 → 행 */
    @Transactional(readOnly = true)
    public Map<String, PlanReviewDraftResponse.ManualRow> openManualRows(String analysisId) {
        Map<String, PlanReviewDraftResponse.ManualRow> rows = new LinkedHashMap<>();
        drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_TEACHING_PLAN).filter(PlanReviewDraft::isActive)
                .ifPresent(draft -> read(draft).manualRows().forEach(row -> rows.put(row.rowKey(), row)));
        return rows;
    }

    private static BusinessException manualRowNotFound() {
        return new BusinessException(CommonErrorCode.NOT_FOUND, "운영계획 추가 행을 찾을 수 없습니다.");
    }

    public void closeOnConfirm(String analysisId, String adminId, Instant now) {
        // 평가 정보 초안만 닫는다. 운영계획 초안은 운영계획 확정 때 닫는다 (A7)
        drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_EVALUATION)
                .ifPresent(draft -> draft.closeConfirmed(adminId, now));
    }

    /** 운영계획 확정(§39-6)과 같은 Transaction에서 호출: 그 분석 결과의 운영계획 초안을 닫는다. */
    public void closeTeachingPlanOnConfirm(String analysisId, String adminId, Instant now) {
        drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_TEACHING_PLAN)
                .ifPresent(draft -> draft.closeConfirmed(adminId, now));
    }

    private Optional<PlanAnalysisRun> latestRun(PlanRevision revision) {
        List<PlanAnalysisRun> list = runs.findByRevisionIds(List.of(revision.id()));
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getLast());
    }

    private Payload validate(PlanReviewDraftRequest request, PlanAnalysisRun run, PlanRevision revision,
            boolean teachingPlan) {
        List<FieldViolation> violations = new ArrayList<>();
        JsonNode subjects = mapper.readTree(run.resultJson());
        int subjectCount = subjects.isArray() ? subjects.size() : 0;
        Integer pageCount = revision.pageCount();
        Set<String> seen = new HashSet<>();
        List<PlanReviewDraftResponse.StoredDecision> stored = new ArrayList<>();
        for (int i = 0; i < request.decisions().size(); i++) {
            PlanReviewDraftRequest.Decision decision = request.decisions().get(i);
            String path = "decisions[" + i + "]";
            if (decision.subjectIndex() >= subjectCount) {
                violations.add(new FieldViolation(path + ".subjectIndex", "out_of_range"));
                continue;
            }
            boolean rowPath = TEACHING_PLAN_ROW.matcher(decision.fieldPath()).matches();
            if (!EvaluationPlanService.FIELD_PATH.matcher(decision.fieldPath()).matches()
                    || !ReviewFieldRules.canonicalIndexes(decision.fieldPath())
                    // 범위별 경로: 운영계획 초안은 행 결정(teachingPlan[n])만, 평가 정보 초안은 운영계획 경로를 받지 않는다
                    || (teachingPlan && !rowPath)
                    || (!teachingPlan && decision.fieldPath().startsWith("teachingPlan"))) {
                violations.add(new FieldViolation(path + ".fieldPath", "not_allowed"));
                continue;
            }
            if (!seen.add(decision.subjectIndex() + "|" + decision.fieldPath())) {
                violations.add(new FieldViolation(path + ".fieldPath", "duplicate"));
            }
            if (decision.pdfPageNumber() != null && pageCount != null && decision.pdfPageNumber() > pageCount) {
                violations.add(new FieldViolation(path + ".pdfPageNumber", "out_of_range"));
            }
            boolean absent = "ABSENT".equals(decision.decision());
            if (absent && decision.value() != null) {
                violations.add(new FieldViolation(path + ".value", "not_allowed"));
            }
            Object candidate = candidate(subjects.get(decision.subjectIndex()), decision.fieldPath());
            stored.add(new PlanReviewDraftResponse.StoredDecision(decision.subjectIndex(), decision.fieldPath(),
                    decision.decision(), absent ? null : decision.value(), decision.pdfPageNumber(), candidate));
        }
        Set<Integer> linked = new HashSet<>();
        for (int i = 0; i < request.subjectLinks().size(); i++) {
            PlanReviewDraftRequest.SubjectLink link = request.subjectLinks().get(i);
            if (link.subjectIndex() >= subjectCount) {
                violations.add(new FieldViolation("subjectLinks[" + i + "].subjectIndex", "out_of_range"));
            } else if (!linked.add(link.subjectIndex())) {
                violations.add(new FieldViolation("subjectLinks[" + i + "].subjectIndex", "duplicate"));
            }
        }
        List<PlanReviewDraftRequest.SubjectExclusion> exclusions = request.subjectExclusions() == null ? List.of()
                : request.subjectExclusions();
        Set<Integer> excluded = new HashSet<>();
        for (int i = 0; i < exclusions.size(); i++) {
            PlanReviewDraftRequest.SubjectExclusion exclusion = exclusions.get(i);
            if (teachingPlan) {
                // 과목 제외는 평가 정보 초안에만 둔다(운영계획 확정도 그 제외를 따른다)
                violations.add(new FieldViolation("subjectExclusions[" + i + "]", "not_allowed"));
            } else if (exclusion.subjectIndex() >= subjectCount) {
                violations.add(new FieldViolation("subjectExclusions[" + i + "].subjectIndex", "out_of_range"));
            } else if (!excluded.add(exclusion.subjectIndex())) {
                violations.add(new FieldViolation("subjectExclusions[" + i + "].subjectIndex", "duplicate"));
            }
        }
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        return new Payload(stored, List.copyOf(request.subjectLinks()), List.of(), List.copyOf(exclusions));
    }

    /** 분석 결과 과목 노드에서 fieldPath 값을 읽는다(없으면 null). 예: performanceEvaluation.items[0].weightPercent */
    Object candidate(JsonNode subject, String fieldPath) {
        JsonNode node = subject;
        Matcher matcher = SEGMENT.matcher(fieldPath);
        while (node != null && matcher.find()) {
            node = matcher.group(1) != null ? node.get(matcher.group(1)) : node.get(Integer.parseInt(matcher.group(2)));
        }
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        return mapper.treeToValue(node, Object.class);
    }

    private Payload read(PlanReviewDraft draft) {
        return mapper.readValue(draft.payloadJson(), Payload.class);
    }

    /** 바뀐 필드: 결정·값·근거 쪽이 달라졌거나 추가·삭제된 항목, 그리고 과목 연결 변경 */
    static List<String> changedPaths(Payload before, Payload after) {
        Map<String, PlanReviewDraftResponse.StoredDecision> old = new LinkedHashMap<>();
        before.decisions().forEach(d -> old.put(d.subjectIndex() + "|" + d.fieldPath(), d));
        Set<String> changed = new LinkedHashSet<>();
        for (PlanReviewDraftResponse.StoredDecision now : after.decisions()) {
            String key = now.subjectIndex() + "|" + now.fieldPath();
            PlanReviewDraftResponse.StoredDecision previous = old.remove(key);
            if (previous == null || !Objects.equals(previous.decision(), now.decision())
                    || !Objects.equals(previous.value(), now.value())
                    || !Objects.equals(previous.pdfPageNumber(), now.pdfPageNumber())) {
                changed.add(key);
            }
        }
        changed.addAll(old.keySet());
        Map<Integer, String> oldLinks = new LinkedHashMap<>();
        before.subjectLinks().forEach(l -> oldLinks.put(l.subjectIndex(), l.subjectId()));
        for (PlanReviewDraftRequest.SubjectLink link : after.subjectLinks()) {
            if (!link.subjectId().equals(oldLinks.remove(link.subjectIndex()))) {
                changed.add(link.subjectIndex() + "|subjectId");
            }
        }
        oldLinks.keySet().forEach(index -> changed.add(index + "|subjectId"));
        Map<Integer, String> oldExclusions = new LinkedHashMap<>();
        before.subjectExclusions().forEach(e -> oldExclusions.put(e.subjectIndex(), e.reason() + "|" + e.note()));
        for (PlanReviewDraftRequest.SubjectExclusion exclusion : after.subjectExclusions()) {
            if (!(exclusion.reason() + "|" + exclusion.note()).equals(oldExclusions.remove(exclusion.subjectIndex()))) {
                changed.add(exclusion.subjectIndex() + "|excluded");
            }
        }
        oldExclusions.keySet().forEach(index -> changed.add(index + "|excluded"));
        return new ArrayList<>(changed);
    }

    private PlanReviewDraftResponse view(EvaluationPlan plan, PlanRevision revision, Optional<PlanAnalysisRun> latest,
            String scope) {
        List<PlanReviewDraft> all = drafts.findByRevisionId(revision.id(), scope);
        Optional<PlanReviewDraft> current = latest.flatMap(run -> all.stream().filter(d -> d.analysisId().equals(run.id())).findFirst());
        PlanReviewDraftResponse.Draft draft = current.map(this::draftView).orElse(null);
        List<PlanReviewDraftResponse.HistoryEntry> history = current
                .map(d -> events.findRecent(d.id(), PageRequest.of(0, HISTORY_LIMIT)).stream()
                        .map(e -> new PlanReviewDraftResponse.HistoryEntry(e.draftVersion(), e.savedBy(),
                                times.toOffset(e.savedAt()), e.changedCount(),
                                Arrays.asList(mapper.readValue(e.changedPathsJson(), String[].class))))
                        .toList())
                .orElse(List.of());
        List<PlanReviewDraftResponse.PreviousDraft> previous = all.stream()
                .filter(d -> current.isEmpty() || !d.id().equals(current.get().id()))
                .map(d -> new PlanReviewDraftResponse.PreviousDraft(d.id(), d.analysisId(), d.status(), d.version(),
                        d.decisionCount(), d.updatedBy(), times.toOffset(d.updatedAt())))
                .toList();
        return new PlanReviewDraftResponse(plan.id(), revision.id(), latest.map(PlanAnalysisRun::id).orElse(null),
                revision.reviewStatus().name(), draft, history, previous);
    }

    private PlanReviewDraftResponse.Draft draftView(PlanReviewDraft d) {
        Payload payload = read(d);
        return new PlanReviewDraftResponse.Draft(d.id(), d.analysisId(), d.status(), d.closedReason(), d.version(),
                payload.decisions(), payload.subjectLinks(), d.decisionCount(), d.analyzerVersion(), d.createdBy(),
                times.toOffset(d.createdAt()), d.updatedBy(), times.toOffset(d.updatedAt()), payload.manualRows(),
                payload.subjectExclusions());
    }

    /**
     * A27-UX: 그 분석 결과의 평가 정보 초안(열림·닫힘 모두)에서 제외한 분석 과목 번호. 초안이 없으면 빈 집합.
     * 평가 정보 확정·운영계획 확정이 제외 과목을 학생에게 공개하지 않도록 쓴다.
     */
    @Transactional(readOnly = true)
    public Set<Integer> excludedSubjects(String analysisId) {
        return drafts.findByAnalysisId(analysisId, PlanReviewDraft.SCOPE_EVALUATION)
                .map(d -> read(d).subjectExclusions().stream().map(PlanReviewDraftRequest.SubjectExclusion::subjectIndex)
                        .collect(java.util.stream.Collectors.toSet()))
                .orElse(Set.of());
    }

    private BusinessException conflict(PlanReviewDraft current) {
        Map<String, Object> details = new LinkedHashMap<>();
        if (current != null) {
            details.put("currentVersion", current.version());
            details.put("updatedBy", current.updatedBy());
            details.put("updatedAt", times.toOffset(current.updatedAt()).toString());
        }
        return new BusinessException(AssessmentErrorCode.PLAN_REVIEW_DRAFT_CONFLICT,
                AssessmentErrorCode.PLAN_REVIEW_DRAFT_CONFLICT.message(), details);
    }

    private BusinessException stale(String latestAnalysisId) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("latestAnalysisId", latestAnalysisId);
        return new BusinessException(AssessmentErrorCode.PLAN_REVIEW_DRAFT_STALE,
                AssessmentErrorCode.PLAN_REVIEW_DRAFT_STALE.message(), details);
    }
}
