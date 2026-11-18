package com.learnershigh.extension.assessment.service.plan.extract;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.service.plan.PlanTableReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 로컬 원문으로 추출 결과 확인 (EXTRACT_SAMPLE_DIR 이 있을 때만). 결과는 같은 폴더 _java_extract.txt 에. */
class ExtractSampleTest {
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
                String name = p.getFileName().toString();
                String low = name.toLowerCase();
                PlanDocumentFormat format = PlanDocumentFormat.valueOf(low.substring(low.lastIndexOf('.') + 1).toUpperCase());
                List<SourceTable> tables = PlanTableReader.read(Files.readAllBytes(p), format, 120_000,
                        System.getenv("EXTRACT_OCR") != null ? ScanOcr.engine(System.getenv("EXTRACT_OCR")) : null);
                List<PlanExtractor.Subject> subjects = PlanExtractor.extract(tables, name, "");
                long items = subjects.stream().mapToLong(s -> s.items.size()).sum();
                long rubric = subjects.stream().flatMap(s -> s.items.stream()).filter(i -> i.detail() != null && !i.detail().rubric.isEmpty()).count();
                long ok = subjects.stream().filter(s -> s.check.isEmpty()).count();
                sb.append("FILE ").append(name).append(" subjects=").append(subjects.size()).append(" ok=").append(ok)
                        .append(" items=").append(items).append(" rubric=").append(rubric)
                        .append(" ms=").append((System.nanoTime() - t0) / 1_000_000).append('\n');
                for (PlanExtractor.Subject s : subjects) {
                    sb.append("S ").append(s.name).append(" | ").append(s.examPercent).append('/').append(s.performancePercent)
                            .append(" | ").append(s.check).append(s.ratioOnly ? " ratioOnly" : "").append(" | ");
                    for (PlanExtractor.Item it : s.items) {
                        sb.append(it.name()).append(' ').append(it.weightPercent()).append('%');
                        if (it.detail() != null && !it.detail().rubric.isEmpty()) {
                            sb.append(" R").append(it.detail().rubric.size()).append('[');
                            it.detail().rubric.forEach(e -> sb.append(e.element().length() > 12 ? e.element().substring(0, 12) : e.element()).append(':').append(e.maxScore()).append(','));
                            sb.append(']');
                        }
                        sb.append("; ");
                    }
                    sb.append(" | exams ");
                    s.exams.forEach(e -> sb.append(e.round()).append(':').append(e.label()).append('=').append(e.weightPercent()).append(' '));
                    sb.append("| plan ").append(s.plan.size());
                    s.plan.stream().limit(2).forEach(r -> sb.append(" [").append(r.month()).append('~').append(r.monthTo()).append(" w")
                            .append(r.weekFrom()).append('-').append(r.weekTo()).append(' ').append(r.unit()).append(" std")
                            .append(r.standards().size()).append(']'));
                    sb.append('\n');
                }
            }
        }
        Files.writeString(Path.of(dir, "_java_extract.txt"), sb.toString());
    }
}
