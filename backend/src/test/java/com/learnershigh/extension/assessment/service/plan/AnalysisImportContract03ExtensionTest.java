package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.dto.plan.AnalysisImportRequest;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import jakarta.validation.Validation;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * A15 0.3 선택 확장 필드 수신(§39-12, contract03-ext-0.1). 계정 B B14 합성 Fixture(contract03-ext/README.md)를 그대로 쓴다.
 * 실제 분석기 응답이 아니다 — B 서비스는 아직 이 필드를 보내지 않는다.
 */
class AnalysisImportContract03ExtensionTest {

    static final JsonMapper MAPPER = JsonMapper.builder().build();
    final AnalysisImportParser parser = new AnalysisImportParser(MAPPER,
            Validation.buildDefaultValidatorFactory().getValidator(), true);
    final AnalysisImportValidator validator = new AnalysisImportValidator();

    static String resource(String name) throws IOException {
        try (InputStream in = AnalysisImportContract03ExtensionTest.class
                .getResourceAsStream("/assessment/contract03-ext/" + name)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    PlanRevision revision(AnalysisImportRequest request) {
        return PlanRevision.upload("plan_1", 1, "synthetic.pdf", "application/pdf", 10, request.source().sha256(),
                request.source().pageCount(), null, null, "adm", Instant.parse("2026-11-16T00:00:00Z"));
    }

    List<FieldViolation> violations(String json) {
        AnalysisImportRequest request = parser.parse(json);
        return validator.validate(request, revision(request), true).violations(); // B14 Fixture는 source.format(PDF)을 보낸다 — 실제 실행 환경(다중 형식 Flag ON)과 같게
    }

    static String reasons(List<FieldViolation> list) {
        return list.stream().map(v -> v.field() + ":" + v.reason()).toList().toString();
    }

    @Test
    void B14_확장_Fixture_3종을_받고_선택_필드를_손실_없이_저장한다() throws IOException {
        for (String name : List.of("a10-element-scores-link-review", "subject-table-grades", "subject-table-no-grade-evidence")) {
            String ext = resource(name + ".ext.json");
            assertThat(violations(ext)).as(name).isEmpty();
            String stored = MAPPER.writeValueAsString(parser.parse(ext).subjects());
            JsonNode original = MAPPER.readTree(ext).get("subjects");
            // 저장 JSON = 받은 subjects (기존 저장 방식은 없던 printedPageLabel·sources를 null로 채운다 — null 키를 빼고 비교)
            assertThat(withoutNulls(MAPPER.readTree(stored))).as(name + " 저장 JSON = 받은 subjects").isEqualTo(withoutNulls(original));
        }
        AnalysisImportRequest rubric = parser.parse(resource("a10-element-scores-link-review.ext.json"));
        AnalysisImportRequest.RubricCriterion first = rubric.subjects().getFirst().performanceEvaluation().items()
                .getFirst().rubric().getFirst();
        assertThat(first.maxScore()).isEqualByComparingTo("75");
        assertThat(first.linkReview()).isEqualTo("REVIEW_REQUIRED");
        assertThat(first.levels()).isEmpty(); // 요소 배점은 수준 점수로 바꾸지 않는다
        assertThat(rubric.subjects().getFirst().grades()).isNull(); // 학년 근거 없음 → 생략 그대로
        assertThat(parser.parse(resource("subject-table-grades.ext.json")).subjects())
                .extracting(AnalysisImportRequest.Subject::grades).containsExactly(List.of(1), List.of(1), List.of(2));
    }

    @Test
    void 확장_필드가_없는_기존_0_3은_그대로이고_저장_JSON에_새_키가_생기지_않는다() throws IOException {
        for (String name : List.of("a10-element-scores-link-review", "subject-table-grades", "subject-table-no-grade-evidence")) {
            String base = resource(name + ".base-0.3.json");
            assertThat(violations(base)).as(name).isEmpty();
            String stored = MAPPER.writeValueAsString(parser.parse(base).subjects());
            assertThat(stored).doesNotContain("linkReview").doesNotContain("grades");
            JsonNode tree = MAPPER.readTree(stored);
            tree.forEach(subject -> subject.path("performanceEvaluation").path("items").forEach(item ->
                    item.path("rubric").forEach(criterion -> assertThat(criterion.has("maxScore")).as(name).isFalse())));
            assertThat(withoutNulls(tree)).isEqualTo(withoutNulls(MAPPER.readTree(base).get("subjects")));
        }
    }

    @Test
    void 합의하지_않은_필드는_여전히_unknown_field이고_0_2에는_확장_필드도_unknown_field다() throws IOException {
        ObjectNode root = (ObjectNode) MAPPER.readTree(resource("a10-element-scores-link-review.ext.json"));
        ObjectNode criterion = rubric(root, 0);
        criterion.put("confidence", 0.4);
        assertThatThrownBy(() -> parser.parse(root.toString())).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details())).contains("unknown_field"));
        criterion.remove("confidence");
        ((ObjectNode) root.get("subjects").get(0)).put("semester", 1);
        assertThatThrownBy(() -> parser.parse(root.toString())).isInstanceOf(BusinessException.class);

        // 0.2(contractVersion 없음): maxScore·linkReview·grades → unknown_field
        ObjectNode v02 = (ObjectNode) MAPPER.readTree(resource("a10-element-scores-link-review.ext.json"));
        v02.remove("contractVersion");
        ((ObjectNode) v02.get("analyzer")).remove("profile");
        v02.put("status", "REVIEW_REQUIRED");
        ((ObjectNode) v02.get("subjects").get(0)).remove("extraction");
        ((ObjectNode) v02.get("subjects").get(0)).remove("teachingPlan");
        ((ObjectNode) v02.get("subjects").get(0)).putArray("grades").add(1);
        assertThatThrownBy(() -> parser.parse(v02.toString())).isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(String.valueOf(((BusinessException) e).details()))
                        .contains("subjects[0].grades").contains("rubric[0].maxScore").contains("rubric[0].linkReview")
                        .contains("unknown_field"));
    }

    @Test
    void 확장_필드_값_범위를_검사한다() throws IOException {
        ObjectNode root = (ObjectNode) MAPPER.readTree(resource("a10-element-scores-link-review.ext.json"));
        rubric(root, 0).put("maxScore", -1);
        assertThatThrownBy(() -> violations(root.toString())).isInstanceOf(BusinessException.class);
        rubric(root, 0).put("maxScore", 75);
        rubric(root, 0).put("linkReview", "LINKED");
        assertThatThrownBy(() -> violations(root.toString())).isInstanceOf(BusinessException.class);
        rubric(root, 0).put("linkReview", "REVIEW_REQUIRED");
        ((ObjectNode) root.get("subjects").get(0)).putArray("grades").add(7);
        assertThatThrownBy(() -> violations(root.toString())).isInstanceOf(BusinessException.class);
        ((ObjectNode) root.get("subjects").get(0)).putArray("grades");
        assertThatThrownBy(() -> violations(root.toString())).isInstanceOf(BusinessException.class);
        ((ObjectNode) root.get("subjects").get(0)).putArray("grades").add(1).add(1);
        assertThat(reasons(violations(root.toString()))).contains("subjects[0].grades:duplicate");
    }

    /** 같은 이름 과목 두 개(가상국어)를 학년 조합별로 넣어 본다. */
    String twoSameName(List<Integer> first, List<Integer> second) throws IOException {
        ObjectNode root = (ObjectNode) MAPPER.readTree(resource("subject-table-grades.ext.json"));
        ArrayNode subjects = (ArrayNode) root.get("subjects");
        ObjectNode a = (ObjectNode) subjects.get(0);
        ObjectNode b = a.deepCopy();
        setGrades(a, first);
        setGrades(b, second);
        subjects.removeAll();
        subjects.add(a).add(b);
        return root.toString();
    }

    static void setGrades(ObjectNode subject, List<Integer> grades) {
        subject.remove("grades");
        if (grades != null) {
            ArrayNode array = subject.putArray("grades");
            grades.forEach(array::add);
        }
    }

    @Test
    void 과목_중복은_양쪽에_서로_다른_학년_근거가_있을_때만_따로_받는다() throws IOException {
        // 다른 학년(양쪽 근거) → 둘 다 받는다
        assertThat(violations(twoSameName(List.of(1), List.of(2)))).isEmpty();
        // 같은 학년 반복 · 겹치는 학년 → 거절
        assertThat(reasons(violations(twoSameName(List.of(1), List.of(1))))).contains("subjects[1].subjectName:duplicate");
        assertThat(reasons(violations(twoSameName(List.of(1, 2), List.of(2))))).contains("subjects[1].subjectName:duplicate");
        // 한쪽이라도 학년 근거 없음 → 거절(같은 과목인지 판단 불가)
        assertThat(reasons(violations(twoSameName(List.of(1), null)))).contains("subjects[1].subjectName:duplicate");
        assertThat(reasons(violations(twoSameName(null, List.of(2))))).contains("subjects[1].subjectName:duplicate");
        assertThat(reasons(violations(twoSameName(null, null)))).contains("subjects[1].subjectName:duplicate");
    }

    @Test
    void 확정_채점표는_요소_배점을_선택으로_받고_다른_키는_받지_않는다() {
        List<FieldViolation> out = new ArrayList<>();
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"유창성\",\"levels\":[],\"maxScore\":75}]"), "v", out::add);
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"태도\",\"levels\":[{\"description\":\"상\",\"score\":5}],\"maxScore\":null}]"), "v", out::add);
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"태도\",\"levels\":[]}]"), "v", out::add);
        assertThat(out).isEmpty();
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"x\",\"levels\":[],\"maxScore\":-1}]"), "a", out::add);
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"x\",\"levels\":[],\"maxScore\":1001}]"), "b", out::add);
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"x\",\"levels\":[],\"maxScore\":\"75\"}]"), "c", out::add);
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"x\",\"levels\":[],\"linkReview\":\"REVIEW_REQUIRED\"}]"), "d", out::add);
        ReviewFieldRules.checkRubricValue(MAPPER.readTree("[{\"element\":\"x\",\"levels\":[],\"maxScore\":1,\"note\":\"y\"}]"), "e", out::add);
        assertThat(reasons(out)).isEqualTo("[a:rubric_shape, b:rubric_shape, c:rubric_shape, d:rubric_shape, e:rubric_shape]");
    }

    @Test
    void 학년_문맥_충돌은_학년_근거가_있고_문서_학년이_없을_때만이다() {
        JsonNode subjects = MAPPER.readTree("[{\"grades\":[1]},{\"grades\":[2,3]},{},{\"grades\":null}]");
        assertThat(ReviewFieldRules.gradeConflict(subjects, 0, 1)).isFalse();
        assertThat(ReviewFieldRules.gradeConflict(subjects, 1, 1)).isTrue();
        assertThat(ReviewFieldRules.gradeConflict(subjects, 1, 3)).isFalse();
        assertThat(ReviewFieldRules.gradeConflict(subjects, 2, 1)).isFalse();
        assertThat(ReviewFieldRules.gradeConflict(subjects, 3, 1)).isFalse();
        assertThat(ReviewFieldRules.gradeConflict(subjects, null, 1)).isFalse();
        assertThat(ReviewFieldRules.gradeConflict(subjects, 9, 1)).isFalse();
    }

    /** null 값 키를 모두 뺀 사본 (저장 방식의 null 채움과 무관하게 내용만 비교) */
    static JsonNode withoutNulls(JsonNode node) {
        if (node.isObject()) {
            ObjectNode copy = MAPPER.createObjectNode();
            node.properties().forEach(entry -> {
                if (!entry.getValue().isNull()) {
                    copy.set(entry.getKey(), withoutNulls(entry.getValue()));
                }
            });
            return copy;
        }
        if (node.isArray()) {
            ArrayNode copy = MAPPER.createArrayNode();
            node.forEach(item -> copy.add(withoutNulls(item)));
            return copy;
        }
        return node;
    }

    static ObjectNode rubric(ObjectNode root, int index) {
        return (ObjectNode) root.get("subjects").get(0).get("performanceEvaluation").get("items").get(0).get("rubric").get(index);
    }
}
