package com.learnershigh.extension.assessment.service.plan.extract;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.service.plan.PlanTableReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 로컬 원문으로 표 추출 확인 (EXTRACT_SAMPLE_DIR 이 있을 때만). 결과는 같은 폴더 _java_tables.txt 에. */
class PdfTablesSampleTest {
    /** EXTRACT_FULL_PAGE=N 이면 그 쪽 표는 모든 줄을 적는다. */
    static boolean full(SourceTable t) {
        String p = System.getenv("EXTRACT_FULL_PAGE");
        return p != null && t.page() != null && t.page() == Integer.parseInt(p);
    }

    @Test
    void dump() throws Exception {
        String dir = System.getenv("EXTRACT_SAMPLE_DIR");
        if (dir == null) {
            return;
        }
        StringBuilder sb = new StringBuilder();
        try (var files = Files.list(Path.of(dir))) {
            for (Path p : files.filter(f -> f.toString().toLowerCase().matches(".*[.](pdf|hwp|hwpx)$")).sorted().toList()) {
                long t0 = System.nanoTime();
                String name = p.getFileName().toString().toLowerCase();
                PlanDocumentFormat format = PlanDocumentFormat.valueOf(name.substring(name.lastIndexOf('.') + 1).toUpperCase());
                List<SourceTable> tables = PlanTableReader.read(Files.readAllBytes(p), format, 120_000,
                        System.getenv("EXTRACT_OCR") != null ? ScanOcr.engine(System.getenv("EXTRACT_OCR")) : null);
                sb.append("FILE ").append(p.getFileName()).append(" tables=").append(tables.size())
                        .append(" ms=").append((System.nanoTime() - t0) / 1_000_000).append('\n');
                for (SourceTable t : tables) {
                    sb.append("T p").append(t.page()).append(' ').append(t.cells().size()).append('x')
                            .append(t.cells().isEmpty() ? 0 : t.cells().get(0).size()).append(' ')
                            .append(t.cells().stream().limit(3).map(r -> String.join(" | ", r)).toList()).append('\n');
                    if (full(t)) {
                        for (List<String> r : t.cells()) {
                            List<String> ded = new java.util.ArrayList<>();
                            r.forEach(c -> {
                                if (ded.isEmpty() || !ded.get(ded.size() - 1).equals(c)) {
                                    ded.add(c);
                                }
                            });
                            sb.append("  R ").append(String.join(" || ", ded)).append('\n');
                        }
                    }
                }
            }
        }
        Files.writeString(Path.of(dir, "_java_tables.txt"), sb.toString());
    }
}
