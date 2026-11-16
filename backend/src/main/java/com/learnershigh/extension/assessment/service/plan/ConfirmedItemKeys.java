package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanReview;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.PlanReviewRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 학생 evaluationItemRef의 itemKey가 "검토 확정에 실제로 쓰인 분석 결과"에 있는지 확인한다 (G-7 A안).
 * 기준 Run은 그 Revision의 검토 기록(PlanReview)이 가리키는 analysisId들이다. 검토 없이 들어온 Run은 기준이 되지 않는다.
 * 여러 번 검토된 경우 어느 하나에라도 있으면 허용한다: 나중 검토가 이전 검토를 대체하는지(대체됨 상태)는 domain.md 미확정이라 여기서 정하지 않는다.
 * 수행평가 항목(performanceEvaluation.items)만 참조할 수 있다: 지필평가 항목을 수행평가로 만들지 않는다(api-contract §12).
 * 확인하는 것은 Key의 존재뿐이다. 그 평가 항목을 사람이 개별로 확인했다는 뜻은 아니다(확정값은 fieldPath 단위로 따로 저장된다).
 * 분석 과목명과 학생 과목 ID는 자동 매핑하지 않으므로(검토자가 정함) Key는 그 Run의 모든 과목에서 찾는다.
 */
@Component
public class ConfirmedItemKeys {

    private final PlanReviewRepository reviews;
    private final PlanAnalysisRunRepository runs;
    private final JsonMapper mapper;

    public ConfirmedItemKeys(PlanReviewRepository reviews, PlanAnalysisRunRepository runs, JsonMapper mapper) {
        this.reviews = reviews;
        this.runs = runs;
        this.mapper = mapper;
    }

    /** 검토 확정에 쓰인 분석 결과에서 그 Key가 어떤 항목인지. */
    public enum KeyKind { PERFORMANCE_ITEM, WRITTEN_EXAM, ABSENT }

    public KeyKind kindInReviewedAnalysis(String revisionId, String itemKey) {
        List<String> analysisIds = reviews.findByRevisionIds(List.of(revisionId)).stream()
                .map(PlanReview::analysisId).distinct().toList();
        KeyKind found = KeyKind.ABSENT;
        for (String analysisId : analysisIds) {
            Optional<PlanAnalysisRun> run = runs.findById(analysisId).filter(r -> r.revisionId().equals(revisionId));
            if (run.isEmpty()) {
                continue;
            }
            KeyKind kind = kindOf(run.get().resultJson(), itemKey);
            if (kind == KeyKind.PERFORMANCE_ITEM) {
                return kind;
            }
            if (kind == KeyKind.WRITTEN_EXAM) {
                found = kind;
            }
        }
        return found;
    }

    private KeyKind kindOf(String resultJson, String itemKey) {
        KeyKind kind = KeyKind.ABSENT;
        for (JsonNode subject : mapper.readTree(resultJson)) {
            if (hasKey(subject.path("performanceEvaluation").path("items"), itemKey)) {
                return KeyKind.PERFORMANCE_ITEM;
            }
            if (hasKey(subject.path("writtenEvaluation").path("exams"), itemKey)) {
                kind = KeyKind.WRITTEN_EXAM;
            }
        }
        return kind;
    }

    private static boolean hasKey(JsonNode entries, String itemKey) {
        for (JsonNode entry : entries) {
            if (itemKey.equals(entry.path("itemKey").stringValue(null))) {
                return true;
            }
        }
        return false;
    }
}
