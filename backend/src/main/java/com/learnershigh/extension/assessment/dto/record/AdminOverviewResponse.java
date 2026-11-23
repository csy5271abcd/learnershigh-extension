package com.learnershigh.extension.assessment.dto.record;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * §33 Admin Assessment 현황 (A12 구현). 모든 수치는 요청 시점 DB에서 계산한 값이다(저장 Counter 없음).
 *
 * <ul>
 *   <li>kpi: 관리자 담당 범위 학생 기준. enrichmentTasks는 자율 심화탐구 개인 Task를 만들지 않기로 해(A12) 항상 0이다(계약 호환).</li>
 *   <li>evaluationPlans: 평가계획서 운영 범위(OD-A08 — 모든 학교) 기준, 문서마다 최신 Revision의 상태로 센다.</li>
 *   <li>contentCounts.mockExamMaterials: 학생 정적 콘텐츠라 서버 집계가 아니다 → null. scraps는 관리자 참고자료(삭제 안 된 것).</li>
 * </ul>
 */
public record AdminOverviewResponse(Kpi kpi, EvaluationPlans evaluationPlans, OffsetDateTime oldestPendingRequestedAt,
        ContentCounts contentCounts, List<Activity> recentActivity, OffsetDateTime asOf) {

    public record Kpi(int registeredStudents, int schoolAssessments, int enrichmentTasks, int feedbackPending,
            int feedbackDelivered) {
    }

    /**
     * schools·documents: 등록 학교 수·평가계획서 문서 수. analysis: 최신 Revision의 최신 분석 상태별 문서 수(분석 전 포함).
     * reviewPending: 분석이 끝났지만 아직 평가 정보를 확정하지 않은 문서. evaluationConfirmed·teachingPlanConfirmed: 확정 문서 수.
     * reReviewInProgress: 확정 뒤 재검토(초안 다시 열기)가 진행 중인 문서.
     */
    public record EvaluationPlans(int schools, int documents, int revisions, Analysis analysis, int reviewPending,
            int evaluationConfirmed, int teachingPlanConfirmed, int reReviewInProgress) {
    }

    public record Analysis(int notRequested, int reviewRequired, int partial, int completed, int failed) {
    }

    public record ContentCounts(Integer mockExamMaterials, int scraps) {
    }

    /**
     * A13 §33-1 관리자 담당 학교: 담당 학생(지점 범위)의 그 학기 학업 Context에서 학교를 중복 없이 모은다(학교 ID 기준).
     * 전체 학교 Master가 아니다(coverage = ASSIGNED_STUDENTS). 학업 Context가 없는 담당 학생 수는 studentsWithoutSchool.
     */
    public record ManagedSchools(int academicYear, int semester, String coverage, List<ManagedSchool> items,
            int studentsWithoutSchool) {
    }

    public record ManagedSchool(String schoolId, String name, int studentCount) {
    }

    /** type: PLAN_UPLOADED · PLAN_ANALYZED · PLAN_CONFIRMED · TEACHING_PLAN_CONFIRMED · FEEDBACK_REQUESTED · FEEDBACK_DELIVERED */
    public record Activity(String type, String planId, String revisionId, String title, String detail, String actor,
            OffsetDateTime at) {
    }
}
