package com.learnershigh.extension.assessment.service.plan.extract;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.service.plan.PlanTableReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * 받아 둔 학교 원문 전체로 추출 수치 측정 (EXTRACT_CORPUS = 학교 폴더들이 든 폴더 목록, ';' 구분일 때만).
 * 학교마다 한 줄: 과목 수, 값 검증 통과 과목, 수행 항목, 채점 기준 붙은 항목, 채점 기준 만점 합 일치 항목, 걸린 시간.
 */
class ExtractCorpusTest {
    @Test
    void measure() throws Exception {
        String roots = System.getenv("EXTRACT_CORPUS");
        if (roots == null) {
            return;
        }
        Path out = Path.of(System.getenv().getOrDefault("EXTRACT_OUT", "extract_corpus.tsv"));
        java.util.Set<String> seen = new java.util.HashSet<>();
        StringBuilder sb = new StringBuilder("school\tfiles\tsubjects\tok\titems\trubric\trubricOk\tms\terrors\n");
        for (String root : roots.split(";")) {
            List<Path> schools;
            try (var s = Files.list(Path.of(root))) {
                schools = s.filter(Files::isDirectory).sorted().toList();
            }
            for (Path school : schools) {
                String name = school.getFileName().toString();
                if (!name.endsWith("학교") || !seen.add(name)) {
                    continue;
                }
                List<Path> files = new ArrayList<>();
                try (var w = Files.walk(school)) {
                    w.filter(f -> f.toString().toLowerCase().matches(".*[.](pdf|hwp|hwpx)$"))
                            .filter(f -> !f.getFileName().toString().replace(" ", "").matches(".*(성적관리|규정).*")).forEach(files::add);
                }
                long t0 = System.nanoTime();
                int subjects = 0, ok = 0, items = 0, rubric = 0, rubricOk = 0, errors = 0;
                for (Path f : files) {
                    String low = f.getFileName().toString().toLowerCase();
                    PlanDocumentFormat format = PlanDocumentFormat.valueOf(low.substring(low.lastIndexOf('.') + 1).toUpperCase());
                    try {
                        List<SourceTable> tables = PlanTableReader.read(Files.readAllBytes(f), format, 120_000);
                        for (PlanExtractor.Subject s : PlanExtractor.extract(tables, f.getFileName().toString(), name)) {
                            if (s.name.startsWith("과목명 미확인")) {
                                continue;
                            }
                            subjects++;
                            if (s.check.isEmpty()) {
                                ok++;
                            }
                            for (PlanExtractor.Item it : s.items) {
                                items++;
                                if (it.detail() != null && !it.detail().rubric.isEmpty()) {
                                    rubric++;
                                    if (it.detail().check.isEmpty()) {
                                        rubricOk++;
                                    }
                                }
                            }
                        }
                    } catch (Exception | OutOfMemoryError e) {
                        errors++;
                    }
                }
                sb.append(name).append('\t').append(files.size()).append('\t').append(subjects).append('\t').append(ok).append('\t')
                        .append(items).append('\t').append(rubric).append('\t').append(rubricOk).append('\t')
                        .append((System.nanoTime() - t0) / 1_000_000).append('\t').append(errors).append('\n');
                Files.writeString(out, sb.toString());
            }
        }
    }
}
