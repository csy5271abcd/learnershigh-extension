package com.learnershigh.extension.assessment.integration.officialplan;

/**
 * A27-UX 학교 공식 공개 평가계획서 원본 공급 경계 (학교알리미 등 외부 공개 출처).
 *
 * <p>관리자가 직접 등록한 평가계획서(EvaluationPlan)와 다른 데이터다. 관리자 업로드는 공식 공개 여부가 검증되지 않았으므로
 * 이 경계로 내보내지 않는다. 학생은 이 경계가 돌려주는 '출처가 검증된 공개 원본'만 관리자 분석 승인 없이 열람한다.
 * 관리자 AI 분석·검토·확정 결과의 학생 공개 규칙(§10-1, 확정분만)은 이 경계와 무관하다.
 *
 * <p>자동 수집기(향후 구현, Student Care 담당과 협의)가 붙으면 구현체만 바꾼다. 수집기가 없으면 {@link OfficialPlanLookup#connected()}가
 * false이고 문서 목록은 비어 있다 — 수집하지 않은 자료를 수집한 것처럼 보이지 않게 한다.
 */
public interface OfficialPlanSourceProvider {

    /** 학교·학년도·학년·학기 슬롯의 공식 공개 원본. 검증되지 않은 문서는 돌려주지 않는다. */
    OfficialPlanLookup find(String schoolId, int academicYear, int grade, int semester);

    /** 공급자(수집기)가 연결돼 있는지 */
    boolean connected();
}
