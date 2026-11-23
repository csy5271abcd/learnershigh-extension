package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.integration.roster.AssessmentStudentDirectory;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A28-20 학교 확정 수행평가 → 학생 학교 수행평가 자동 등록(멱등 동기화). api-contract §12-c.
 * <ul>
 *   <li>원천: 학생 학적(학교·학년도·학년·학기)과 같은 슬롯 문서의 <b>학생 공개 확정 Revision</b>(평가 정보 확정본 중 최신)과 그 최신 확정 기록의
 *       {@code performanceEvaluation.items[n].*} 확정값. 학생 학적의 수강 과목만. 지필평가·운영계획 행은 만들지 않는다.</li>
 *   <li>식별자: 문서ID|학업 과목ID|분석 항목 Key(UNIQUE 학생+Key). Revision·확정 기록이 바뀌어도 같은 공식 항목은 같은 행.</li>
 *   <li>있으면 공식 필드만 갱신(학생 상태·메모·날짜·첨부 보존), 학생이 휴지통으로 보낸 행은 되살리지 않음, 최신 확정본에서 빠지면 WITHDRAWN.</li>
 *   <li>날짜를 만들지 않는다(공식 시기 문자열만). 학교명으로 맞추지 않는다(학교 키·과목 ID).</li>
 * </ul>
 */
@Service
public class OfficialAssessmentSyncService {

    private static final Logger log = LoggerFactory.getLogger(OfficialAssessmentSyncService.class);
    private static final Pattern ITEM_FIELD = Pattern.compile("^performanceEvaluation\\.items\\[(\\d+)]\\.(label|weightPercent|maxScore|timing)$");

    public record Result(int created, int updated, int unchanged, int withdrawn, int keptInTrash) {
        static Result empty() {
            return new Result(0, 0, 0, 0, 0);
        }

        Result plus(Result o) {
            return new Result(created + o.created, updated + o.updated, unchanged + o.unchanged, withdrawn + o.withdrawn,
                    keptInTrash + o.keptInTrash);
        }

        public boolean changed() {
            return created + updated + withdrawn > 0;
        }
    }

    private final AcademicContextProvider contexts;
    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final PlanReviewRepository reviews;
    private final PlanAnalysisRunRepository runs;
    private final SchoolAssessmentRepository assessments;
    private final AssessmentStudentDirectory students;
    private final AssessmentTimes times;
    private final JsonMapper mapper;

    public OfficialAssessmentSyncService(AcademicContextProvider contexts, EvaluationPlanRepository plans,
            PlanRevisionRepository revisions, PlanReviewRepository reviews, PlanAnalysisRunRepository runs,
            SchoolAssessmentRepository assessments, AssessmentStudentDirectory students, AssessmentTimes times, JsonMapper mapper) {
        this.contexts = contexts;
        this.plans = plans;
        this.revisions = revisions;
        this.reviews = reviews;
        this.runs = runs;
        this.assessments = assessments;
        this.students = students;
        this.times = times;
        this.mapper = mapper;
    }

    /** 학생 화면 진입(목록 조회) 전 보완 동기화: 별도 Transaction. 실패해도 목록 조회는 계속(로그로 남김 — 다음 진입·명시 보정으로 복구). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Result syncStudentOnRead(String studentId, int academicYear, int semester) {
        return syncStudent(studentId, academicYear, semester, false);
    }

    /**
     * 관리자 평가 정보 확정(최종 승인·재확정) 직후 같은 Transaction: 승인한 관리자 담당 지점 학생 중 그 문서 슬롯 학적인 학생.
     * 담당 밖 학생은 학생 화면 진입·명시 보정에서 같은 규칙으로 등록된다. 실패하면 확정도 되돌린다(조용한 유실 없음).
     */
    @Transactional
    public Result syncAfterConfirm(AdminActor admin, EvaluationPlan plan) {
        Result total = Result.empty();
        for (String branchId : admin.branchIds()) {
            for (ExistingStudent student : students.findStudents(branchId)) {
                Optional<AcademicContextRecord> context = contexts.find(student.studentId(), plan.academicYear(), plan.semester());
                if (context.isPresent() && plan.matchesSlot(context.get().schoolId(), context.get().academicYear(),
                        context.get().grade(), context.get().semester())) {
                    total = total.plus(syncStudent(student.studentId(), plan.academicYear(), plan.semester(), false));
                }
            }
        }
        return total;
    }

    /** 명시 보정(dry-run 이면 쓰기 없음). 호출자가 Transaction 을 정한다 */
    @Transactional
    public Result syncStudent(String studentId, int academicYear, int semester, boolean dryRun) {
        Optional<AcademicContextRecord> context = contexts.find(studentId, academicYear, semester);
        if (context.isEmpty()) {
            return Result.empty();
        }
        Map<String, SchoolAssessment.OfficialValues> desired = desired(context.get());
        List<SchoolAssessment> existing = assessments.findOfficialTerm(studentId, academicYear, semester);
        Map<String, SchoolAssessment> byKey = new HashMap<>();
        existing.forEach(a -> byKey.put(a.officialKey(), a));
        Instant now = times.now();
        int created = 0;
        int updated = 0;
        int unchanged = 0;
        int withdrawn = 0;
        int trash = 0;
        for (SchoolAssessment.OfficialValues values : desired.values()) {
            SchoolAssessment row = byKey.get(values.key());
            if (row == null) {
                created++;
                if (!dryRun) {
                    assessments.save(SchoolAssessment.registerOfficial(studentId, academicYear, semester, values, now));
                }
            } else if (row.inTrash()) {
                // 학생이 지운 공식 항목은 되살리지 않는다(삭제 의도 보존)
                trash++;
            } else if (dryRun ? wouldChange(row, values) : row.refreshOfficial(values, now)) {
                updated++;
            } else {
                unchanged++;
            }
        }
        for (SchoolAssessment row : existing) {
            if (!desired.containsKey(row.officialKey()) && !row.inTrash()
                    && !SchoolAssessment.OFFICIAL_WITHDRAWN.equals(row.officialStatus())) {
                withdrawn++;
                if (!dryRun) {
                    row.withdrawOfficial(now);
                }
            }
        }
        if (!dryRun && (created + updated + withdrawn) > 0) {
            assessments.flush();
            log.info("official assessment sync student={} term={}-{} created={} updated={} withdrawn={}", studentId, academicYear,
                    semester, created, updated, withdrawn);
        }
        return new Result(created, updated, unchanged, withdrawn, trash);
    }

    private static boolean wouldChange(SchoolAssessment row, SchoolAssessment.OfficialValues values) {
        return !values.reviewId().equals(row.officialReviewId()) || !SchoolAssessment.OFFICIAL_ACTIVE.equals(row.officialStatus())
                || !values.label().strip().equals(row.title());
    }

    /** 학생 학적 슬롯 문서들의 학생 공개 확정본에서, 학생 수강 과목의 확정 수행평가 항목 */
    Map<String, SchoolAssessment.OfficialValues> desired(AcademicContextRecord context) {
        Map<String, SchoolAssessment.OfficialValues> out = new LinkedHashMap<>();
        List<EvaluationPlan> slotPlans = plans.search(context.schoolId(), context.academicYear(), context.grade(), context.semester())
                .stream().filter(p -> p.matchesSlot(context.schoolId(), context.academicYear(), context.grade(), context.semester()))
                .toList();
        if (slotPlans.isEmpty()) {
            return out;
        }
        Map<String, PlanRevision> latestConfirmed = new HashMap<>();
        for (PlanRevision revision : revisions.findByPlanIds(slotPlans.stream().map(EvaluationPlan::id).toList())) {
            if (revision.isConfirmed()) {
                latestConfirmed.merge(revision.planId(), revision, (a, b) -> a.revisionNumber() >= b.revisionNumber() ? a : b);
            }
        }
        for (EvaluationPlan plan : slotPlans) {
            PlanRevision revision = latestConfirmed.get(plan.id());
            if (revision == null) {
                continue;
            }
            List<PlanReview> history = reviews.findByRevisionIds(List.of(revision.id()));
            if (history.isEmpty()) {
                continue;
            }
            PlanReview review = history.getLast();
            JsonNode analysis = runs.findById(review.analysisId()).filter(r -> r.revisionId().equals(revision.id()))
                    .map(PlanAnalysisRun::resultJson).map(mapper::readTree).orElse(null);
            // 과목ID·항목 번호별 확정값 모으기
            Map<String, TreeMap<Integer, Map<String, String>>> bySubject = new LinkedHashMap<>();
            Map<String, Integer> analysisIndex = new HashMap<>();
            for (PlanReview.PlanConfirmedValue value : review.confirmedValues()) {
                Matcher m = ITEM_FIELD.matcher(value.fieldPath());
                if (!m.matches() || !context.hasSubject(value.subjectId())) {
                    continue;
                }
                bySubject.computeIfAbsent(value.subjectId(), k -> new TreeMap<>())
                        .computeIfAbsent(Integer.parseInt(m.group(1)), k -> new HashMap<>()).put(m.group(2), value.valueJson());
                if (value.analysisSubjectIndex() != null) {
                    analysisIndex.putIfAbsent(value.subjectId(), value.analysisSubjectIndex());
                }
            }
            for (Map.Entry<String, TreeMap<Integer, Map<String, String>>> subject : bySubject.entrySet()) {
                for (Map.Entry<Integer, Map<String, String>> item : subject.getValue().entrySet()) {
                    String label = text(item.getValue().get("label"));
                    if (label == null) {
                        continue; // 이름이 확정되지 않은 항목은 등록하지 않는다(만들어 넣지 않음)
                    }
                    String itemKey = itemKey(analysis, analysisIndex.get(subject.getKey()), item.getKey());
                    SchoolAssessment.OfficialValues values = new SchoolAssessment.OfficialValues(plan.id(), review.id(), revision.id(),
                            subject.getKey(), itemKey, label, number(item.getValue().get("weightPercent")),
                            number(item.getValue().get("maxScore")), text(item.getValue().get("timing")));
                    out.putIfAbsent(values.key(), values);
                }
            }
        }
        return out;
    }

    /** 분석 결과의 항목 Key(예: P01). 없으면 항목 번호 기반 Key — 같은 분석 결과 안에서 안정적이다 */
    private static String itemKey(JsonNode analysis, Integer subjectIndex, int itemIndex) {
        if (analysis != null && subjectIndex != null && subjectIndex >= 0 && subjectIndex < analysis.size()) {
            JsonNode node = analysis.get(subjectIndex).path("performanceEvaluation").path("items").path(itemIndex).path("itemKey");
            if (node.isString() && !node.asString().isBlank()) {
                return node.asString().strip();
            }
        }
        return "items[" + itemIndex + "]";
    }

    private String text(String json) {
        if (json == null) {
            return null;
        }
        JsonNode node = mapper.readTree(json);
        String value = node.isString() ? node.asString() : node.isNull() ? null : node.toString();
        return value == null || value.isBlank() ? null : value.strip();
    }

    private BigDecimal number(String json) {
        if (json == null) {
            return null;
        }
        JsonNode node = mapper.readTree(json);
        if (node.isNumber()) {
            return node.decimalValue();
        }
        if (node.isString()) {
            try {
                return new BigDecimal(node.asString().replace("%", "").strip());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    /** 보정용: 학생 목록에서 학적이 있는 학기마다 동기화 */
    public Result syncStudentTerms(String studentId, List<int[]> terms, boolean dryRun) {
        Result total = Result.empty();
        for (int[] term : terms) {
            total = total.plus(syncStudent(studentId, term[0], term[1], dryRun));
        }
        return total;
    }
}
