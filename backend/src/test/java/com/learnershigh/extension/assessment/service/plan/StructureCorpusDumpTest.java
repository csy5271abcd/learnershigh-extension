package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Block;
import com.learnershigh.extension.assessment.dto.plan.PlanStructurePreviewResponse.Cell;
import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * 로컬 코퍼스 대조용 덤프 (A10 검증 도구, 기본 실행 안 함). PLAN_STRUCTURE_CORPUS_LIST(파일 경로 목록, 한 줄에 하나)와
 * PLAN_STRUCTURE_CORPUS_OUT(TSV 출력)을 주면 각 문서의 위치(section·path·kind)와 글자를 내보낸다. 분석기 DocumentModel 덤프와
 * 비교해 documentLocator 위치 규칙이 같은지 확인한다. 문서는 저장소에 넣지 않는다(공개 문서라도 로컬 참조 자료).
 */
@EnabledIfEnvironmentVariable(named = "PLAN_STRUCTURE_CORPUS_LIST", matches = ".+")
class StructureCorpusDumpTest {

    @Test
    void dump() throws IOException {
        List<String> files = Files.readAllLines(Path.of(System.getenv("PLAN_STRUCTURE_CORPUS_LIST")), StandardCharsets.UTF_8);
        try (PrintWriter out = new PrintWriter(Files.newBufferedWriter(Path.of(System.getenv("PLAN_STRUCTURE_CORPUS_OUT")),
                StandardCharsets.UTF_8))) {
            int index = 0;
            for (String file : files) {
                if (file.isBlank()) {
                    continue;
                }
                String id = "f" + index++;
                byte[] bytes = Files.readAllBytes(Path.of(file.strip()));
                // 서비스와 같게 확장자가 아니라 바이트로 판별한다(ZIP = HWPX, 그 밖 = HWP)
                PlanDocumentFormat format = bytes.length > 1 && bytes[0] == 'P' && bytes[1] == 'K' ? PlanDocumentFormat.HWPX
                        : PlanDocumentFormat.HWP;
                long started = System.nanoTime();
                try {
                    PlanStructurePreviewResponse r = PlanStructurePreviewQueryService.render("p", "r", format, "", bytes, 30_000);
                    for (Block b : r.blocks()) {
                        walk(out, id, b);
                    }
                    out.println(id + "\t#STATS\t" + r.stats().paragraphs() + "\t" + r.stats().tables() + "\t" + r.stats().cells()
                            + "\t" + (System.nanoTime() - started) / 1_000_000 + "ms\t" + bytes.length);
                } catch (RuntimeException failed) {
                    out.println(id + "\t#FAILED\t" + failed);
                }
            }
        }
    }

    static void walk(PrintWriter out, String id, Block b) {
        if (b.type().equals("PARAGRAPH")) {
            out.println(id + "\tP\t" + b.section() + "\t" + b.path() + "\t" + b.kind() + "\t" + clean(b.text()));
            if (b.blocks() != null) {
                for (Block c : b.blocks()) {
                    walk(out, id, c);
                }
            }
        } else {
            if (b.caption() != null) {
                for (Block c : b.caption()) {
                    walk(out, id, c);
                }
            }
            for (Cell cell : b.cells()) {
                out.println(id + "\tC\t" + b.section() + "\t" + cell.path() + "\t" + cell.rowSpan() + "x" + cell.colSpan());
                for (Block p : cell.paragraphs()) {
                    walk(out, id, p);
                }
            }
        }
    }

    private static String clean(String text) {
        return text == null ? "" : text.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
    }
}
