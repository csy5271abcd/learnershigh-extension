package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerClient;
import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 부록 G: 실측(2026-11-19)에서 저장소 밖에 저장한 실제 학교알리미 HTML·공개 첨부를 다시 읽어 파서·분류·분석기를 확인한다.
 * 네트워크 요청 없음. 실측 폴더가 주어질 때만 돈다(-Dlive.dir=…) — 기본 시험에서는 건너뛴다. 결과는 그 폴더의 replay.json.
 * 분류는 실측 격리 평가로만 year-query-verified=true 를 가정한다(운영 설정과 무관).
 */
class SchoolInfoLiveReplayTest {

    @Test
    void 실측_원본으로_파서_분류_분석기를_재현한다() throws Exception {
        String dir = System.getProperty("live.dir");
        assumeTrue(dir != null && Files.isDirectory(Path.of(dir)), "실측 폴더(-Dlive.dir) 없음 — 건너뜀");
        JsonMapper mapper = JsonMapper.builder().build();
        JsonNode summary = mapper.readTree(Files.readString(Path.of(dir, "summary.json")));
        LocalPlanAnalyzer analyzer = new LocalPlanAnalyzer(mapper, 120_000, null);
        Map<String, Object> out = new LinkedHashMap<>();
        for (JsonNode school : summary.path("schools")) {
            String q = school.path("query").asString();
            Map<String, Object> s = new LinkedHashMap<>();
            List<Map<String, Object>> cands = new ArrayList<>();
            for (int i = 0; i < school.path("candidates").size(); i++) {
                String html = Files.readString(Path.of(dir, q + "-detail-" + i + ".html"), StandardCharsets.UTF_8);
                String addr = SchoolInfoClientAccess.address(html);
                String[] region = SchoolInfoClientAccess.region(addr);
                cands.add(Map.of("name", String.valueOf(school.path("candidates").get(i).path("HG_NM").asString()),
                        "address", String.valueOf(addr), "sido", String.valueOf(region[0]), "sigungu", String.valueOf(region[1])));
                assertThat(addr).as(q + " 후보 " + i + " 주소(실측 구조)").isNotBlank();
            }
            s.put("candidates", cands);
            Map<String, Object> years = new LinkedHashMap<>();
            for (var e : school.path("years").properties()) {
                int year = Integer.parseInt(e.getKey());
                String item = Files.readString(Path.of(dir, q + "-item-" + year + ".html"), StandardCharsets.UTF_8);
                SchoolInfoClient.Disclosure[] sel = new SchoolInfoClient.Disclosure[1];
                List<SchoolInfoClient.Disclosure> opts = SchoolInfoClientAccess.disclosures(item, sel);
                Integer resolved = e.getValue().path("formJG_YEAR").isString() ? Integer.valueOf(e.getValue().path("formJG_YEAR").asString()) : null;
                Map<String, Object> y = new LinkedHashMap<>();
                y.put("selectedDisclosure", sel[0] == null ? null : sel[0].year() + "-" + sel[0].chasu() + "차-" + sel[0].month() + "월");
                y.put("disclosureOptions", opts.stream().map(d -> d.year() + "-" + d.chasu() + "차-" + d.month() + "월").toList());
                y.put("listed", e.getValue().path("listed").asInt());
                List<Map<String, Object>> files = new ArrayList<>();
                for (JsonNode d : e.getValue().path("downloaded")) {
                    if (!d.path("savedAs").isString()) {
                        continue;
                    }
                    byte[] bytes = Files.readAllBytes(Path.of(dir, d.path("savedAs").asString()));
                    String name = SchoolInfoClientAccess.fileName(d.path("disposition").asString(null), d.path("name").asString());
                    List<SchoolInfoClient.PlanFile> parts = new ArrayList<>();
                    if (bytes.length > 4 && bytes[0] == 'P' && bytes[1] == 'K' && name.toLowerCase().endsWith(".zip")) {
                        List<SchoolInfoClient.Problem> problems = new ArrayList<>();
                        SchoolInfoClientAccess.unzip(bytes, d.path("seq").asString(), parts, problems, name);
                        problems.forEach(p -> files.add(Map.of("file", p.fileName(), "problem", p.reason())));
                    } else {
                        parts.add(new SchoolInfoClient.PlanFile(name, bytes));
                    }
                    for (SchoolInfoClient.PlanFile part : parts) {
                        var c = SchoolInfoSourceClassifier.classify(year, resolved, true, part.fileName(), part.bytes(), sel[0] == null ? null : sel[0].month());
                        Map<String, Object> f = new LinkedHashMap<>();
                        f.put("file", part.fileName());
                        f.put("zipChildOf", parts.size() > 1 || part.fileName() != name ? name : null);
                        f.put("format", c.format() == null ? null : c.format().name());
                        f.put("verification", c.verification().name());
                        f.put("reason", c.reason());
                        f.put("grades", c.grades());
                        f.put("semesters", c.semesters());
                        f.put("evidence", c.evidence());
                        if (c.format() != null && files.size() < 40) {
                            long t0 = System.nanoTime();
                            try {
                                PlanAnalyzerClient.Result r = analyzer.analyze(new PlanAnalyzerClient.Request(part.bytes(), part.fileName(), "live", "v21.1"));
                                JsonNode payload = mapper.readTree(r.payloadJson());
                                List<String> subjects = new ArrayList<>();
                                int items = 0;
                                for (JsonNode sub : payload.path("subjects")) {
                                    subjects.add(sub.path("subjectName").asString(sub.path("name").asString("?")));
                                    items += sub.path("performanceEvaluation").path("items").size();
                                }
                                f.put("analysis", Map.of("status", String.valueOf(payload.path("status").asString()), "subjects", subjects,
                                        "performanceItems", items, "ms", (System.nanoTime() - t0) / 1_000_000));
                            } catch (RuntimeException ex) {
                                f.put("analysis", Map.of("error", ex.getClass().getSimpleName()));
                            }
                        }
                        files.add(f);
                    }
                }
                y.put("files", files);
                years.put(e.getKey(), y);
            }
            s.put("years", years);
            out.put(q, s);
        }
        Files.writeString(Path.of(dir, "replay.json"), mapper.writerWithDefaultPrettyPrinter().writeValueAsString(out), StandardCharsets.UTF_8);
    }
}
