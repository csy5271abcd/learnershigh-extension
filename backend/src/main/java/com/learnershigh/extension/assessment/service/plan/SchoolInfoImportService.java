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
import java.util.ArrayList;
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

    public SchoolInfoImportService(SchoolInfoClient client, EvaluationPlanService plans, PlanAnalysisService analysis, PlanAccess access) {
        this.client = client;
        this.plans = plans;
        this.analysis = analysis;
        this.access = access;
    }

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
        List<SchoolInfoImportResponse.File> out = new ArrayList<>();
        for (SchoolInfoClient.PlanFile f : fetched.files()) {
            String name = f.fileName();
            String compact = name.replace(" ", "");
            if (LocalPlanAnalyzer.formatOf(f.bytes()) == null) {
                out.add(skip(name, "PDF·HWP·HWPX 가 아님"));
                continue;
            }
            if (NOT_PLAN.matcher(compact).find()) {
                out.add(skip(name, "평가계획 파일이 아님"));
                continue;
            }
            Matcher sm = SEMESTER.matcher(compact);
            if (sm.find() && Integer.parseInt(sm.group(1)) != request.semester() && !compact.contains(request.semester() + "학기")) {
                out.add(skip(name, sm.group(1) + "학기 자료"));
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
                    PlanAnalysisResponse a = analysis.analyze(admin, up.planId(), up.documentRevisionId()).analysis();
                    Integer n = a.subjects() instanceof List<?> l ? l.size() : null;
                    out.add(new SchoolInfoImportResponse.File(name, grade, up.planId(), up.documentRevisionId(), a.analysisStatus(), n, false, null));
                } catch (BusinessException | PlanAnalyzerException e) {
                    out.add(new SchoolInfoImportResponse.File(name, grade, null, null, null, null, false,
                            e instanceof BusinessException be ? be.getMessage() : "분석 실패"));
                }
            }
        }
        return new SchoolInfoImportResponse(fetched.schoolName(), out);
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
