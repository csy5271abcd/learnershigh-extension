package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanAnalysisResponse;
import com.learnershigh.extension.assessment.dto.plan.PlanUploadResponse;
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
    private static final Pattern SEMESTER = Pattern.compile("([12])\\s*학기");
    private static final Pattern NOT_PLAN = Pattern.compile("성적관리|규정|부록|범교과|안전교육");

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

    public SchoolInfoImportService(SchoolInfoClient client, EvaluationPlanService plans, PlanAnalysisService analysis, PlanAccess access) {
        this.client = client;
        this.plans = plans;
        this.analysis = analysis;
        this.access = access;
    }

    /**
     * 받기·등록은 요청 안에서 끝내고(학교 없음 등 오류를 바로 알린다), 분석은 서버 작업 1개가 차례로 돌린다(서버 사양 고려).
     * 응답은 작업 번호와 파일별 상태(QUEUED → ANALYZING → 분석 상태)이고, 화면은 {@link #status} 를 다시 불러 진행바를 그린다.
     */
    public SchoolInfoImportResponse importFromSchoolInfo(AdminActor admin, SchoolInfoImportRequest request) {
        access.requireOperator(admin);
        SchoolInfoClient.Fetched fetched = client.fetch(request.schoolName().strip());
        if (fetched.error() != null) {
            throw new BusinessException(switch (fetched.error()) {
                case "SCHOOL_NOT_FOUND" -> AssessmentErrorCode.SCHOOLINFO_SCHOOL_NOT_FOUND;
                case "PLAN_NOT_PUBLISHED" -> AssessmentErrorCode.SCHOOLINFO_PLAN_NOT_PUBLISHED;
                default -> AssessmentErrorCode.SCHOOLINFO_UNAVAILABLE;
            });
        }
        Job job = new Job(admin.adminId(), fetched.schoolName());
        for (SchoolInfoClient.PlanFile f : fetched.files()) {
            String name = f.fileName();
            String compact = name.replace(" ", "");
            if (LocalPlanAnalyzer.formatOf(f.bytes()) == null) {
                job.add(skip(name, "PDF·HWP·HWPX 가 아님"));
                continue;
            }
            if (NOT_PLAN.matcher(compact).find()) {
                job.add(skip(name, "평가계획 파일이 아님"));
                continue;
            }
            Matcher sm = SEMESTER.matcher(compact);
            if (sm.find() && Integer.parseInt(sm.group(1)) != request.semester() && !compact.contains(request.semester() + "학기")) {
                job.add(skip(name, sm.group(1) + "학기 자료"));
                continue;
            }
            List<Integer> grades = gradesOf(compact);
            if (grades.isEmpty()) {
                grades = List.of(request.defaultGrade() != null ? request.defaultGrade() : 1);
            }
            // 여러 학년 공통 문서(예: '1,2,3학년')는 학년마다 등록한다 — 학생은 자기 학년 문서만 본다
            for (Integer grade : grades) {
                try {
                    PlanUploadResponse up = plans.register(admin, request.schoolId(), request.academicYear(), grade, request.semester(),
                            new EvaluationPlanService.UploadedPdf(name, null, f.bytes(), SchoolInfoClient.BASE_URL));
                    job.add(new SchoolInfoImportResponse.File(name, grade, up.planId(), up.documentRevisionId(), QUEUED, null, false, null));
                } catch (BusinessException e) {
                    job.add(new SchoolInfoImportResponse.File(name, grade, null, null, null, null, false, e.getMessage()));
                }
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
