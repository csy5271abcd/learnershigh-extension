package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSelectionRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncResponse;
import com.learnershigh.extension.assessment.entity.PlanAnalysisRun;
import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping;
import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile.Verification;
import com.learnershigh.extension.assessment.entity.SchoolInfoSyncYear;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanAnalysisRunRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSyncYearRepository;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.annotation.PreDestroy;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

/**
 * A27-UX 부록 E (api-contract §38-12): 학교알리미 최근 3개 학년도 × 1~3학년 × 1·2학기(18개 구간) 자동 확인.
 * <ul>
 *   <li>기준 학년도 = 서버 시계(Asia/Seoul) 달력 연도 Y → [Y, Y-1, Y-2]. 요청 배열이 다르면 409.</li>
 *   <li>학년도마다 <b>따로</b> 학교알리미를 조회한다({@link SchoolInfoClient#fetchYear}). 한 학년도 파일을 다른 학년도 슬롯에 넣지 않는다.</li>
 *   <li>출처 분류({@link SchoolInfoSourceClassifier})가 VERIFIED 인 파일만 등록. 기본 설정(year-query-verified=false)에서는 등록 0건.</li>
 *   <li>같은 학교 작업은 하나만(진행 중이면 재사용). 확인 기록(DB)이 TTL 안이면 외부 요청 없이 답한다. 중복 등록은 DB Unique 로도 막는다.</li>
 *   <li>조회·등록·분석은 서버 작업 1개가 차례로 돈다(외부 사이트 예의·서버 자원). 검토·확정은 관리자만.</li>
 * </ul>
 */
@Service
public class SchoolInfoSyncService {

    private static final Logger log = LoggerFactory.getLogger(SchoolInfoSyncService.class);
    static final ZoneId KST = ZoneId.of("Asia/Seoul");
    static final List<Integer> GRADES = List.of(1, 2, 3);
    static final List<Integer> SEMESTERS = List.of(1, 2);
    private static final Set<String> RUNNING_STATES = Set.of("QUEUED", "FETCHING");
    private static final Set<String> HARD_FAIL = Set.of("FAILED", "SCHOOL_AMBIGUOUS", "SCHOOL_NOT_FOUND", "SCHOOL_IDENTITY_REQUIRED");

    private final SchoolInfoClient client;
    private final SchoolInfoSyncWriter writer;
    private final SchoolInfoSourceFileRepository sources;
    private final SchoolInfoSlotLinkRepository links;
    private final SchoolInfoSyncYearRepository syncYears;
    private final PlanAnalysisRunRepository runs;
    private final EvaluationPlanRepository planRows;
    private final SchoolInfoSchoolMappingRepository mappings;
    private final PlanAnalysisService analysis;
    private final AcademicContextProvider contexts;
    private final PlanAccess access;
    private final Clock clock;
    private final JsonMapper mapper;
    private final boolean yearQueryVerified;
    private final Duration ttl;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "schoolinfo-sync");
        t.setDaemon(true);
        return t;
    });
    private final Map<String, Job> jobs = Collections.synchronizedMap(new LinkedHashMap<>());
    private final Map<String, Job> latestBySchool = new ConcurrentHashMap<>();
    /** A28-04: 시연 명단(local-run 전용)의 학교알리미 학교 고정. 명단이 꺼져 있으면 비어 있다 */
    private org.springframework.beans.factory.ObjectProvider<com.learnershigh.extension.assessment.integration.roster.DemoRoster> roster;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setRoster(org.springframework.beans.factory.ObjectProvider<com.learnershigh.extension.assessment.integration.roster.DemoRoster> roster) {
        this.roster = roster;
    }

    /**
     * A28-10: 학교알리미 학교 하나의 대표 학교 키. ① si_ 가 아닌 ACTIVE 관리자 매핑(담당·시연 학교) ② 시연 명단 고정 학교.
     * 없으면 비어 있다(그 학교는 si_ 검색 학교 키로만 쓰인다). 이름은 보지 않는다 — 학교알리미 고유 ID 로만 같다고 본다.
     */
    public Optional<String> canonicalKey(String schoolinfoId) {
        if (schoolinfoId == null) {
            return Optional.empty();
        }
        Optional<String> mapped = mappings.findBySchoolinfoSchoolIdAndStatus(schoolinfoId, SchoolInfoSchoolMapping.ACTIVE).stream()
                .map(SchoolInfoSchoolMapping::schoolId).filter(id -> !id.startsWith(DIRECTORY_PREFIX)).sorted().findFirst();
        if (mapped.isPresent()) {
            return mapped;
        }
        var demo = roster == null ? null : roster.getIfAvailable();
        return demo == null ? Optional.empty() : demo.pinnedSchoolId(schoolinfoId);
    }

    /** A28-10: si_ 검색 학교 키가 다른 대표 학교 키의 별칭이면 그 대표 키 */
    public Optional<String> aliasOf(String schoolId) {
        if (schoolId == null || !schoolId.startsWith(DIRECTORY_PREFIX)) {
            return Optional.empty();
        }
        return mappings.findById(schoolId).filter(SchoolInfoSchoolMapping::active)
                .flatMap(m -> canonicalKey(m.schoolinfoSchoolId())).filter(key -> !key.equals(schoolId));
    }

    /** A28-04: 시연 명단이 이 학교 키에 고정한 학교알리미 학교(고유 ID·주소). 관리자 매핑이 있으면 그것이 먼저다 */
    Optional<com.learnershigh.extension.assessment.integration.roster.DemoRoster.School> rosterPin(String schoolId) {
        var demo = roster == null ? null : roster.getIfAvailable();
        return demo == null ? Optional.empty() : demo.school(schoolId).filter(s -> s.schoolinfoSchoolId() != null);
    }

    public SchoolInfoSyncService(SchoolInfoClient client, SchoolInfoSyncWriter writer, SchoolInfoSourceFileRepository sources,
            SchoolInfoSlotLinkRepository links, SchoolInfoSyncYearRepository syncYears, PlanAnalysisRunRepository runs,
            EvaluationPlanRepository planRows, SchoolInfoSchoolMappingRepository mappings, PlanAnalysisService analysis, AcademicContextProvider contexts, PlanAccess access, Clock clock, JsonMapper mapper,
            @Value("${assessment.schoolinfo.year-query-verified:true}") boolean yearQueryVerified,
            @Value("${assessment.schoolinfo.sync-ttl-hours:24}") long ttlHours) {
        this.client = client;
        this.writer = writer;
        this.sources = sources;
        this.links = links;
        this.syncYears = syncYears;
        this.runs = runs;
        this.planRows = planRows;
        this.mappings = mappings;
        this.analysis = analysis;
        this.contexts = contexts;
        this.access = access;
        this.clock = clock;
        this.mapper = mapper;
        this.yearQueryVerified = yearQueryVerified;
        // 부록 H: 운영 설정 확인용 진단(민감값 없음). true 여도 파일마다 학교·학년도·차수·학기·형식·중복 검증은 그대로다.
        // 부록 O (2026-11-21 사용자 지시 '옵션 최소화'): 기본 true. 부록 H~K 실측으로 학년도 지정 조회(JG_YEAR·JG_CHASU)의 되돌림 값을 확인했고,
        // 파일마다 공시연도 없음·공시연도≠요청·파일/원문 연도≠요청은 여전히 보류(fail-closed). false = 긴급 차단 스위치(모든 파일 보류).
        log.info("schoolinfo year-query-verified={} (부록 O: 기본 true, false = 긴급 차단)", yearQueryVerified);
        this.ttl = Duration.ofHours(Math.max(1, ttlHours));
        log.info("schoolinfo sync: yearQueryVerified={} ttlHours={}", yearQueryVerified, ttl.toHours());
    }

    /** 서버 기준 최근 3개 학년도 [Y, Y-1, Y-2] (KST 달력 연도). */
    public List<Integer> expectedYears() {
        int y = LocalDate.now(clock.withZone(KST)).getYear();
        return List.of(y, y - 1, y - 2);
    }

    /**
     * 부록 K: 학생 화면 진입 자동 확보의 작업 주체. 관리자 화면 진입과 같은 확인(force 없음)을 시스템 이름으로 돌린다 —
     * 등록 문서의 등록자 기록용이며 학생에게 관리자 권한을 주지 않는다(학생 Endpoint 는 학교·학년도를 받지 않는다).
     */
    static final AdminActor SYSTEM = new AdminActor("system_schoolinfo_auto", java.util.Set.of(), true);

    /**
     * 부록 K: 학생 학적의 학교 하나만, §38-12 관리자 화면 진입과 같은 ensure(학교당 작업 1개, 학교·학년도별 TTL 기록 재사용,
     * 같은 이름 학교는 관리자 선택 전 등록 0). 외부 조회는 작업 스레드에서만 한다.
     */
    public Ensured ensureForStudentSchool(String schoolId) {
        synchronized (latestBySchool) {
            Job last = latestBySchool.get(schoolId);
            // 실패 캐시: 학년도 기록이 FAILED 면 start() 는 매번 새로 확인한다(관리자 '다시 확인'용). 학생 화면은 같은 POST 를 반복해
            // 부르므로, 같은 학교 작업이 끝난 지 STUDENT_RETRY_AFTER 안이면 그 결과를 그대로 돌려준다(외부 요청 0, 다음 진입 때 다시 시도).
            if (last != null && last.finished && last.finishedAt != null && last.years.equals(expectedYears())
                    && last.yearState.containsValue("FAILED") && last.finishedAt.plus(STUDENT_RETRY_AFTER).isAfter(clock.instant())) {
                return new Ensured(view(last), false);
            }
        }
        return start(SYSTEM, schoolId, expectedYears(), false);
    }

    // ---------------------------------------------------------------- 부록 O: 학교 검색·학생 열람 선택이 쓰는 공개 메서드

    /** 부록 O §38-15: 학교알리미 검색으로 고른 학교의 학교 키 접두사(si_<학교알리미 학교 ID>). 학적 학교 ID 와 겹치지 않는다. */
    public static final String DIRECTORY_PREFIX = "si_";

    /**
     * 부록 O: 학교알리미 학교 하나의 원본 저장 키. 같은 학교알리미 학교를 이미 쓰는(ACTIVE 매핑) 학교 키가 있으면 그 키를 그대로 쓴다
     * (원본 공유 · 재다운로드 0 · 예: 인천 가좌고 = sch_demo_gajwa). 없으면 si_<ID> 를 그 학교의 공식 이름·주소로 매핑한다.
     * 기존 학교 키의 매핑은 바꾸지 않는다.
     */
    public String directoryKey(SchoolInfoClient.SchoolDetail detail, String actorId) {
        synchronized (latestBySchool) {
            // A28-10: 같은 학교알리미 학교를 이미 쓰는 학교 키(관리자 매핑 → 시연 명단 고정)가 있으면 그 키를 쓴다(si_ 별칭을 새로 만들지 않음)
            Optional<String> canonical = canonicalKey(detail.schoolinfoId());
            if (canonical.isPresent()) {
                return canonical.get();
            }
            List<SchoolInfoSchoolMapping> existing = mappings.findBySchoolinfoSchoolIdAndStatus(detail.schoolinfoId(), SchoolInfoSchoolMapping.ACTIVE);
            if (!existing.isEmpty()) {
                return existing.stream().map(SchoolInfoSchoolMapping::schoolId).sorted().findFirst().orElseThrow();
            }
            String key = DIRECTORY_PREFIX + detail.schoolinfoId();
            long version = mappings.findById(key).map(SchoolInfoSchoolMapping::version).orElse(0L);
            writer.saveMapping(key, version, detail, actorId, clock.instant());
            return key;
        }
    }

    /** 부록 O: 검색으로 고른 학교(또는 학생 열람 대상 학교)의 3개 학년도 확인. 관리자 화면 진입과 같은 TTL·학교당 작업 1개. */
    public Ensured ensureDirectorySchool(AdminActor actor, String schoolId) {
        access.requireOperator(actor);
        return start(actor, schoolId, expectedYears(), false);
    }

    /** 부록 O: 관리자가 이 학교의 학교알리미 학교를 골라 둔 매핑이 있는가(있으면 학생 선택은 쓰지 않는다). */
    public boolean adminMapped(String schoolId) {
        return mappings.findById(schoolId).filter(SchoolInfoSchoolMapping::active).isPresent();
    }

    /** 부록 O: 저장된 학년도 확인 기록이 '같은 이름 학교 확인 필요'인가(서버 재시작 뒤에도 남는 근거). */
    public boolean ambiguous(String schoolId) {
        return expectedYears().stream().anyMatch(y -> syncYears.findById(new SchoolInfoSyncYear.Key(schoolId, y))
                .map(r -> "SCHOOL_AMBIGUOUS".equals(r.status())).orElse(false));
    }

    /** 부록 O: 동명 후보(서버가 이번 작업에서 검증한 것만). candidateId 는 작업마다 새로 만든다. */
    public record CandidateView(String candidateId, SchoolInfoClient.SchoolDetail detail, boolean selectable, String unselectableReason) {
    }

    public record CandidateState(boolean running, String selectionReason, List<CandidateView> candidates) {
    }

    public CandidateState candidatesOf(String schoolId) {
        Job last = latestBySchool.get(schoolId);
        if (last == null) {
            return new CandidateState(false, null, List.of());
        }
        return new CandidateState(!last.finished, last.selectionReason,
                last.candidates.stream().map(c -> new CandidateView(c.id, c.detail, c.selectable, c.unselectableReason)).toList());
    }

    /**
     * 부록 O: 학생 화면이 동명 후보를 보려는데 메모리에 후보가 없으면(서버 재시작 등) 그 학교만 다시 확인한다.
     * 매핑이 없는 동명 학교는 검색·상세 조회에서 멈추므로 파일 다운로드가 없다. 같은 학교 STUDENT_RETRY_AFTER 안 반복은 하지 않는다.
     */
    public void refreshCandidates(String schoolId) {
        synchronized (latestBySchool) {
            if (adminMapped(schoolId)) {
                return;
            }
            Job last = latestBySchool.get(schoolId);
            if (last != null && (!last.finished || (last.finishedAt != null && last.finishedAt.plus(STUDENT_RETRY_AFTER).isAfter(clock.instant())))) {
                return;
            }
            start(SYSTEM, schoolId, expectedYears(), true);
        }
    }

    /** 부록 K: 학생 진입 경로의 실패 재시도 최소 간격 */
    static final Duration STUDENT_RETRY_AFTER = Duration.ofMinutes(5);

    /** 응답과 함께 HTTP 202(작업 진행 중)인지 알려 준다. */
    public record Ensured(SchoolInfoSyncResponse body, boolean running) {
    }

    /** POST §38-12. 외부 조회는 작업 스레드에서만 한다. */
    public Ensured ensureSynced(AdminActor admin, SchoolInfoSyncRequest request) {
        access.requireOperator(admin);
        List<Integer> expected = expectedYears();
        if (!expected.equals(request.requestedAcademicYears()) || !GRADES.equals(request.grades())
                || !SEMESTERS.equals(request.semesters())) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SYNC_YEARS_MISMATCH,
                    AssessmentErrorCode.SCHOOLINFO_SYNC_YEARS_MISMATCH.message(),
                    Map.of("expectedAcademicYears", expected, "grades", GRADES, "semesters", SEMESTERS));
        }
        return start(admin, request.schoolId().strip(), expected, Boolean.TRUE.equals(request.force()));
    }

    /** force = 학교 선택 직후처럼 TTL 과 무관하게 세 학년도를 모두 다시 확인한다(그 학교 하나만). */
    private Ensured start(AdminActor admin, String schoolId, List<Integer> expected, boolean force) {
        synchronized (latestBySchool) {
            Job last = latestBySchool.get(schoolId);
            if (last != null && !last.finished && last.years.equals(expected)) {
                return new Ensured(view(last), true);
            }
            Instant now = clock.instant();
            List<Integer> stale = new ArrayList<>();
            for (int year : expected) {
                Optional<SchoolInfoSyncYear> row = syncYears.findById(new SchoolInfoSyncYear.Key(schoolId, year));
                if (force || row.isEmpty() || "FAILED".equals(row.get().status()) || row.get().checkedAt().plus(ttl).isBefore(now)) {
                    stale.add(year);
                }
            }
            if (stale.isEmpty() && last != null && last.years.equals(expected)) {
                return new Ensured(view(last), false);
            }
            Job job = new Job(schoolId, expected);
            if (stale.isEmpty()) {
                job.finished = true;   // 재시작 뒤 등: 기록만으로 답한다(외부 요청 없음)
                remember(job);
                return new Ensured(view(job), false);
            }
            Optional<String> name = schoolName(schoolId, expected);
            if (name.isEmpty()) {
                stale.forEach(y -> job.yearState.put(y, "SCHOOL_IDENTITY_REQUIRED"));
                job.message = "학업 정보에서 학교 이름을 찾지 못해 학교알리미에서 확인하지 않았어요.";
                job.finished = true;
                remember(job);
                return new Ensured(view(job), false);
            }
            stale.forEach(y -> job.yearState.put(y, "QUEUED"));
            remember(job);
            worker.submit(() -> run(admin, job, name.get(), stale));
            return new Ensured(view(job), true);
        }
    }

    /** GET §38-12: 읽기만 한다(외부 요청·DB 쓰기 없음). */
    public SchoolInfoSyncResponse status(AdminActor admin, String jobId) {
        access.requireOperator(admin);
        Job job = jobs.get(jobId);
        if (job == null) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_JOB_NOT_FOUND);
        }
        return view(job);
    }

    /**
     * POST §38-13 (부록 F): 관리자가 동명 후보 하나를 고른다. 그 작업이 보여 준 선택 가능한 후보만 된다(학교알리미 ID 를 화면이 보내지 않는다).
     * 고른 뒤 그 학교 하나만 세 학년도를 다시 확인한다.
     */
    public Ensured selectSchool(AdminActor admin, SchoolInfoSelectionRequest request) {
        access.requireOperator(admin);
        String schoolId = request.schoolId().strip();
        Job job = jobs.get(request.jobId());
        if (job == null) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_JOB_NOT_FOUND);
        }
        Candidate chosen = job.schoolId.equals(schoolId) ? job.candidates.stream()
                .filter(c -> c.id.equals(request.candidateId())).findFirst().orElse(null) : null;
        List<Integer> expected = expectedYears();
        Optional<String> contextName = schoolName(schoolId, expected);
        if (chosen == null || !chosen.selectable || contextName.isEmpty() || !norm(chosen.detail.schoolName()).equals(norm(contextName.get()))) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SELECTION_INVALID);
        }
        synchronized (latestBySchool) {
            Optional<SchoolInfoSchoolMapping> current = mappings.findById(schoolId);
            boolean same = current.isPresent() && current.get().active()
                    && current.get().schoolinfoSchoolId().equals(chosen.detail.schoolinfoId());
            if (!same) {
                try {
                    writer.saveMapping(schoolId, request.expectedVersion(), chosen.detail, admin.adminId(), clock.instant());
                } catch (DataIntegrityViolationException race) {
                    throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SELECTION_CONFLICT);
                }
            }
            Job running = latestBySchool.get(schoolId);
            if (same && running != null && !running.finished) {
                return new Ensured(view(running), true);
            }
            return start(admin, schoolId, expected, true);
        }
    }

    /** 부록 F §38-14: 관리자 분류로 등록한 문서의 분석을 같은 서버 작업 줄에 넣는다(차례로 돈다). */
    public void queueAnalysis(AdminActor admin, String planId, String revisionId) {
        worker.submit(() -> {
            try {
                analysis.analyze(admin, planId, revisionId);
            } catch (RuntimeException e) {
                log.info("schoolinfo classification analysis failed revision={} cause={}", revisionId, e.getClass().getSimpleName());
            }
        });
    }

    private void remember(Job job) {
        latestBySchool.put(job.schoolId, job);
        synchronized (jobs) {
            jobs.put(job.id, job);
            while (jobs.size() > 50) {
                jobs.remove(jobs.keySet().iterator().next());
            }
        }
    }

    private Optional<String> schoolName(String schoolId, List<Integer> years) {
        // 부록 O: 학교알리미 검색으로 고른 학교(si_ 키)는 학적이 없다 — 그 학교의 공식 매핑 이름만 쓴다(학적을 만들지 않는다)
        if (schoolId.startsWith(DIRECTORY_PREFIX)) {
            return mappings.findById(schoolId).filter(SchoolInfoSchoolMapping::active).map(SchoolInfoSchoolMapping::schoolName);
        }
        for (int y : years) {
            for (int g : GRADES) {
                for (int s : SEMESTERS) {
                    Optional<String> n = contexts.findSlot(schoolId, y, g, s).map(c -> c.schoolName())
                            .filter(v -> v != null && !v.isBlank());
                    if (n.isPresent()) {
                        return n;
                    }
                }
            }
        }
        return Optional.empty();
    }

    // ---------------------------------------------------------------- 작업 (서버 작업 1개)

    private void run(AdminActor admin, Job job, String schoolName, List<Integer> stale) {
        try {
            String shl = null;
            String identity = null;
            // 부록 F: 관리자가 골라 둔 학교가 있으면 검색 대신 그 학교를 확인한다(이름·주소가 바뀌었으면 선택 무효 → 다시 고르게)
            Optional<SchoolInfoSchoolMapping> mapping = mappings.findById(job.schoolId).filter(SchoolInfoSchoolMapping::active);
            if (mapping.isPresent()) {
                SchoolInfoClient.SchoolDetail d = client.describe(mapping.get().schoolinfoSchoolId());
                if (d.error() != null) {
                    identity = "FAILED";
                    job.message = "학교알리미에 연결하지 못했어요.";
                } else if (norm(d.schoolName()).equals(norm(schoolName)) && norm(d.schoolName()).equals(norm(mapping.get().schoolName()))
                        && norm(d.address()).equals(norm(mapping.get().address()))) {
                    shl = d.schoolinfoId();
                } else {
                    writer.invalidateMapping(job.schoolId, "MAPPING_CHANGED");
                    job.selectionReason = "MAPPING_CHANGED";
                }
            }
            // A28-04: 관리자 매핑이 없고 시연 명단이 학교알리미 학교를 고정했으면 그 학교만 확인한다(이름·주소 모두 같아야 함, 다르면 보류)
            var pin = mapping.isPresent() ? Optional.<com.learnershigh.extension.assessment.integration.roster.DemoRoster.School>empty() : rosterPin(job.schoolId);
            if (shl == null && identity == null && pin.isPresent()) {
                SchoolInfoClient.SchoolDetail d = client.describe(pin.get().schoolinfoSchoolId());
                if (d.error() != null) {
                    identity = "FAILED";
                    job.message = "학교알리미에 연결하지 못했어요.";
                } else if (norm(d.schoolName()).equals(norm(schoolName)) && norm(d.address()).equals(norm(pin.get().address()))) {
                    shl = d.schoolinfoId();
                } else {
                    identity = "SCHOOL_AMBIGUOUS";
                    job.message = "시연 명단에 고정한 학교알리미 학교의 이름·주소가 달라요. 관리자 화면에서 학교를 다시 확인해 주세요.";
                }
            }
            if (shl == null && identity == null) {
                SchoolInfoClient.Search search = client.search(schoolName);
                if ("SEARCH_TRUNCATED".equals(search.error())) {
                    // 부록 H: 검색 목록을 다 읽지 못했으면 일부 후보만으로 학교를 고르지 않는다
                    identity = "SCHOOL_AMBIGUOUS";
                    job.selectionReason = "TOO_MANY_CANDIDATES";
                    job.message = "학교알리미 검색 결과를 모두 확인하지 못했어요. 평가계획서를 직접 등록해 주세요.";
                } else if (search.error() != null) {
                    identity = "FAILED";
                    job.message = "학교알리미에 연결하지 못했어요.";
                } else if (search.schoolinfoIds().isEmpty()) {
                    identity = "SCHOOL_NOT_FOUND";
                } else if (search.schoolinfoIds().size() == 1) {
                    shl = search.schoolinfoIds().getFirst();
                } else {
                    // 동명 후보: 학교 상세에서 이름·주소를 읽어 이름이 같은 학교만 후보로. 이름이 같은 학교가 하나면 그 학교, 여럿이면 관리자 선택
                    identity = "SCHOOL_AMBIGUOUS";
                    if (search.schoolinfoIds().size() > MAX_CANDIDATES) {
                        job.selectionReason = "TOO_MANY_CANDIDATES";
                        job.message = "같은 이름으로 검색되는 학교가 너무 많아요(" + search.schoolinfoIds().size() + "곳). 평가계획서를 직접 등록해 주세요.";
                    } else {
                        List<SchoolInfoClient.SchoolDetail> same = new ArrayList<>();
                        for (String id : search.schoolinfoIds()) {
                            SchoolInfoClient.SchoolDetail d = client.describe(id);
                            if (d.error() != null) {
                                identity = "FAILED";
                                job.message = "학교알리미에 연결하지 못했어요.";
                                same.clear();
                                break;
                            }
                            if (norm(d.schoolName()).equals(norm(schoolName))) {
                                same.add(d);
                            }
                        }
                        if ("FAILED".equals(identity)) {
                            // 그대로 실패
                        } else if (same.size() == 1) {
                            shl = same.getFirst().schoolinfoId();
                            identity = null;
                        } else if (same.isEmpty()) {
                            job.message = "같은 이름의 학교를 찾지 못했어요.";
                        } else {
                            job.candidates.addAll(Candidate.of(same));
                            if (job.selectionReason == null) {
                                job.selectionReason = "SAME_NAME_CANDIDATES";
                            }
                            job.message = "같은 이름의 학교가 " + same.size() + "곳이에요. 지역·주소를 보고 학교를 골라 주세요.";
                        }
                    }
                }
            }
            if (identity != null || shl == null) {
                String status = identity != null ? identity : "SCHOOL_AMBIGUOUS";
                for (int y : stale) {
                    finishYear(job, y, status, null, job.message);
                }
                return;
            }
            for (int year : stale) {
                long t0 = System.nanoTime();
                job.yearState.put(year, "FETCHING");
                try {
                    String result = syncYear(admin, job, schoolName, shl, year);
                    if ("SCHOOL_AMBIGUOUS".equals(result)) {
                        for (int y : stale) {
                            if (RUNNING_STATES.contains(job.yearState.get(y))) {
                                finishYear(job, y, "SCHOOL_AMBIGUOUS", null, job.message);
                            }
                        }
                        break;
                    }
                } catch (RuntimeException e) {
                    log.warn("schoolinfo sync year failed school={} year={} cause={}", job.schoolId, year, e.getClass().getSimpleName());
                    finishYear(job, year, "FAILED", null, "처리 중 오류가 났어요. 다시 확인하면 이 학년도만 다시 받아요.");
                } finally {
                    job.elapsed.put(year, (System.nanoTime() - t0) / 1_000_000);
                }
            }
            analyzeQueued(admin, job);
        } catch (RuntimeException e) {
            log.warn("schoolinfo sync failed school={} cause={}", job.schoolId, e.getClass().getSimpleName());
            for (int y : stale) {
                if (RUNNING_STATES.contains(job.yearState.get(y))) {
                    finishYear(job, y, "FAILED", null, "처리 중 오류가 났어요.");
                }
            }
        } finally {
            job.finishedAt = clock.instant();
            job.finished = true;
        }
    }

    /** 학년도 하나: 지정 조회 → 파일마다 기록·분류 → 확인된 것만 슬롯 연결. 학교 이름이 다르면 SCHOOL_AMBIGUOUS. */
    private String syncYear(AdminActor admin, Job job, String schoolName, String shl, int year) {
        SchoolInfoClient.YearFetch f = client.fetchYear(shl, year, schoolName);
        if ("SCHOOL_NAME_MISMATCH".equals(f.error()) || (f.schoolName() != null && !norm(f.schoolName()).equals(norm(schoolName)))) {
            job.message = "학교알리미의 학교 이름이 이 학교와 달라요.";
            return "SCHOOL_AMBIGUOUS";
        }
        if (f.error() != null) {
            String status = switch (f.error()) {
                case "PLAN_NOT_PUBLISHED" -> "NOT_PUBLISHED";
                case "YEAR_UNAVAILABLE" -> "YEAR_UNAVAILABLE";
                default -> "FAILED";
            };
            finishYear(job, year, status, f.resolvedYear(), null);
            return status;
        }
        String sourceUrl = client.base() + "/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=" + URLEncoder.encode(shl, StandardCharsets.UTF_8)
                + "&JG_YEAR=" + year;
        int planFiles = 0;
        int verified = 0;
        int mismatched = 0;
        for (SchoolInfoClient.PlanFile file : f.files()) {
            job.downloads.incrementAndGet();
            String sha = sha256(file.bytes());
            Optional<SchoolInfoSourceFile> known = sources.findBySchoolIdAndRequestedYearAndSha256(job.schoolId, year, sha);
            SchoolInfoSourceFile source;
            SchoolInfoSourceClassifier.Result c = null;
            if (known.isPresent()) {
                job.reused.incrementAndGet();
                source = known.get();
            } else {
                c = SchoolInfoSourceClassifier.classify(year, f.resolvedYear(), yearQueryVerified, file.fileName(), file.bytes(), file.disclosureMonth());
                Map<String, Object> ev = new LinkedHashMap<>(c.evidence());
                ev.put("reason", c.reason());
                ev.put("schoolinfoSchoolId", shl);
                source = recordSource(job.schoolId, year, f.resolvedYear(), shl, file, sha, c, json(ev));
            }
            Verification v = source.verification();
            if (v == Verification.UNSUPPORTED || v == Verification.NOT_PLAN) {
                continue;
            }
            planFiles++;
            if (v == Verification.YEAR_MISMATCH) {
                mismatched++;
            }
            if (v != Verification.VERIFIED) {
                continue;
            }
            verified++;
            if (c == null) {
                c = SchoolInfoSourceClassifier.classify(year, source.resolvedSourceYear(), true, file.fileName(), file.bytes(), file.disclosureMonth());
            }
            for (int g : c.grades()) {
                for (int s : c.semesters()) {
                    try {
                        SchoolInfoSyncWriter.Linked l = writer.link(admin, source, year, g, s, file.bytes(), sourceUrl, clock.instant());
                        if (l.outcome() != SchoolInfoSyncWriter.Outcome.UNCHANGED) {
                            job.analysisQueue.add(new String[] {l.planId(), l.revisionId()});
                        }
                    } catch (DataIntegrityViolationException race) {
                        log.info("schoolinfo slot already linked school={} year={} grade={} semester={}", job.schoolId, year, g, s);
                    } catch (BusinessException rejected) {
                        // 한 칸 등록 실패(형식 검사 등)는 그 칸만 — 학년도 전체를 실패로 만들지 않는다
                        log.info("schoolinfo slot register rejected school={} year={} grade={} semester={} code={}", job.schoolId, year, g, s,
                                rejected.errorCode().code());
                    }
                }
            }
        }
        f.problems().forEach(p -> job.problems.add(new SchoolInfoSyncResponse.UnresolvedFile(year, p.fileName(), null, "UNSUPPORTED", p.reason(), null, "OTHER")));
        String status;
        if (planFiles == 0) {
            status = f.problems().isEmpty() ? "NOT_PUBLISHED" : "FAILED";
        } else if (verified == planFiles) {
            status = f.problems().isEmpty() ? "COMPLETED" : "PARTIAL";
        } else if (verified > 0) {
            status = "PARTIAL";
        } else if (mismatched == planFiles) {
            status = "YEAR_MISMATCH";
        } else {
            status = "NEEDS_SOURCE_VERIFICATION";
        }
        finishYear(job, year, status, f.resolvedYear(), null);
        return status;
    }

    private SchoolInfoSourceFile recordSource(String schoolId, int year, Integer resolved, String shl, SchoolInfoClient.PlanFile file,
            String sha, SchoolInfoSourceClassifier.Result c, String evidence) {
        try {
            return writer.recordSource(schoolId, year, resolved, shl, file.attachmentSeq(), file.fileName(), sha, file.bytes(),
                    c.format() == null ? null : c.format().name(), c.verification(), evidence, clock.instant());
        } catch (DataIntegrityViolationException race) {
            return sources.findBySchoolIdAndRequestedYearAndSha256(schoolId, year, sha).orElseThrow(() -> race);
        }
    }

    private void finishYear(Job job, int year, String status, Integer resolved, String message) {
        writer.yearChecked(job.schoolId, year, status, resolved, message, clock.instant());
        job.yearState.put(year, status);
    }

    private void analyzeQueued(AdminActor admin, Job job) {
        for (String[] item : job.analysisQueue) {
            job.analyzing = item[1];
            try {
                analysis.analyze(admin, item[0], item[1]);
            } catch (BusinessException | PlanAnalyzerException e) {
                log.info("schoolinfo sync analysis failed revision={} code={}", item[1], e.getClass().getSimpleName());
            } catch (RuntimeException e) {
                log.warn("schoolinfo sync analysis failed revision={} cause={}", item[1], e.getClass().getSimpleName());
                job.analysisErrors.add(item[1]);
            } finally {
                job.analyzed.add(item[1]);
                job.analyzing = null;
            }
        }
    }

    // ---------------------------------------------------------------- 응답

    SchoolInfoSyncResponse view(Job job) {
        List<SchoolInfoSourceFile> files = sources.findBySchoolIdAndRequestedYearIn(job.schoolId, job.years);
        List<SchoolInfoSlotLink> allLinks = links.findBySchoolIdAndAcademicYearIn(job.schoolId, job.years);
        // 관리자가 삭제한 문서(논리 삭제)의 연결은 '등록'으로 세지 않는다
        Set<String> livePlans = new java.util.HashSet<>();
        if (!allLinks.isEmpty()) {
            planRows.findAllById(allLinks.stream().map(SchoolInfoSlotLink::planId).distinct().toList()).forEach(p -> livePlans.add(p.id()));
        }
        List<SchoolInfoSlotLink> slotLinks = allLinks.stream().filter(l -> livePlans.contains(l.planId())).toList();
        Map<String, PlanAnalysisRun> latestRun = new HashMap<>();
        if (!slotLinks.isEmpty()) {
            for (PlanAnalysisRun r : runs.findByRevisionIds(slotLinks.stream().map(SchoolInfoSlotLink::revisionId).distinct().toList())) {
                latestRun.merge(r.revisionId(), r, (a, b) -> a.receivedAt().isAfter(b.receivedAt()) ? a : b);
            }
        }
        Set<String> queued = new LinkedHashSet<>();
        job.analysisQueue.forEach(i -> queued.add(i[1]));
        queued.removeAll(job.analyzed);

        List<SchoolInfoSyncResponse.YearStatus> years = new ArrayList<>();
        Map<Integer, String> yearStatus = new HashMap<>();
        for (int y : job.years) {
            Optional<SchoolInfoSyncYear> row = syncYears.findById(new SchoolInfoSyncYear.Key(job.schoolId, y));
            String mem = job.yearState.get(y);
            String status = mem != null ? mem : row.map(SchoolInfoSyncYear::status).orElse("QUEUED");
            // 진행 중이면 기록을 쓰지 않는다. 끝났으면 DB 기록(방금 쓴 것 포함)이 근거다
            Optional<SchoolInfoSyncYear> rec = RUNNING_STATES.contains(status) ? Optional.empty()
                    : row.filter(r -> r.status().equals(status));
            yearStatus.put(y, status);
            years.add(new SchoolInfoSyncResponse.YearStatus(y, status,
                    rec.map(SchoolInfoSyncYear::resolvedSourceYear).orElse(null),
                    rec.map(r -> OffsetDateTime.ofInstant(r.checkedAt(), KST)).orElse(null),
                    rec.map(SchoolInfoSyncYear::message).orElse(HARD_FAIL.contains(status) ? job.message : null),
                    job.elapsed.get(y)));
        }

        Map<String, SchoolInfoSourceFile> byId = new HashMap<>();
        files.forEach(f -> byId.put(f.id(), f));
        List<SchoolInfoSyncResponse.SlotStatus> slots = new ArrayList<>();
        int verifiedSlots = 0;
        int analysisDone = 0;
        Set<String> doneRevisions = new LinkedHashSet<>();
        for (int y : job.years) {
            boolean unresolvedInYear = files.stream().anyMatch(f -> f.requestedYear() == y && f.verification() != Verification.VERIFIED
                    && f.verification() != Verification.NOT_PLAN && f.verification() != Verification.UNSUPPORTED);
            for (int g : GRADES) {
                for (int s : SEMESTERS) {
                    List<SchoolInfoSlotLink> here = slotLinks.stream()
                            .filter(l -> l.academicYear() == y && l.grade() == g && l.semester() == s).toList();
                    String ys = yearStatus.get(y);
                    boolean removed = here.isEmpty() && allLinks.stream()
                            .anyMatch(l -> l.academicYear() == y && l.grade() == g && l.semester() == s);
                    String status;
                    if (!here.isEmpty()) {
                        status = "REGISTERED";
                        verifiedSlots++;
                    } else if (removed) {
                        status = "REMOVED_BY_ADMIN";
                    } else if (RUNNING_STATES.contains(ys) || HARD_FAIL.contains(ys) || "NOT_PUBLISHED".equals(ys)
                            || "YEAR_UNAVAILABLE".equals(ys) || "YEAR_MISMATCH".equals(ys)) {
                        status = ys;
                    } else if (unresolvedInYear) {
                        status = "NEEDS_SOURCE_VERIFICATION";
                    } else {
                        status = "NO_SOURCE_FOR_SLOT";
                    }
                    String analysisStatus = "NONE";
                    for (SchoolInfoSlotLink l : here) {
                        String a;
                        if (l.revisionId().equals(job.analyzing)) {
                            a = "ANALYZING";
                        } else if (queued.contains(l.revisionId())) {
                            a = "QUEUED";
                        } else if (latestRun.containsKey(l.revisionId())) {
                            a = latestRun.get(l.revisionId()).status() == PlanAnalysisStatus.FAILED ? "FAILED" : "ANALYZED";
                            doneRevisions.add(l.revisionId());
                        } else if (job.analyzed.contains(l.revisionId())) {
                            a = "FAILED";
                        } else {
                            a = "NONE";
                        }
                        analysisStatus = worse(analysisStatus, a);
                    }
                    slots.add(new SchoolInfoSyncResponse.SlotStatus(y, g, s, status,
                            (int) here.stream().map(SchoolInfoSlotLink::sourceFileId).distinct().count(),
                            (int) here.stream().map(SchoolInfoSlotLink::planId).distinct().count(), analysisStatus));
                }
            }
        }
        analysisDone = doneRevisions.size();
        List<SchoolInfoSyncResponse.UnresolvedFile> unresolved = new ArrayList<>();
        for (SchoolInfoSourceFile f : files) {
            if (f.verification() != Verification.VERIFIED) {
                unresolved.add(new SchoolInfoSyncResponse.UnresolvedFile(f.requestedYear(), f.fileName(), f.sha256(),
                        f.verification().name(), reasonOf(f), f.id(), groupOf(f.verification())));
            }
        }
        unresolved.addAll(job.problems);
        SchoolInfoSyncResponse.Counts counts = new SchoolInfoSyncResponse.Counts(job.years.size() * GRADES.size() * SEMESTERS.size(),
                verifiedSlots, files.size(), (int) slotLinks.stream().map(SchoolInfoSlotLink::planId).distinct().count(),
                slotLinks.size(), job.downloads.get(), job.reused.get(), analysisDone);
        return new SchoolInfoSyncResponse(job.id, job.schoolId, job.years, state(job, yearStatus), years, slots, counts, unresolved,
                selectionOf(job));
    }

    /** 부록 F: SOURCE_VERIFICATION 은 관리자 분류로 등록할 수 없고, CLASSIFICATION(UNCLASSIFIED)만 §38-14 로 분류할 수 있다. */
    /** 부록 G: VERIFIED 이면서 학년 미표기 → 전 학년 자동 적용한 원본은 관리자에게 따로 보인다(AUTO_ALL_GRADES). */
    static String groupOf(Verification v, String reason) {
        if (v == Verification.VERIFIED && reason != null && (reason.equals("GRADE_UNSPECIFIED_ALL_GRADES_APPLIED") || reason.equals("GRADES_FROM_BODY_ALL"))) {
            return "AUTO_ALL_GRADES";
        }
        return groupOf(v);
    }

    static String groupOf(Verification v) {
        return switch (v) {
            case UNCLASSIFIED -> "CLASSIFICATION";
            case NEEDS_SOURCE_VERIFICATION, YEAR_MISMATCH -> "SOURCE_VERIFICATION";
            default -> "OTHER";
        };
    }

    private SchoolInfoSyncResponse.SchoolSelection selectionOf(Job job) {
        Optional<SchoolInfoSchoolMapping> any = mappings.findById(job.schoolId);
        long mappingVersion = any.map(SchoolInfoSchoolMapping::version).orElse(0L);
        Optional<SchoolInfoSchoolMapping> m = any.filter(SchoolInfoSchoolMapping::active);
        SchoolInfoSyncResponse.Selected selected = m.map(x -> new SchoolInfoSyncResponse.Selected(x.schoolName(), x.sido(), x.sigungu(),
                x.address(), OffsetDateTime.ofInstant(x.selectedAt(), KST), x.version())).orElse(null);
        if (job.selectionReason == null && job.candidates.isEmpty()) {
            return selected == null ? null : new SchoolInfoSyncResponse.SchoolSelection(false, null, List.of(), selected, mappingVersion);
        }
        List<SchoolInfoSyncResponse.Candidate> list = job.candidates.stream()
                .map(c -> new SchoolInfoSyncResponse.Candidate(c.id, c.detail.schoolName(), c.detail.sido(), c.detail.sigungu(),
                        c.detail.address(), c.selectable, c.unselectableReason))
                .toList();
        boolean required = !list.isEmpty() || job.selectionReason != null;
        return new SchoolInfoSyncResponse.SchoolSelection(required, job.selectionReason, list, selected, mappingVersion);
    }

    private static String state(Job job, Map<Integer, String> yearStatus) {
        if (!job.finished) {
            return "RUNNING";
        }
        if (yearStatus.values().stream().allMatch("COMPLETED"::equals)) {
            return "COMPLETED";
        }
        if (yearStatus.values().stream().allMatch(HARD_FAIL::contains)) {
            return "FAILED";
        }
        return "PARTIAL";
    }

    private static final List<String> ANALYSIS_ORDER = List.of("NONE", "ANALYZED", "QUEUED", "ANALYZING", "FAILED");

    private static String worse(String a, String b) {
        return ANALYSIS_ORDER.indexOf(b) > ANALYSIS_ORDER.indexOf(a) ? b : a;
    }

    private String reasonOf(SchoolInfoSourceFile f) {
        if (f.evidenceJson() == null) {
            return null;
        }
        try {
            var n = mapper.readTree(f.evidenceJson()).path("reason");
            return n.isString() ? n.asString() : null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private String json(Map<String, Object> m) {
        try {
            return mapper.writeValueAsString(m);
        } catch (RuntimeException e) {
            return null;
        }
    }

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "");
    }

    static String sha256(byte[] b) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * A28-42: 지금까지 작업 줄에 들어간 동기화·분석이 모두 끝날 때까지 기다린다(단일 스레드 FIFO 라 빈 작업 하나가 끝나면 앞선 작업도 끝났다).
     * 시험이 공유 가상 학교알리미·DB 를 초기화하기 전에 이전 시험이 남긴 작업과 섞이지 않게 쓴다. 운영 동작은 바꾸지 않는다.
     */
    public boolean awaitIdle(Duration timeout) {
        try {
            worker.submit(() -> { }).get(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
            return true;
        } catch (java.util.concurrent.TimeoutException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (java.util.concurrent.ExecutionException | java.util.concurrent.RejectedExecutionException e) {
            return true;
        }
    }

    @PreDestroy
    void stop() {
        worker.shutdownNow();
    }

    static final int MAX_CANDIDATES = 10;

    /** 동명 후보 하나. 주소가 없거나 다른 후보와 주소가 같으면 고를 수 없다(구별할 근거 없음). */
    static final class Candidate {
        final String id = "cand_" + UUID.randomUUID();
        final SchoolInfoClient.SchoolDetail detail;
        final boolean selectable;
        final String unselectableReason;

        private Candidate(SchoolInfoClient.SchoolDetail detail, String unselectableReason) {
            this.detail = detail;
            this.unselectableReason = unselectableReason;
            this.selectable = unselectableReason == null;
        }

        static List<Candidate> of(List<SchoolInfoClient.SchoolDetail> same) {
            Map<String, Integer> byAddress = new HashMap<>();
            for (SchoolInfoClient.SchoolDetail d : same) {
                if (d.address() != null) {
                    byAddress.merge(norm(d.address()), 1, Integer::sum);
                }
            }
            List<Candidate> out = new ArrayList<>();
            for (SchoolInfoClient.SchoolDetail d : same) {
                String reason = d.address() == null ? "ADDRESS_MISSING" : byAddress.get(norm(d.address())) > 1 ? "ADDRESS_DUPLICATE" : null;
                out.add(new Candidate(d, reason));
            }
            return out;
        }
    }

    /** 자동 확인 작업 하나(메모리). 끝난 결과는 DB(학년도 확인 기록·원본·연결)에 남는다. */
    static final class Job {
        final String id = "schoolinfo_sync_" + UUID.randomUUID();
        final String schoolId;
        final List<Integer> years;
        final Map<Integer, String> yearState = new ConcurrentHashMap<>();
        final Map<Integer, Long> elapsed = new ConcurrentHashMap<>();
        final AtomicInteger downloads = new AtomicInteger();
        final AtomicInteger reused = new AtomicInteger();
        final List<String[]> analysisQueue = new CopyOnWriteArrayList<>();
        final Set<String> analyzed = ConcurrentHashMap.newKeySet();
        final Set<String> analysisErrors = ConcurrentHashMap.newKeySet();
        final List<SchoolInfoSyncResponse.UnresolvedFile> problems = new CopyOnWriteArrayList<>();
        final Instant startedAt = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        volatile String analyzing;
        volatile String message;
        volatile boolean finished;
        /** 부록 K: 끝난 시각(학생 진입 실패 캐시용) */
        volatile Instant finishedAt;
        /** 부록 F: 동명 후보(이 작업에서만 쓰는 candidateId) · 선택이 필요한 이유 */
        final List<Candidate> candidates = new CopyOnWriteArrayList<>();
        volatile String selectionReason;

        Job(String schoolId, List<Integer> years) {
            this.schoolId = schoolId;
            this.years = List.copyOf(years);
        }
    }
}
