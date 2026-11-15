package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * GET/PUT .../review-draft 응답 (A5 DRAFT 계약).
 * latestAnalysisId: 이 Revision의 가장 최근 분석 결과. draft는 그 결과의 공유 초안(없으면 null).
 * previousDrafts: 예전 분석 결과에 묶인 초안(재분석 전 작업). 보존만 하고 새 결과에 적용하지 않는다 → 화면은 재검토 필요로 안내.
 * history: 이 초안의 최근 저장 기록(관리자별 작업 기록).
 */
public record PlanReviewDraftResponse(String planId, String revisionId, String latestAnalysisId, String reviewStatus,
        Draft draft, List<HistoryEntry> history, List<PreviousDraft> previousDrafts) {

    public record Draft(String draftId, String analysisId, String status, String closedReason, long version,
            List<StoredDecision> decisions, List<PlanReviewDraftRequest.SubjectLink> subjectLinks, int decisionCount,
            String analyzerVersion, String createdBy, OffsetDateTime createdAt, String updatedBy,
            OffsetDateTime updatedAt, List<ManualRow> manualRows) {
    }

    /**
     * A14 §39-11 운영계획 초안의 관리자 직접 추가 행. origin은 항상 MANUAL(분석 후보가 아니다).
     * rowKey는 서버 발급(manual_…) — 분석 후보 rowKey와 겹치지 않고 재검토·재확정에서도 같은 행을 가리킨다.
     * status: INCLUDED(확정하면 공개) · EXCLUDED(제외, 학생 비공개). pdfPageNumber = 관리자가 확인한 쪽(분석 근거 아님).
     */
    public record ManualRow(String rowKey, String origin, int subjectIndex, String status, String unit, String content,
            String note, String specialSchedule, List<AnalysisImportRequest.Standard> achievementStandards,
            List<String> teachingMethods, List<String> assessmentMethods, AnalysisImportRequest.Schedule schedule,
            Integer pdfPageNumber, String createdBy, OffsetDateTime createdAt, String updatedBy,
            OffsetDateTime updatedAt) {
    }

    /** candidate: 저장 당시 서버가 분석 결과에서 읽은 후보값(JSON 값 그대로, 없으면 null). 화면이 보낸 값이 아니다. */
    public record StoredDecision(int subjectIndex, String fieldPath, String decision, String value, Integer pdfPageNumber,
            Object candidate) {
    }

    public record HistoryEntry(long version, String savedBy, OffsetDateTime savedAt, int changedCount,
            List<String> changedFields) {
    }

    public record PreviousDraft(String draftId, String analysisId, String status, long version, int decisionCount,
            String updatedBy, OffsetDateTime updatedAt) {
    }
}
