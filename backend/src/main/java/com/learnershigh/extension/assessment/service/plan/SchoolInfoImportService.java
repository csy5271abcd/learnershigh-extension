package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoImportRequest;
import com.learnershigh.extension.assessment.dto.plan.SchoolInfoImportResponse;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.analysis.PlanAnalyzerException;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import com.learnershigh.extension.common.error.BusinessException;
import jakarta.annotation.PreDestroy;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * 학교 이름으로 평가계획서 불러오기: 학교알리미 공시 파일을 받아 학년·학기 문서로 등록하고, 문서마다 서버 분석을 돌린다.
 * 등록·분석은 기존 업로드(§38)·분석(§39) 흐름을 그대로 쓴다 — 관리자는 이어서 검토·확정한다.
 */
@Service
public class SchoolInfoImportService {

    private static final Pattern GRADE = Pattern.compile("(?<!\\d)([1-3])\\s*학년(?!도)");

    private final SchoolInfoClient client;
    private final EvaluationPlanService plans;
    private final PlanAnalysisService analysis;
    private final PlanAccess access;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SchoolInfoImportService.class);
    /** 분석은 한 번에 하나씩(서버 사양) — 여러 관리자가 불러와도 차례로 돈다. */
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "schoolinfo-import");
        t.setDaemon(true);
        return t;
    });
    private final Map<String, Job> jobs = java.util.Collections.synchronizedMap(new LinkedHashMap<>());

    private final SchoolInfoSyncWriter writer;
    private final boolean yearQueryVerified;

    public SchoolInfoImportService(SchoolInfoClient client, EvaluationPlanService plans, PlanAnalysisService analysis, PlanAccess access,
            SchoolInfoSyncWriter writer, @org.springframework.beans.factory.annotation.Value("${assessment.schoolinfo.year-query-verified:false}") boolean yearQueryVerified) {
        this.client = client;
        this.plans = plans;
        this.writer = writer;
        this.yearQueryVerified = yearQueryVerified;
        this.analysis = analysis;
        this.access = access;
    }

    /**
     * 받기·등록은 요청 안에서 끝내고(학교 없음 등 오류를 바로 알린다), 분석은 서버 작업 1개가 차례로 돌린다(서버 사양 고려).
     * 응답은 작업 번호와 파일별 상태(QUEUED → ANALYZING → 분석 상태)이고, 화면은 {@link #status} 를 다시 불러 진행바를 그린다.
     */
    public SchoolInfoImportResponse importFromSchoolInfo(AdminActor admin, SchoolInfoImportRequest request) {
        access.requireOperator(admin);
        SchoolInfoClient.Search search = client.search(request.schoolName().strip());
        if ("SEARCH_TRUNCATED".equals(search.error())) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SCHOOL_AMBIGUOUS);
        }
        if (search.error() != null) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_UNAVAILABLE);
        }
        if (search.schoolinfoIds().isEmpty()) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SCHOOL_NOT_FOUND);
        }
        // 부록 D: 검색 결과가 여러 학교면 첫 학교를 고르지 않는다(다른 학교 평가계획서가 이 학교 슬롯에 등록되는 것을 막는다)
        if (search.schoolinfoIds().size() > 1) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SCHOOL_AMBIGUOUS);
        }
        // 부록 E: 요청 학년도를 지정해 조회하고(§38-12 분류), 확인된 파일만 그 학년도 슬롯에 등록한다
        String shl = search.schoolinfoIds().getFirst();
        int year = request.academicYear();
        SchoolInfoClient.YearFetch fetched = client.fetchYear(shl, year);
        if (fetched.error() != null) {
            throw new BusinessException(switch (fetched.error()) {
                case "PLAN_NOT_PUBLISHED", "YEAR_UNAVAILABLE" -> AssessmentErrorCode.SCHOOLINFO_PLAN_NOT_PUBLISHED;
                default -> AssessmentErrorCode.SCHOOLINFO_UNAVAILABLE;
            });
        }
        String sourceUrl = client.base() + "/ei/ss/Pneiss_b01_s0.do?SHL_IDF_CD=" + java.net.URLEncoder.encode(shl, java.nio.charset.StandardCharsets.UTF_8)
                + "&JG_YEAR=" + year;
        Job job = new Job(admin.adminId(), fetched.schoolName() != null ? fetched.schoolName() : request.schoolName().strip());
        for (SchoolInfoClient.PlanFile f : fetched.files()) {
            String name = f.fileName();
            SchoolInfoSourceClassifier.Result c = SchoolInfoSourceClassifier.classify(year, fetched.resolvedYear(), yearQueryVerified, name, f.bytes(), f.disclosureMonth());
            if (c.verification() == SchoolInfoSourceFile.Verification.UNSUPPORTED) {
                job.add(skip(name, "PDF·HWP·HWPX 가 아님"));
                continue;
            }
            if (c.verification() == SchoolInfoSourceFile.Verification.NOT_PLAN) {
                job.add(skip(name, "평가계획 파일이 아님"));
                continue;
            }
            String sha = SchoolInfoSyncService.sha256(f.bytes());
            SchoolInfoSourceFile source;
            try {
                source = writer.recordSource(request.schoolId(), year, fetched.resolvedYear(), shl, f.attachmentSeq(), name, sha, f.bytes(),
                        c.format().name(), c.verification(), null, java.time.Instant.now());
            } catch (org.springframework.dao.DataIntegrityViolationException race) {
                job.add(skip(name, "같은 원본을 처리 중"));
                continue;
            }
            if (source.verification() != SchoolInfoSourceFile.Verification.VERIFIED) {
                job.add(skip(name, "출처 확인 필요 (" + (c.reason() == null ? source.verification().name() : c.reason()) + ")"));
                continue;
            }
            // 여러 학년·두 학기가 확인된 문서는 그 슬롯마다 등록한다(원본 SHA·출처는 하나)
            for (Integer grade : c.grades()) {
                if (!c.semesters().contains(request.semester())) {
                    continue;
                }
                try {
                    SchoolInfoSyncWriter.Linked l = writer.link(admin, source, year, grade, request.semester(), f.bytes(), sourceUrl, java.time.Instant.now());
                    job.add(new SchoolInfoImportResponse.File(name, grade, l.planId(), l.revisionId(),
                            l.outcome() == SchoolInfoSyncWriter.Outcome.UNCHANGED ? "UNCHANGED" : QUEUED, null, false, null));
                } catch (BusinessException | org.springframework.dao.DataIntegrityViolationException e) {
                    job.add(new SchoolInfoImportResponse.File(name, grade, null, null, null, null, false,
                            e instanceof BusinessException be ? be.getMessage() : "이미 등록됨"));
                }
            }
            if (!c.semesters().contains(request.semester())) {
                job.add(skip(name, c.semesters().stream().map(String::valueOf).collect(java.util.stream.Collectors.joining("·")) + "학기 자료"));
            }
        }
        synchronized (jobs) {
            jobs.put(job.id, job);
            while (jobs.size() > 50) {
                jobs.remove(jobs.keySet().iterator().next());   // 오래된 작업부터 잊는다(메모리 상한)
            }
        }
        worker.submit(() -> run(admin, job));
        return job.view();
    }

    /** 불러오기 작업 상태. 작업을 시작한 관리자만 본다. 서버를 다시 켜면 잊는다(분석 결과는 각 문서에 남는다). */
    public SchoolInfoImportResponse status(AdminActor admin, String jobId) {
        access.requireOperator(admin);
        Job job = jobs.get(jobId);
        if (job == null || !job.adminId.equals(admin.adminId())) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_JOB_NOT_FOUND);
        }
        return job.view();
    }

    private void run(AdminActor admin, Job job) {
        for (int i = 0; i < job.files.size(); i++) {
            SchoolInfoImportResponse.File f = job.files.get(i);
            if (!QUEUED.equals(f.analysisStatus())) {
                continue;
            }
            job.files.set(i, with(f, ANALYZING, null, null));
            try {
                PlanAnalysisResponse a = analysis.analyze(admin, f.planId(), f.documentRevisionId()).analysis();
                job.files.set(i, with(f, a.analysisStatus(), a.subjects() instanceof List<?> l ? l.size() : null, null));
            } catch (BusinessException | PlanAnalyzerException e) {
                job.files.set(i, with(f, "FAILED", null, e instanceof BusinessException be ? be.getMessage() : "분석 실패"));
            } catch (RuntimeException e) {
                log.warn("schoolinfo import analysis failed plan={} cause={}", f.planId(), e.getClass().getSimpleName());
                job.files.set(i, with(f, "FAILED", null, "분석 실패"));
            }
        }
        job.finished = true;
    }

    private static SchoolInfoImportResponse.File with(SchoolInfoImportResponse.File f, String status, Integer subjects, String message) {
        return new SchoolInfoImportResponse.File(f.fileName(), f.grade(), f.planId(), f.documentRevisionId(), status, subjects, false, message);
    }

    @PreDestroy
    void stop() {
        worker.shutdownNow();
    }

    static final String QUEUED = "QUEUED";
    static final String ANALYZING = "ANALYZING";

    /** 불러오기 작업 하나(메모리). */
    static final class Job {
        final String id = "schoolinfo_job_" + UUID.randomUUID();
        final String adminId;
        final String schoolName;
        final List<SchoolInfoImportResponse.File> files = new CopyOnWriteArrayList<>();
        volatile boolean finished;

        Job(String adminId, String schoolName) {
            this.adminId = adminId;
            this.schoolName = schoolName;
        }

        void add(SchoolInfoImportResponse.File f) {
            files.add(f);
        }

        SchoolInfoImportResponse view() {
            List<SchoolInfoImportResponse.File> snap = List.copyOf(files);
            int total = (int) snap.stream().filter(f -> f.planId() != null).count();
            int done = (int) snap.stream().filter(f -> f.planId() != null && !QUEUED.equals(f.analysisStatus())
                    && !ANALYZING.equals(f.analysisStatus())).count();
            boolean running = !finished && done < total;
            return new SchoolInfoImportResponse(id, running ? "RUNNING" : "DONE", schoolName, done, total, snap);
        }
    }

    private static final Pattern GRADE_LIST = Pattern.compile("(?<!\\d)([1-3](?:[,·ㆍ~∼-]|및)+[1-3](?:(?:[,·ㆍ~∼-]|및)+[1-3])*)학년(?!도)");

    /** 파일 이름(공백 제거)이 가리키는 학년들. '1,2,3학년'·'1~3학년'·'전학년'·'1학년…3학년'을 모두 펼친다. 없으면 빈 목록. */
    static List<Integer> gradesOf(String compact) {
        java.util.TreeSet<Integer> out = new java.util.TreeSet<>();
        if (compact.contains("전학년")) {
            return List.of(1, 2, 3);
        }
        Matcher lm = GRADE_LIST.matcher(compact);
        while (lm.find()) {
            String g = lm.group(1);
            Matcher r = Pattern.compile("([1-3])[~∼-]([1-3])").matcher(g);
            while (r.find()) {
                for (int v = Integer.parseInt(r.group(1)); v <= Integer.parseInt(r.group(2)); v++) {
                    out.add(v);
                }
            }
            for (char ch : g.toCharArray()) {
                if (ch >= '1' && ch <= '3') {
                    out.add(ch - '0');
                }
            }
        }
        Matcher m = GRADE.matcher(compact);
        while (m.find()) {
            out.add(Integer.parseInt(m.group(1)));
        }
        return List.copyOf(out);
    }

    private static SchoolInfoImportResponse.File skip(String name, String why) {
        return new SchoolInfoImportResponse.File(name, null, null, null, null, null, true, why);
    }
}
