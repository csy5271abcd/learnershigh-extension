package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.SchoolInfoClassificationRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSourcesResponse;
import com.learnershigh.extension.assessment.entity.SchoolInfoClassification;
import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile.Verification;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.assessment.repository.SchoolInfoClassificationRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * A27-UX 부록 F (api-contract §38-14): 분류하지 못한 학교알리미 원본의 학년·학기를 관리자가 정한다.
 * <ol>
 *   <li>출처·학교·학년도 확인은 받을 때 서버가 정했다(verification). 이 서비스는 그것을 바꾸지 않는다 — UNCLASSIFIED 만 분류할 수 있다.</li>
 *   <li>분류는 Revision 으로 쌓고, 고른 학년 × 학기 칸마다 §38 문서로 등록·연결한다(한 트랜잭션). 이미 연결된 칸은 그대로, 빼기는 409.</li>
 * </ol>
 * 분석 결과 확정·학생 공개가 아니다. 분석은 서버 작업이 차례로 돌리고, 검토·확정은 기존 흐름 그대로다.
 */
@Service
public class SchoolInfoClassificationService {

    private final SchoolInfoSourceFileRepository sources;
    private final SchoolInfoSlotLinkRepository links;
    private final SchoolInfoClassificationRepository classifications;
    private final EvaluationPlanRepository planRows;
    private final SchoolInfoSyncWriter writer;
    private final SchoolInfoSyncService sync;
    private final PlanDocumentStorage storage;
    private final PlanAccess access;
    private final AssessmentTimes times;
    private final JsonMapper mapper;
    private final com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient client;

    public SchoolInfoClassificationService(SchoolInfoSourceFileRepository sources, SchoolInfoSlotLinkRepository links,
            SchoolInfoClassificationRepository classifications, EvaluationPlanRepository planRows, SchoolInfoSyncWriter writer,
            SchoolInfoSyncService sync, PlanDocumentStorage storage, PlanAccess access, AssessmentTimes times, JsonMapper mapper,
            com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient client) {
        this.client = client;
        this.sources = sources;
        this.links = links;
        this.classifications = classifications;
        this.planRows = planRows;
        this.writer = writer;
        this.sync = sync;
        this.storage = storage;
        this.access = access;
        this.times = times;
        this.mapper = mapper;
    }

    /** GET §38-14: 최근 3개 학년도의 확인되지 않은 원본 + 관리자가 분류한 원본. 읽기만 한다. */
    @Transactional(readOnly = true)
    public SchoolInfoSourcesResponse list(AdminActor admin, String schoolId) {
        access.requireOperator(admin);
        List<Integer> years = sync.expectedYears();
        List<SchoolInfoSourceFile> all = sources.findBySchoolIdAndRequestedYearIn(schoolId, years);
        List<String> ids = all.stream().map(SchoolInfoSourceFile::id).toList();
        List<SchoolInfoClassification> decisions = ids.isEmpty() ? List.of() : classifications.findBySourceFileIdInOrderByVersionAsc(ids);
        List<SchoolInfoSlotLink> slotLinks = links.findBySchoolIdAndAcademicYearIn(schoolId, years);
        Set<String> live = livePlans(slotLinks);
        List<SchoolInfoSourcesResponse.Item> items = new ArrayList<>();
        for (SchoolInfoSourceFile f : all) {
            List<SchoolInfoClassification> mine = decisions.stream().filter(d -> d.sourceFileId().equals(f.id())).toList();
            if (f.verification() == Verification.VERIFIED && mine.isEmpty()
                    && !"AUTO_ALL_GRADES".equals(SchoolInfoSyncService.groupOf(f.verification(), text(evidence(f), "reason")))) {
                continue;
            }
            items.add(item(f, mine, slotLinks, live));
        }
        items.sort(Comparator.comparing(SchoolInfoSourcesResponse.Item::academicYear).reversed()
                .thenComparing(SchoolInfoSourcesResponse.Item::fileName));
        return new SchoolInfoSourcesResponse(schoolId, years, items);
    }

    /** GET §38-14 원본 바이트 (관리자만). 학교가 다르면 404. */
    @Transactional(readOnly = true)
    public Original original(AdminActor admin, String schoolId, String sourceFileId) {
        access.requireOperator(admin);
        SchoolInfoSourceFile f = owned(schoolId, sourceFileId);
        if (f.storageKey() == null) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_FOUND);
        }
        return new Original(f.fileName(), contentType(f.format()), read(f.storageKey()));
    }

    public record Original(String fileName, String contentType, byte[] bytes) {
    }

    /** PUT §38-14. 분류 Revision + 칸 연결이 한 트랜잭션. 분석은 커밋 뒤 서버 작업 줄에 넣는다. */
    @Transactional
    public SchoolInfoSourcesResponse.Item classify(AdminActor admin, String sourceFileId, SchoolInfoClassificationRequest request) {
        access.requireOperator(admin);
        SchoolInfoSourceFile f = owned(request.schoolId().strip(), sourceFileId);
        if (f.verification() != Verification.UNCLASSIFIED) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE,
                    AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE.message(), Map.of("reason", f.verification().name()));
        }
        if (request.academicYear() != f.requestedYear() || !sync.expectedYears().contains(f.requestedYear())) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE,
                    AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE.message(), Map.of("reason", "ACADEMIC_YEAR_DIFFERS"));
        }
        if (f.storageKey() == null || f.format() == null) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE,
                    AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE.message(), Map.of("reason", "ORIGINAL_NOT_STORED"));
        }
        List<SchoolInfoClassification> mine = classifications.findBySourceFileIdInOrderByVersionAsc(List.of(f.id()));
        int current = mine.isEmpty() ? 0 : mine.getLast().version();
        if (request.expectedVersion() != current) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_CLASSIFICATION_CONFLICT);
        }
        TreeSet<Integer> grades = new TreeSet<>(request.grades());
        TreeSet<Integer> semesters = new TreeSet<>(request.semesters());
        // 이미 연결된 칸은 뺄 수 없다(검토·확정 이력이 걸릴 수 있음 — 문서 삭제 §38-9 로만)
        List<SchoolInfoSlotLink> existing = links.findBySchoolIdAndAcademicYearIn(f.schoolId(), List.of(f.requestedYear())).stream()
                .filter(l -> l.sourceFileId().equals(f.id())).toList();
        for (SchoolInfoSlotLink l : existing) {
            if (!grades.contains(l.grade()) || !semesters.contains(l.semester())) {
                throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_CLASSIFICATION_SLOT_REMOVAL);
            }
        }
        try {
            classifications.saveAndFlush(SchoolInfoClassification.decide(f.id(), current + 1, List.copyOf(grades), List.copyOf(semesters),
                    request.note(), admin.adminId(), times.now()));
        } catch (DataIntegrityViolationException race) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_CLASSIFICATION_CONFLICT);
        }
        byte[] bytes = read(f.storageKey());
        String sourceUrl = sourceUrlOf(f);
        List<String[]> queued = new ArrayList<>();
        for (int g : grades) {
            for (int s : semesters) {
                SchoolInfoSyncWriter.Linked l = writer.link(admin, f, f.requestedYear(), g, s, bytes, sourceUrl, times.now());
                if (l.outcome() != SchoolInfoSyncWriter.Outcome.UNCHANGED && l.revisionId() != null) {
                    queued.add(new String[] {l.planId(), l.revisionId()});
                }
            }
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                queued.forEach(q -> sync.queueAnalysis(admin, q[0], q[1]));
            }
        });
        List<SchoolInfoSlotLink> after = links.findBySchoolIdAndAcademicYearIn(f.schoolId(), List.of(f.requestedYear()));
        return item(f, classifications.findBySourceFileIdInOrderByVersionAsc(List.of(f.id())), after, livePlans(after));
    }

    // ---------------------------------------------------------------- 내부

    private SchoolInfoSourceFile owned(String schoolId, String sourceFileId) {
        return sources.findById(sourceFileId).filter(f -> f.schoolId().equals(schoolId))
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_FOUND));
    }

    private Set<String> livePlans(List<SchoolInfoSlotLink> slotLinks) {
        Set<String> live = new HashSet<>();
        if (!slotLinks.isEmpty()) {
            planRows.findAllById(slotLinks.stream().map(SchoolInfoSlotLink::planId).distinct().toList()).forEach(p -> live.add(p.id()));
        }
        return live;
    }

    private SchoolInfoSourcesResponse.Item item(SchoolInfoSourceFile f, List<SchoolInfoClassification> mine, List<SchoolInfoSlotLink> slotLinks,
            Set<String> live) {
        JsonNode ev = evidence(f);
        List<SchoolInfoSourcesResponse.Decision> history = mine.stream().map(this::decision).toList();
        List<SchoolInfoSourcesResponse.LinkedSlot> linked = slotLinks.stream()
                .filter(l -> l.sourceFileId().equals(f.id()) && live.contains(l.planId()))
                .sorted(Comparator.comparingInt(SchoolInfoSlotLink::grade).thenComparingInt(SchoolInfoSlotLink::semester))
                .map(l -> new SchoolInfoSourcesResponse.LinkedSlot(l.grade(), l.semester(), l.planId()))
                .toList();
        return new SchoolInfoSourcesResponse.Item(f.id(), f.requestedYear(), f.resolvedSourceYear(), f.fileName(), f.format(), f.sizeBytes(),
                f.sha256(), f.verification().name(), text(ev, "reason"), SchoolInfoSyncService.groupOf(f.verification(), text(ev, "reason")),
                f.verification() == Verification.UNCLASSIFIED && f.storageKey() != null,
                new SchoolInfoSourcesResponse.Evidence(ints(ev, "grades"), ints(ev, "semesters")),
                history.isEmpty() ? null : history.getLast(), history, linked, f.storageKey() != null);
    }

    private SchoolInfoSourcesResponse.Decision decision(SchoolInfoClassification c) {
        return new SchoolInfoSourcesResponse.Decision(c.version(), c.grades(), c.semesters(), c.note(), c.decidedBy(),
                times.toOffset(c.decidedAt()));
    }

    private JsonNode evidence(SchoolInfoSourceFile f) {
        if (f.evidenceJson() == null) {
            return null;
        }
        try {
            return mapper.readTree(f.evidenceJson());
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static String text(JsonNode n, String field) {
        return n != null && n.path(field).isString() ? n.path(field).asString() : null;
    }

    private static List<Integer> ints(JsonNode n, String field) {
        List<Integer> out = new ArrayList<>();
        if (n != null && n.path(field).isArray()) {
            n.path(field).forEach(v -> {
                if (v.isInt()) {
                    out.add(v.asInt());
                }
            });
        }
        return out;
    }

    private String sourceUrlOf(SchoolInfoSourceFile f) {
        return client.base() + "/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=" + java.net.URLEncoder.encode(String.valueOf(f.schoolinfoSchoolId()),
                java.nio.charset.StandardCharsets.UTF_8) + "&JG_YEAR=" + f.requestedYear();
    }

    private byte[] read(String key) {
        try (InputStream in = storage.open(key)) {
            return in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String contentType(String format) {
        if (format == null) {
            return "application/octet-stream";
        }
        return switch (format) {
            case "PDF" -> "application/pdf";
            case "HWP" -> "application/x-hwp";
            case "HWPX" -> "application/hwp+zip";
            default -> "application/octet-stream";
        };
    }

}
