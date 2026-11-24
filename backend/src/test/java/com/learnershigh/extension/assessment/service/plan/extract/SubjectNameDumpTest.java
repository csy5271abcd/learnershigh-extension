package com.learnershigh.extension.assessment.service.plan.extract;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.service.plan.LocalPlanAnalyzer;
import com.learnershigh.extension.assessment.service.plan.PlanTableReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** 코퍼스 전체 과목명 덤프 (SUBJ_DUMP_CORPUS = ';' 구분 루트, SUBJ_DUMP_OUT = TSV). 변수가 없으면 아무것도 안 한다. */
class SubjectNameDumpTest {
    @Test
    void dump() throws Exception {
        String roots = System.getenv("SUBJ_DUMP_CORPUS");
        if (roots == null) {
            return;
        }
        Path out = Path.of(System.getenv("SUBJ_DUMP_OUT"));
        Set<String> seen = new HashSet<>();
        StringBuilder sb = new StringBuilder("school\tfile\tsubject\tok\titems\tpage\n");
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
                for (Path f : files) {
                    try {
                        byte[] bytes = Files.readAllBytes(f);
                        PlanDocumentFormat format = LocalPlanAnalyzer.formatOf(bytes);
                        List<SourceTable> tables = PlanTableReader.read(bytes, format, 120_000);
                        for (PlanExtractor.Subject s : PlanExtractor.extract(tables, f.getFileName().toString(), name)) {
                            sb.append(name).append('\t').append(f.toString()).append('\t').append(s.name).append('\t')
                                    .append(s.check.isEmpty() ? 1 : 0).append('\t').append(s.items.size()).append('\t')
                                    .append(s.source != null ? String.valueOf(s.source.page()) : "-1").append('\n');
                        }
                    } catch (Exception | OutOfMemoryError e) {
                        sb.append(name).append('\t').append(f).append("\t#ERROR ").append(e.getClass().getSimpleName()).append("\t0\t0\t-1\n");
                    }
                }
                Files.writeString(out, sb.toString());
            }
        }
    }
}
