package com.learnershigh.extension.assessment.service.plan.extract;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.service.plan.LocalPlanAnalyzer;
import com.learnershigh.extension.assessment.service.plan.PlanTableReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** 정확도 측정용: ACCURACY_DIR 의 원문마다 과목 결과를 JSON 줄로 적는다(_subjects.jsonl). 변수가 없으면 아무것도 안 한다. */
class AccuracyDumpTest {
    @Test
    void dump() throws Exception {
        // ACCURACY_JOBS="원문폴더|출력파일;..." 이면 한 JVM에서 여러 묶음. 표는 ACCURACY_CACHE 폴더에 JSON으로 저장해 다시 쓴다
        String jobs = System.getenv("ACCURACY_JOBS");
        if (jobs != null) {
            for (String j : jobs.split(";")) {
                String[] a = j.split("[|]");
                run(a[0], a[1]);
            }
            return;
        }
        String dir = System.getenv("ACCURACY_DIR");
        if (dir == null) {
            return;
        }
        run(dir, System.getenv("ACCURACY_OUT") != null ? System.getenv("ACCURACY_OUT") : Path.of(dir, "_subjects.jsonl").toString());
    }

    @SuppressWarnings("unchecked")
    private static List<SourceTable> tables(Path p, JsonMapper m) throws Exception {
        String cache = System.getenv("ACCURACY_CACHE");
        Path c = cache == null ? null : Path.of(cache, Integer.toHexString(p.toAbsolutePath().toString().hashCode()) + "_" + Files.size(p) + ".json");
        if (c != null && Files.exists(c)) {
            List<java.util.Map<String, Object>> raw = m.readValue(Files.readString(c), List.class);
            List<SourceTable> out = new java.util.ArrayList<>();
            for (var t : raw) {
                out.add(new SourceTable((Integer) t.get("page"), (Integer) t.get("section"), (String) t.get("path"),
                        (List<List<String>>) t.get("cells"), null, (String) t.get("ctx")));
            }
            return out;
        }
        byte[] bytes = Files.readAllBytes(p);
        PlanDocumentFormat format = LocalPlanAnalyzer.formatOf(bytes);
        if (format == null) {
            return null;
        }
        List<SourceTable> t = PlanTableReader.read(bytes, format, 120_000, null);
        if (c != null) {
            List<java.util.Map<String, Object>> raw = new java.util.ArrayList<>();
            for (SourceTable x : t) {
                java.util.Map<String, Object> e = new java.util.HashMap<>();
                e.put("page", x.page());
                e.put("section", x.section());
                e.put("path", x.path());
                e.put("cells", x.cells());
                e.put("ctx", x.ctx());
                raw.add(e);
            }
            Files.createDirectories(c.getParent());
            Files.writeString(c, m.writeValueAsString(raw));
        }
        return t;
    }

    private static void run(String dir, String outFile) throws Exception {
        JsonMapper m = JsonMapper.builder().build();
        StringBuilder sb = new StringBuilder();
        try (var files = Files.list(Path.of(dir))) {
            for (Path p : files.filter(f -> f.toString().toLowerCase().matches(".*[.](pdf|hwp|hwpx)$")).sorted().toList()) {
                String name = p.getFileName().toString();
                List<SourceTable> tables;
                try {
                    tables = tables(p, m);
                } catch (Exception e) {
                    continue;
                }
                if (tables == null) {
                    continue;
                }
                for (PlanExtractor.Subject s : ("simple".equals(System.getenv("EXTRACTOR")) ? com.learnershigh.extension.assessment.service.plan.simple.SimplePlanExtractor.extract(tables, name, "") : PlanExtractor.extract(tables, name, ""))) {
                    ObjectNode o = m.createObjectNode();
                    o.put("file", name);
                    o.put("subject", s.name);
                    o.put("exam", s.examPercent);
                    o.put("perf", s.performancePercent);
                    o.put("ratioOnly", s.ratioOnly);
                    o.put("page", s.source != null ? s.source.page() : null);
                    ArrayNode check = o.putArray("check");
                    s.check.forEach(check::add);
                    if (System.getenv("DUMP_SECTION") != null && !s.check.isEmpty() && s.source != null) {
                        o.put("section", com.learnershigh.extension.assessment.service.plan.simple.SectionText.of(tables, s.source));
                    }
                    ArrayNode items = o.putArray("items");
                    for (PlanExtractor.Item it : s.items) {
                        ObjectNode i = items.addObject();
                        i.put("name", it.name());
                        i.put("w", it.weightPercent());
                        i.put("rubric", it.detail() != null ? it.detail().rubric.size() : 0);
                    }
                    sb.append(m.writeValueAsString(o)).append('\n');
                }
            }
        }
        Files.write(Path.of(outFile), sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
