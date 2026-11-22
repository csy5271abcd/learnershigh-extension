package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.dto.plan.PlanReviewDraftResponse;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanReviewRequest;
import com.learnershigh.extension.assessment.dto.plan.TeachingPlanReviewResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.TeachingPlanReview;
import com.learnershigh.extension.assessment.entity.TeachingPlanReviewRow;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.TeachingPlanReviewRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * §39-6 월별 교수·학습 운영계획 확정 (A6 DRAFT, 2026-11-15). 평가 정보 확정(§39 PUT review)과 별도다.
 *
 * <ul>
 *   <li>최신 분석 결과(REVIEW_REQUIRED·PARTIAL)의 운영계획 후보 행만 확정한다. 후보(Run)는 바꾸지 않는다.</li>
 *   <li>과목 ID는 그 문서 슬롯의 학업 과목이어야 한다(과목명으로 추측하지 않는다).</li>
 *   <li>관리자 수정은 unit·content·note·specialSchedule·schedule만. schedule은 0.3 불변 규칙을 지키고,
 *       calendarYear는 후보 값과 같을 때만 허용한다(연도를 새로 만들지 않음).</li>
 *   <li>A13: 확정은 버전으로 쌓인다(불변). 이미 확정된 운영계획은 재검토(초안 다시 열기) 중에만 다시 확정한다(아니면 409).</li>
 *   <li>A14: 관리자 직접 추가 행(manualRows)은 열려 있는 운영계획 초안에 있는 서버 발급 키만 받고, 내용은 초안에서 가져온다.
 *       출처 MANUAL·후보 없음으로 저장해 분석 후보 행과 구분한다.</li>
 * </ul>
 */
@Service
@Transactional
public class TeachingPlanReviewService {

    private final PlanAccess access;
    private final PlanAnalysisRunRepository runs;
    private final TeachingPlanReviewRepository reviews;
    private final AcademicContextProvider contexts;
    private final TeachingPlanQueryService queries;
    private final PlanReviewDraftService drafts;
    private final AssessmentTimes times;
    private final JsonMapper mapper;

    public TeachingPlanReviewService(PlanAccess access, PlanAnalysisRunRepository runs,
            TeachingPlanReviewRepository reviews, AcademicContextProvider contexts, TeachingPlanQueryService queries,
            PlanReviewDraftService drafts, AssessmentTimes times, JsonMapper mapper) {
        this.drafts = drafts;
        this.access = access;
        this.runs = runs;
        this.reviews = reviews;
        this.contexts = contexts;
        this.queries = queries;
        this.times = times;
        this.mapper = mapper;
    }

    public TeachingPlanReviewResponse confirm(AdminActor admin, String planId, String revisionId,
            TeachingPlanReviewRequest request) {
        EvaluationPlan plan = access.plan(admin, planId);
        PlanRevision revision = access.revision(plan, revisionId);
        Optional<TeachingPlanReview> previous = reviews.findByRevisionId(revision.id());
        if (previous.isPresent() && !drafts.teachingPlanDraftOpen(request.analysisId())) {
            // A13: 확정된 운영계획은 재검토(POST .../teaching-plan-draft/reopen)를 시작한 분석 결과로만 다시 확정한다
            throw alreadyConfirmed();
        }
        List<FieldViolation> violations = new ArrayList<>();
        Optional<PlanAnalysisRun> latest = TeachingPlanQueryService.latestRun(runs, revision);
        Optional<PlanAnalysisRun> run = runs.findById(request.analysisId())
                .filter(r -> r.revisionId().equals(revision.id()));
        JsonNode subjects = null;
        if (run.isEmpty()) {
            violations.add(new FieldViolation("analysisId", "unknown"));
        } else if (latest.isEmpty() || !latest.get().id().equals(run.get().id())) {
            violations.add(new FieldViolation("analysisId", "stale"));
        } else if (run.get().status() == PlanAnalysisStatus.FAILED) {
            violations.add(new FieldViolation("analysisId", "analysis_failed"));
        } else {
            subjects = mapper.readTree(run.get().resultJson());
            if (TeachingPlanQueryService.candidateRowCount(subjects) == 0) {
                violations.add(new FieldViolation("analysisId", "no_teaching_plan"));
            }
        }
        if (!violations.isEmpty() || subjects == null) {
            throw invalid(violations);
        }

        Optional<AcademicContextRecord> slot = contexts.findSlot(plan.schoolId(), plan.academicYear(), plan.grade(),
                plan.semester());
        // A13: 새 버전 = 이전 최신 + 1. 시각도 이전 기록보다 항상 뒤(고정 시계에서도 이력 순서가 시각과 어긋나지 않게)
        java.time.Instant reviewedAt = times.now();
        if (previous.isPresent() && !reviewedAt.isAfter(previous.get().reviewedAt())) {
            reviewedAt = previous.get().reviewedAt().plusNanos(1_000);
        }
        TeachingPlanReview review = TeachingPlanReview.confirm(revision.id(), run.get().id(), admin.adminId(),
                reviewedAt, previous.map(p -> p.versionNo() + 1).orElse(1));
        Set<String> seen = new HashSet<>();
        // A27-UX: 평가 정보 초안에서 이 문서 검토 대상에서 뺀 분석 과목
        Set<Integer> excluded = drafts.excludedSubjects(run.get().id());
        Map<Integer, String> subjectOfIndex = new HashMap<>();
        for (int i = 0; i < request.rows().size(); i++) {
            TeachingPlanReviewRequest.Row row = request.rows().get(i);
            String at = "rows[" + i + "]";
            JsonNode candidate = candidateRow(subjects, row.subjectIndex(), row.rowKey());
            if (candidate == null) {
                violations.add(new FieldViolation(at + ".rowKey", "unknown"));
                continue;
            }
            if (ReviewFieldRules.gradeConflict(subjects, row.subjectIndex(), plan.grade())) {
                // A15: 원문 근거상 다른 학년 과목의 운영계획은 이 학년 학생에게 공개하지 않는다
                violations.add(new FieldViolation(at + ".subjectIndex", "grade_conflict"));
            }
            if (excluded.contains(row.subjectIndex())) {
                // A27-UX: 평가 정보 검토에서 이 문서 대상에서 뺀 과목의 운영계획은 확정·공개하지 않는다
                violations.add(new FieldViolation(at + ".subjectIndex", "subject_excluded"));
            }
            if (!seen.add(row.subjectIndex() + "|" + row.rowKey())) {
                violations.add(new FieldViolation(at + ".rowKey", "duplicate"));
            }
            if (slot.isEmpty() || !slot.get().hasSubject(row.subjectId())) {
                violations.add(new FieldViolation(at + ".subjectId", "unknown"));
            } else {
                String linked = subjectOfIndex.putIfAbsent(row.subjectIndex(), row.subjectId());
                if (linked != null && !linked.equals(row.subjectId())) {
                    violations.add(new FieldViolation(at + ".subjectId", "conflict"));
                }
            }
            boolean edited = TeachingPlanReviewRow.EDITED.equals(row.decision());
            if (edited && row.edits() == null) {
                violations.add(new FieldViolation(at + ".edits", "required"));
                continue;
            }
            if (!edited && row.edits() != null) {
                violations.add(new FieldViolation(at + ".edits", "not_allowed"));
                continue;
            }
            ObjectNode finalRow = (ObjectNode) candidate.deepCopy();
            if (edited) {
                applyEdits(at + ".edits", row.edits(), candidate, finalRow, violations);
            }
            JsonNode schedule = finalRow.get("schedule");
            boolean hasSchedule = schedule != null && schedule.isObject();
            review.addRow(row.subjectId(), row.subjectIndex(), row.rowKey(), row.decision(),
                    hasSchedule ? text(schedule, "precision") : null,
                    hasSchedule && number(schedule, "monthFrom") != null ? number(schedule, "monthFrom") : number(finalRow, "month"),
                    hasSchedule && number(schedule, "monthTo") != null ? number(schedule, "monthTo") : number(finalRow, "monthTo"),
                    mapper.writeValueAsString(finalRow), mapper.writeValueAsString(candidate));
        }
        // A14 §39-11 관리자 직접 추가 행: 열려 있는 운영계획 초안에 있는 키만(서버 발급). 내용은 초안에서 가져온다.
        Map<String, PlanReviewDraftResponse.ManualRow> manual = request.manualRowsOrEmpty().isEmpty() ? Map.of()
                : drafts.openManualRows(run.get().id());
        for (int i = 0; i < request.manualRowsOrEmpty().size(); i++) {
            TeachingPlanReviewRequest.ManualRow row = request.manualRowsOrEmpty().get(i);
            String at = "manualRows[" + i + "]";
            PlanReviewDraftResponse.ManualRow held = manual.get(row.rowKey());
            if (held == null) {
                violations.add(new FieldViolation(at + ".rowKey", "unknown"));
                continue;
            }
            if (held.subjectIndex() != row.subjectIndex()) {
                violations.add(new FieldViolation(at + ".subjectIndex", "conflict"));
                continue;
            }
            if (ReviewFieldRules.gradeConflict(subjects, row.subjectIndex(), plan.grade())) {
                violations.add(new FieldViolation(at + ".subjectIndex", "grade_conflict"));
            }
            if (excluded.contains(row.subjectIndex())) {
                violations.add(new FieldViolation(at + ".subjectIndex", "subject_excluded"));
            }
            if (!seen.add(row.subjectIndex() + "|" + row.rowKey())) {
                violations.add(new FieldViolation(at + ".rowKey", "duplicate"));
                continue;
            }
            String expected = TeachingPlanManualRows.EXCLUDED.equals(held.status()) ? TeachingPlanReviewRow.EXCLUDED
                    : TeachingPlanReviewRow.CONFIRMED;
            if (!expected.equals(row.decision())) {
                // 화면이 오래된 초안을 보고 있다(제외·복원이 바뀜) — 다시 읽게 한다
                violations.add(new FieldViolation(at + ".decision", "conflict"));
            }
            if (slot.isEmpty() || !slot.get().hasSubject(row.subjectId())) {
                violations.add(new FieldViolation(at + ".subjectId", "unknown"));
            } else {
                String linked = subjectOfIndex.putIfAbsent(row.subjectIndex(), row.subjectId());
                if (linked != null && !linked.equals(row.subjectId())) {
                    violations.add(new FieldViolation(at + ".subjectId", "conflict"));
                }
            }
            ObjectNode finalRow = TeachingPlanManualRows.rowJson(mapper, held);
            AnalysisImportRequest.Schedule schedule = held.schedule();
            review.addRow(row.subjectId(), row.subjectIndex(), row.rowKey(), TeachingPlanReviewRow.ORIGIN_MANUAL,
                    row.decision(), schedule.precision(), schedule.monthFrom(), schedule.monthTo(),
                    mapper.writeValueAsString(finalRow), null);
        }
        if (request.rows().isEmpty() && request.manualRowsOrEmpty().isEmpty()) {
            violations.add(new FieldViolation("rows", "required"));
        }
        if (!violations.isEmpty()) {
            throw invalid(violations);
        }
        try {
            reviews.saveAndFlush(review);
        } catch (DataIntegrityViolationException raced) {
            throw alreadyConfirmed();
        }
        // 같은 Transaction에서 운영계획 초안만 닫는다 (평가 정보 초안·확정값은 건드리지 않음, A7)
        drafts.closeTeachingPlanOnConfirm(run.get().id(), admin.adminId(), review.reviewedAt());
        return queries.view(plan, revision, Optional.of(review), latest);
    }

    private void applyEdits(String at, TeachingPlanReviewRequest.Edits edits, JsonNode candidate, ObjectNode target,
            List<FieldViolation> violations) {
        putText(target, "unit", edits.unit());
        putText(target, "content", edits.content());
        putText(target, "note", edits.note());
        putText(target, "specialSchedule", edits.specialSchedule());
        AnalysisImportRequest.Schedule schedule = edits.schedule();
        if (schedule == null) {
            return;
        }
        List<FieldViolation> scheduleViolations = new ArrayList<>();
        Contract03Rules.schedule(at + ".schedule", schedule, scheduleViolations);
        violations.addAll(scheduleViolations);
        JsonNode candidateSchedule = candidate.get("schedule");
        Integer candidateYear = candidateSchedule == null || !candidateSchedule.isObject() ? null
                : number(candidateSchedule, "calendarYear");
        if (!Objects.equals(schedule.calendarYear(), candidateYear)) {
            violations.add(new FieldViolation(at + ".schedule.calendarYear", "not_allowed"));
        }
        target.set("schedule", mapper.valueToTree(schedule));
    }

    /** null = 후보 그대로, 빈 문자열 = 값 지움(원문에 없음). */
    private static void putText(ObjectNode target, String field, String value) {
        if (value == null) {
            return;
        }
        if (value.isBlank()) {
            target.putNull(field);
        } else {
            target.put(field, value.strip());
        }
    }

    static JsonNode candidateRow(JsonNode subjects, int subjectIndex, String rowKey) {
        if (subjects == null || !subjects.isArray() || subjectIndex >= subjects.size()) {
            return null;
        }
        JsonNode rows = subjects.get(subjectIndex).get("teachingPlan");
        if (rows == null || !rows.isArray()) {
            return null;
        }
        for (JsonNode row : rows) {
            if (row.isObject() && rowKey.equals(text(row, "rowKey"))) {
                return row;
            }
        }
        return null;
    }

    static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asString();
    }

    static Integer number(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || !value.isNumber() ? null : value.intValue();
    }

    private static BusinessException alreadyConfirmed() {
        return BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                new FieldViolation("revision", "teaching_plan_already_confirmed"));
    }

    private static BusinessException invalid(List<FieldViolation> violations) {
        return BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
    }
}
