package com.learnershigh.extension.assessment.dto.plan;

import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanLookup;
import java.util.List;

/**
 * §10-1-3 (DRAFT, A27-UX) 학생 학교의 공식 공개 평가계획서 원본.
 * contextFound: 그 학년도·학기에 학생 본인의 학적 기록이 있는가(A28-01 이후에도 의미 그대로 — 원본 유무와 별개).
 * basis (A28-01): 원본 칸을 정한 근거.
 *   ACADEMIC_RECORD = 그 학년도 학생 학적(학교·학년) 칸.
 *   SCHOOL_PUBLIC   = 학생 학적이 아니라 현재 학교(그 해 학적이 있으면 그 학교)의 공개 원본 칸 — 재학·수강 기록으로 표현하지 않는다.
 *   null            = 칸을 정할 학교가 없다(최근 3개 학년도 학적 없음 · 범위 밖 학년도). documents 비어 있음.
 * sourceConnected=false: 공식 원본 공급자(학교알리미 수집기)가 아직 연결되지 않았다(documents 비어 있음).
 */
public record StudentOfficialPlanResponse(int academicYear, int semester, boolean contextFound, String schoolId,
        String schoolName, Integer grade, boolean sourceConnected, List<OfficialPlanLookup.Document> documents,
        StudentOfficialViewResponse.Selection officialView, String basis) {

    public static final String BASIS_ACADEMIC_RECORD = "ACADEMIC_RECORD";
    public static final String BASIS_SCHOOL_PUBLIC = "SCHOOL_PUBLIC";

    /** 부록 O 모양(A28-01 basis 없음) — basis 는 학적 칸 여부로 정한다 */
    public StudentOfficialPlanResponse(int academicYear, int semester, boolean contextFound, String schoolId, String schoolName,
            Integer grade, boolean sourceConnected, List<OfficialPlanLookup.Document> documents, StudentOfficialViewResponse.Selection officialView) {
        this(academicYear, semester, contextFound, schoolId, schoolName, grade, sourceConnected, documents, officialView,
                contextFound ? BASIS_ACADEMIC_RECORD : null);
    }

    /** 부록 O 이전 모양(학생 열람 선택 없음) */
    public StudentOfficialPlanResponse(int academicYear, int semester, boolean contextFound, String schoolId, String schoolName,
            Integer grade, boolean sourceConnected, List<OfficialPlanLookup.Document> documents) {
        this(academicYear, semester, contextFound, schoolId, schoolName, grade, sourceConnected, documents, null);
    }
}
