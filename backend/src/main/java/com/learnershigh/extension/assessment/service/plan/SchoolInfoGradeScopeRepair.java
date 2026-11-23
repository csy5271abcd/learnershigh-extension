package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A28-09 기존 데이터 보정(1회성, 기본 꺼짐): '과별' 공시인데 제목 첫머리 학년(예: 1학년)만으로 한 학년 칸에만 연결된 학교알리미 원본을
 * 바뀐 분류 규칙(본문이 1·2·3학년을 모두 다루면 같은 학기 전 학년 공용)으로 다시 판정해, 빠진 학년 칸 연결만 더한다.
 * <ul>
 *   <li>{@code assessment.schoolinfo.grade-scope-repair=dry-run}: 대상·추가 예정 연결만 보고(쓰기 0)</li>
 *   <li>{@code =apply}: 빠진 칸만 기존 연결 경로({@link SchoolInfoSyncWriter#link})로 추가 — 이미 있는 연결은 그대로(멱등, 재실행 0건).
 *       기존 연결·문서·Revision·검토·확정은 지우거나 바꾸지 않는다. 같은 학년도·같은 학기만(다른 학기·연도·학교로 복제하지 않음).
 *       새 칸 문서는 분석하지 않는다(관리자 화면 진입·다시 확인 때 기존 규칙대로).</li>
 *   <li>보관 원본은 SHA-256 을 다시 확인한 뒤에만 판정한다. 학교알리미에 다시 접속하지 않는다.</li>
 * </ul>
 * 보고 파일: {@code assessment.schoolinfo.grade-scope-repair-report}(기본 tmp). 운영 Profile 에서도 값이 없으면 아무것도 하지 않는다.
 */
@Component
public class SchoolInfoGradeScopeRepair implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchoolInfoGradeScopeRepair.class);

    public record Candidate(String sourceFileId, String schoolId, int year, Set<Integer> semesters, Set<Integer> linkedGrades,
            Set<Integer> missingGrades, String fileName) {
    }

    private final String mode;
    private final String reportPath;
    /** A28-24: 보정 범위 제한 'schoolId:학년도'(쉼표로 여럿). 비우면 dry-run 은 전체를 보고만 하고, apply 는 거절한다(광범위 일괄 보정 방지) */
    private final java.util.Set<String> scope;
    private final SchoolInfoSourceFileRepository sources;
    private final SchoolInfoSlotLinkRepository links;
    private final PlanRevisionRepository revisions;
    private final PlanDocumentStorage storage;
    private final SchoolInfoSyncWriter writer;
    private final JsonMapper mapper;
    private final Clock clock;

    public SchoolInfoGradeScopeRepair(@Value("${assessment.schoolinfo.grade-scope-repair:}") String mode,
            @Value("${assessment.schoolinfo.grade-scope-repair-report:}") String reportPath,
            @Value("${assessment.schoolinfo.grade-scope-repair-scope:}") String scope, SchoolInfoSourceFileRepository sources,
            SchoolInfoSlotLinkRepository links, PlanRevisionRepository revisions, PlanDocumentStorage storage, SchoolInfoSyncWriter writer,
            JsonMapper mapper, Clock clock) {
        this.mode = mode == null ? "" : mode.strip();
        this.reportPath = reportPath;
        this.scope = scope == null || scope.isBlank() ? java.util.Set.of()
                : java.util.Arrays.stream(scope.split(",")).map(String::strip).filter(s -> !s.isEmpty()).collect(java.util.stream.Collectors.toSet());
        this.sources = sources;
        this.links = links;
        this.revisions = revisions;
        this.storage = storage;
        this.writer = writer;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!"dry-run".equals(mode) && !"apply".equals(mode)) {
            return;
        }
        if ("apply".equals(mode) && scope.isEmpty()) {
            log.warn("grade-scope-repair apply refused: assessment.schoolinfo.grade-scope-repair-scope 가 비어 있음(학교:학년도 지정 필요)");
            return;
        }
        List<Candidate> candidates = plan();
        List<String> lines = new ArrayList<>();
        lines.add("mode=" + mode + " candidates=" + candidates.size() + " missingLinks="
                + candidates.stream().mapToInt(c -> c.missingGrades().size() * c.semesters().size()).sum());
        int added = 0;
        int unchanged = 0;
        for (Candidate c : candidates) {
            lines.add(String.join("\t", c.schoolId(), String.valueOf(c.year()), "semesters=" + c.semesters(), "linked=" + c.linkedGrades(),
                    "missing=" + c.missingGrades(), c.sourceFileId(), c.fileName()));
            if ("apply".equals(mode)) {
                int[] r = apply(c);
                added += r[0];
                unchanged += r[1];
            }
        }
        if ("apply".equals(mode)) {
            lines.add("applied added=" + added + " unchanged=" + unchanged);
        }
        lines.forEach(line -> log.info("grade-scope-repair {}", line));
        try {
            Path out = reportPath == null || reportPath.isBlank()
                    ? Path.of(System.getProperty("java.io.tmpdir"), "lh-grade-scope-repair-" + mode + ".tsv") : Path.of(reportPath);
            Files.write(out, lines, StandardCharsets.UTF_8);
            log.info("grade-scope-repair report={}", out);
        } catch (IOException e) {
            log.warn("grade-scope-repair report write failed cause={}", e.getClass().getSimpleName());
        }
    }

    /** 대상 계산(쓰기 없음): 제목 학년만으로 연결된 VERIFIED 원본 중 새 규칙이 전 학년 공용으로 판정하고 빠진 학년 칸이 있는 것 */
    public List<Candidate> plan() {
        List<Candidate> out = new ArrayList<>();
        for (SchoolInfoSourceFile f : sources.findAll()) {
            if (f.verification() != SchoolInfoSourceFile.Verification.VERIFIED || f.storageKey() == null || f.evidenceJson() == null) {
                continue;
            }
            JsonNode ev = mapper.readTree(f.evidenceJson());
            if (!scope.isEmpty() && !scope.contains(f.schoolId() + ":" + f.requestedYear())) {
                continue;
            }
            if (!"documentTitle".equals(ev.path("gradeFrom").asString(""))
                    || !SchoolInfoSourceClassifier.SUBJECT_DEPARTMENT.matcher(SchoolInfoSourceClassifier.compact(f.fileName())).find()) {
                continue;
            }
            byte[] bytes;
            try (InputStream in = storage.open(f.storageKey())) {
                bytes = in.readAllBytes();
            } catch (IOException | RuntimeException e) {
                log.warn("grade-scope-repair skip unreadable source={}", f.id());
                continue;
            }
            if (bytes.length != f.sizeBytes() || !OfficialOriginalVerifier.sha256(bytes).equals(f.sha256())) {
                log.warn("grade-scope-repair skip integrity source={}", f.id());
                continue;
            }
            Integer month = ev.path("disclosureMonth").isNumber() ? ev.path("disclosureMonth").asInt() : null;
            SchoolInfoSourceClassifier.Result r = SchoolInfoSourceClassifier.classify(f.requestedYear(), f.resolvedSourceYear(), true,
                    f.fileName(), bytes, month);
            // A28-24: 새 판정이 제목 학년보다 넓을 때만(전 학년 또는 단원 근거 학년). 같은 학년도·같은 학기만
            if (r.verification() != SchoolInfoSourceFile.Verification.VERIFIED || r.grades().size() < 2) {
                continue;
            }
            List<SchoolInfoSlotLink> mine = links.findBySourceFileId(f.id());
            Set<Integer> linked = mine.stream().map(SchoolInfoSlotLink::grade).collect(Collectors.toCollection(TreeSet::new));
            Set<Integer> semesters = new TreeSet<>(r.semesters());
            Set<Integer> missing = new TreeSet<>(r.grades());
            missing.removeIf(g -> semesters.stream().allMatch(s -> mine.stream().anyMatch(l -> l.grade() == g && l.semester() == s)));
            if (!missing.isEmpty() && !mine.isEmpty()) {
                out.add(new Candidate(f.id(), f.schoolId(), mine.getFirst().academicYear(), semesters, linked, missing, f.fileName()));
            }
        }
        return out;
    }

    /** 빠진 칸만 기존 연결 경로로 추가. 반환 [추가, 이미 있음] */
    int[] apply(Candidate c) {
        SchoolInfoSourceFile f = sources.findById(c.sourceFileId()).orElseThrow();
        List<SchoolInfoSlotLink> mine = links.findBySourceFileId(f.id());
        String sourceUrl = mine.stream().map(l -> revisions.findById(l.revisionId())).flatMap(java.util.Optional::stream)
                .map(com.learnershigh.extension.assessment.entity.PlanRevision::sourceUrl).filter(u -> u != null && !u.isBlank()).findFirst()
                .orElse(null);
        byte[] bytes;
        try (InputStream in = storage.open(f.storageKey())) {
            bytes = in.readAllBytes();
        } catch (IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
        int added = 0;
        int unchanged = 0;
        for (int g : c.missingGrades()) {
            for (int s : c.semesters()) {
                SchoolInfoSyncWriter.Linked l = writer.link(SchoolInfoSyncService.SYSTEM, f, c.year(), g, s, bytes, sourceUrl, clock.instant());
                if (l.outcome() == SchoolInfoSyncWriter.Outcome.UNCHANGED) {
                    unchanged++;
                } else {
                    added++;
                }
            }
        }
        return new int[] {added, unchanged};
    }
}
