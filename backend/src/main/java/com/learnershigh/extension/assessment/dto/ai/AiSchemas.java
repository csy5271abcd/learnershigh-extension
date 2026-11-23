package com.learnershigh.extension.assessment.dto.ai;

import java.util.List;

/**
 * AI가 돌려줘야 하는 구조화 결과 Schema (api-contract.md §47-A PROPOSED, P-31).
 * Provider의 Structured Output Schema로 그대로 쓰므로 null 대신 found=false / 빈 문자열 / 0쪽으로 "없음"을 표현한다.
 * 서버는 이 값을 검증되지 않은 외부 데이터로 보고 쪽 범위·근거 문장을 원본 텍스트와 다시 대조한다 (AiEvidenceVerifier).
 */
public final class AiSchemas {

    private AiSchemas() {
    }

    /**
     * 원문에서 찾은 값 하나. pdfPage는 PDF 물리 쪽(1부터), printedPage는 문서에 인쇄된 쪽 번호(없으면 빈 문자열).
     * 원문에 없으면 found=false, value="", pdfPage=0.
     */
    public record AiField(boolean found, String value, int pdfPage, String printedPage, String evidenceQuote) {
    }

    // ── A. 학교 평가계획서 ──────────────────────────────

    public record EvaluationPlanResult(
            AiField schoolName,
            AiField academicYear,
            AiField grade,
            AiField semester,
            List<SubjectPlan> subjects,
            List<String> unreadableNotes) {
    }

    public record SubjectPlan(
            AiField subjectName,
            AiField writtenExamTotalRatio,
            AiField performanceTotalRatio,
            List<WrittenExam> writtenExams,
            List<PerformanceArea> performanceAreas,
            List<AchievementStandard> achievementStandards,
            List<AiField> units,
            List<AiField> teachingMethods,
            List<AiField> achievementLevels) {
    }

    public record WrittenExam(AiField name, AiField timing, AiField ratio, AiField maxScore) {
    }

    public record PerformanceArea(
            AiField area,
            AiField evaluationType,
            AiField timing,
            AiField ratio,
            AiField maxScore,
            List<AiField> scoringCriteria) {
    }

    public record AchievementStandard(AiField code, AiField statement) {
    }

    // ── B. 대학별 자료 문항 ─────────────────────────────

    public record UniversityExamResult(List<ExamQuestion> questions, List<String> limitations) {
    }

    public record ExamQuestion(
            String questionNumber,
            String title,
            int startPage,
            int endPage,
            boolean boundaryConfident,
            List<Integer> intentPages,
            List<Integer> basisPages,
            String evidenceQuote,
            List<String> relatedConcepts,
            List<String> thinkingSkills,
            String problemAnalysis,
            List<InquiryTopic> inquiryTopics,
            List<String> referenceCandidates) {
    }

    public record InquiryTopic(String title, String reason, List<String> methods, List<String> extensionQuestions) {
    }

    // ── C. 모의고사 지문 ────────────────────────────────

    public record MockExamResult(
            boolean sufficient,
            String insufficientReason,
            String summary,
            List<String> keyConcepts,
            List<String> coreClaims,
            List<String> academicFields,
            List<InquiryMaterial> materials,
            List<MockExamTopic> topics) {
    }

    public record InquiryMaterial(String material, String curriculumLink, String realWorldExtension) {
    }

    public record MockExamTopic(
            String title,
            String reason,
            String goal,
            List<String> questions,
            List<String> methods,
            String expectedOutput,
            List<String> relatedSubjects,
            String extensionDirection) {
    }
}
