package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerClient;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException;
import com.learnershigh.extension.assessment.service.plan.extract.ImportPayload;
import com.learnershigh.extension.assessment.service.plan.extract.PlanExtractor;
import com.learnershigh.extension.assessment.service.plan.extract.SourceTable;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * 서버 안에서 평가계획서를 읽는 분석기 (외부 분석기 서비스 없이). 표를 뽑아(PDF·HWP·HWPX) 지필·수행 비율, 수행 항목,
 * 항목별 채점 기준을 읽고, 기존 수신 계약(analysis-import) 모양으로 돌려준다. 원문은 서버 밖으로 나가지 않는다.
 */
public class LocalPlanAnalyzer implements PlanAnalyzerClient {

    private static final Logger log = LoggerFactory.getLogger(LocalPlanAnalyzer.class);
    public static final String NAME = "learnershigh-plan-extract";
    private final JsonMapper mapper;
    private final long timeoutMillis;
    /** 최근 분석 결과 8개 (원문 SHA·파일 이름·계약·버전 기준). 메모리 상한을 위해 오래된 것부터 버린다. */
    private final Map<String, Result> recent = new java.util.LinkedHashMap<>(16, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Result> eldest) {
            return size() > 8;
        }
    };
    private final com.learnershigh.extension.assessment.service.plan.extract.ScanOcr.Engine ocr;

    public LocalPlanAnalyzer(JsonMapper mapper, long timeoutMillis) {
        this(mapper, timeoutMillis, null);
    }

    /** ocr: 스캔본 PDF 용 OCR 엔진(null 이면 스캔 쪽은 읽지 않는다). */
    public LocalPlanAnalyzer(JsonMapper mapper, long timeoutMillis,
            com.learnershigh.extension.assessment.service.plan.extract.ScanOcr.Engine ocr) {
        this.mapper = mapper;
        this.timeoutMillis = timeoutMillis;
        this.ocr = ocr;
    }

    @Override
    public boolean configured() {
        return true;
    }

    @Override
    public Result analyze(Request request) {
        long t0 = System.nanoTime();
        byte[] bytes = request.bytes();
        PlanDocumentFormat format = formatOf(bytes);
        if (format == null) {
            throw new PlanAnalyzerException(PlanAnalyzerException.Kind.REJECTED, "UNSUPPORTED_FORMAT", "unsupported document format");
        }
        String sha = sha256(bytes);
        boolean c03 = "0.3".equals(request.contract());
        // 같은 원문(여러 학년 공통 문서를 학년마다 등록할 때 등)은 다시 읽지 않는다 — 규칙이 같으면 결과도 같다
        String key = sha + "|" + request.fileName() + "|" + request.contract() + "|" + request.analyzerVersion();
        synchronized (recent) {
            Result hit = recent.get(key);
            if (hit != null) {
                log.info("plan extract reused sha={}", sha.substring(0, 12));
                return hit;
            }
        }
        try {
            List<SourceTable> tables = PlanTableReader.read(bytes, format, timeoutMillis, ocr);
            List<PlanExtractor.Subject> subjects = PlanExtractor.extract(tables, request.fileName(), "");
            Integer pages = format == PlanDocumentFormat.PDF ? pageCount(bytes) : null;
            Map<String, Object> payload = ImportPayload.build(subjects, format, sha, pages, c03, request.analyzerVersion());
            boolean ok = "REVIEW_REQUIRED".equals(payload.get("status"));
            int elapsed = (int) ((System.nanoTime() - t0) / 1_000_000);
            log.info("plan extract done format={} tables={} subjects={} elapsedMs={} sha={}", format, tables.size(),
                    ((List<?>) payload.get("subjects")).size(), elapsed, sha.substring(0, 12));
            Result result = new Result("local-" + sha.substring(0, 12), ok ? "OK_REVIEW_REQUIRED" : "NO_ASSESSMENTS_EXTRACTED",
                    request.analyzerVersion(), "LOCAL", sha, elapsed,
                    format == PlanDocumentFormat.PDF ? "OFFICIAL_PDF" : "EXPERIMENTAL_MULTIFORMAT", true, List.of(),
                    mapper.writeValueAsString(payload), List.of(), List.of(), 200, c03 ? "0.3" : null, null);
            synchronized (recent) {
                recent.put(key, result);
            }
            return result;
        } catch (IOException | RuntimeException e) {
            log.warn("plan extract failed format={} sha={} cause={}", format, sha.substring(0, 12), e.getClass().getSimpleName());
            throw new PlanAnalyzerException(PlanAnalyzerException.Kind.SERVER_ERROR, "EXTRACT_FAILED", "plan extract failed");
        }
    }

    public static PlanDocumentFormat formatOf(byte[] b) {
        if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F') {
            return PlanDocumentFormat.PDF;
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0xD0 && (b[1] & 0xFF) == 0xCF && (b[2] & 0xFF) == 0x11 && (b[3] & 0xFF) == 0xE0) {
            return PlanDocumentFormat.HWP;
        }
        if (b.length >= 4 && b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4) {
            return PlanDocumentFormat.HWPX;
        }
        return null;
    }

    private static Integer pageCount(byte[] pdf) throws IOException {
        try (var doc = org.apache.pdfbox.Loader.loadPDF(pdf)) {
            return doc.getNumberOfPages();
        }
    }

    static String sha256(byte[] b) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

}
