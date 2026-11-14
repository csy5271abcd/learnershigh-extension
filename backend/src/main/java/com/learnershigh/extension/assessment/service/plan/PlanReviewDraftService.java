package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanReviewDraft;
import com.learnershigh.extension.assessment.entity.PlanReviewDraftEvent;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewDraftEventRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewDraftRepository;
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
    private final PlanReviewDraftEventRepository events;
    private final AssessmentTimes times;
    private final JsonMapper mapper;

    public PlanReviewDraftService(PlanAccess access, PlanAnalysisRunRepository runs, PlanReviewDraftRepository drafts,
            PlanReviewDraftEventRepository events, AssessmentTimes times, JsonMapper mapper) {
        this.access = access;
        this.runs = runs;
        this.drafts = drafts;
        this.events = events;
        this.times = times;
        this.mapper = mapper;
    }

    /** 저장 본문 (payload_json) */
    record Payload(List<PlanReviewDraftResponse.StoredDecision> decisions,
            List<PlanReviewDraftRequest.SubjectLink> subjectLinks) {
    }

    @Transactional(readOnly = true)
    public PlanReviewDraftResponse get(AdminActor admin, String planId, String revisionId) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        return view(plan, revision, latestRun(revision));
    }

    public PlanReviewDraftResponse save(AdminActor admin, String planId, String revisionId,
            PlanReviewDraftRequest request) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        if (revision.isConfirmed()) {
            // 확정 뒤 재검토(이전 확정 대체) 정책이 미결이라 초안을 받지 않는다
            throw BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                    new FieldViolation("revision", "already_confirmed"));
        }
        Optional<PlanAnalysisRun> latest = latestRun(revision);
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
        Payload payload = validate(request, run, revision);
        String payloadJson = mapper.writeValueAsString(payload);
        Instant now = times.now();

        Optional<PlanReviewDraft> existing = drafts.findByAnalysisId(run.id());
        PlanReviewDraft draft;
        List<String> changed;
        if (existing.isEmpty()) {
            if (request.baseVersion() != null) {
                // 화면은 초안이 있다고 알고 있지만 서버에는 없다 (예: 다른 결과에서 온 화면) — 새로 만들지 않고 다시 읽게 한다
                throw conflict(null);
            }
            draft = PlanReviewDraft.start(revision.id(), run.id(), revision.sha256(), run.analyzerVersion(), payloadJson,
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
        return view(plan, revision, Optional.of(run));
    }

    /** 최종 확정(PUT review)과 같은 Transaction에서 호출: 그 분석 결과의 초안을 닫는다. 초안이 없으면 아무것도 하지 않는다. */
    public void closeOnConfirm(String analysisId, String adminId, Instant now) {
        drafts.findByAnalysisId(analysisId).ifPresent(draft -> draft.closeConfirmed(adminId, now));
    }

    private Optional<PlanAnalysisRun> latestRun(PlanRevision revision) {
        List<PlanAnalysisRun> list = runs.findByRevisionIds(List.of(revision.id()));
        return list.isEmpty() ? Optional.empty() : Optional.of(list.getLast());
    }

    private Payload validate(PlanReviewDraftRequest request, PlanAnalysisRun run, PlanRevision revision) {
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
            if (!EvaluationPlanService.FIELD_PATH.matcher(decision.fieldPath()).matches()
                    || !ReviewFieldRules.canonicalIndexes(decision.fieldPath())) {
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
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        return new Payload(stored, List.copyOf(request.subjectLinks()));
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
        return new ArrayList<>(changed);
    }

    private PlanReviewDraftResponse view(EvaluationPlan plan, PlanRevision revision, Optional<PlanAnalysisRun> latest) {
        List<PlanReviewDraft> all = drafts.findByRevisionId(revision.id());
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
                times.toOffset(d.createdAt()), d.updatedBy(), times.toOffset(d.updatedAt()));
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
