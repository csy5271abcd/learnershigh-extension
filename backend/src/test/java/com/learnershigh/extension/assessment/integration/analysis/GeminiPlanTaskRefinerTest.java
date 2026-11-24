package com.learnershigh.extension.assessment.integration.analysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.learnershigh.extension.assessment.service.plan.PlanTaskRefiner;
import com.learnershigh.extension.assessment.service.plan.extract.PlanExtractor;
import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GeminiPlanTaskRefinerTest {

    private final JsonMapper mapper = JsonMapper.builder().build();
    private final GeminiPlanTaskRefiner gemini = new GeminiPlanTaskRefiner(null, mapper, "k", "m", Duration.ofSeconds(1));

    @Test
    void parsesStructuredAnswerAndTokens() {
        String res = """
                {"candidates":[{"content":{"parts":[{"text":"{\\"subject\\":\\"공통수학2\\",\\"examPercent\\":50,\\"performancePercent\\":50,\\"tasks\\":[{\\"name\\":\\"탐구 보고서\\",\\"percent\\":30},{\\"name\\":\\"문항 제작\\",\\"percent\\":20}]}"}]}}],
                 "usageMetadata":{"promptTokenCount":812,"candidatesTokenCount":61}}
                """;
        PlanTaskRefiner.Refined r = gemini.parse(res).orElseThrow();
        assertEquals("공통수학2", r.subject());
        assertEquals(2, r.tasks().size());
        assertEquals(812, r.inputTokens());
        assertTrue(PlanTaskRefiner.passes(r));
    }

    @Test
    void requestSendsOnlyTextWithJsonSchema() {
        String body = gemini.body("표 글");
        assertTrue(body.contains("\"responseMimeType\":\"application/json\""));
        assertTrue(body.contains("표 글"));
        assertFalse(body.contains("inlineData"));
    }

    @Test
    void appliesOnlyToUnconfirmedSubjectsAndOnlyWhenSumsPass() {
        SourceTable t = new SourceTable(1, 0, null, List.of(List.of("반영 비율", "지필 50%", "수행 50%")), null, "");
        PlanExtractor.Subject confirmed = subject("확정 과목", t, List.of());
        PlanExtractor.Subject flagged = subject("공통수학2", t, List.of("수행 항목 없음"));
        PlanExtractor.Subject badAnswer = subject("국어", t, List.of("수행 항목 없음"));
        List<String> asked = new ArrayList<>();
        PlanTaskRefiner fake = section -> {
            asked.add(section);
            return Optional.of(asked.size() == 1
                    ? new PlanTaskRefiner.Refined("공통수학2", 50, 50, List.of(new PlanTaskRefiner.Task("탐구 보고서", 30), new PlanTaskRefiner.Task("문항 제작", 20)), 0, 0)
                    : new PlanTaskRefiner.Refined("국어", 50, 50, List.of(new PlanTaskRefiner.Task("과제", 30)), 0, 0));
        };
        PlanExtractor.Subject nameOnly = subject("이름만 의심", t, List.of("항목 이름 확인"));
        int changed = PlanTaskRefiner.apply(fake, List.of(t), List.of(confirmed, flagged, badAnswer, nameOnly));
        assertEquals(1, changed);
        assertEquals(2, asked.size());   // 확정 과목·이름만 의심인 과목은 보내지 않음
        assertEquals(List.of(PlanTaskRefiner.CHECK_MARK), flagged.check);   // 보정해도 자동 확정되지 않음
        assertEquals(2, flagged.items.size());
        assertEquals(List.of("수행 항목 없음"), badAnswer.check);   // 합이 안 맞는 답은 버림
    }

    private static PlanExtractor.Subject subject(String name, SourceTable t, List<String> check) {
        PlanExtractor.Subject s = new PlanExtractor.Subject();
        s.name = name;
        s.examPercent = 50.0;
        s.performancePercent = 50.0;
        s.source = t;
        s.check = check;
        return s;
    }
}
