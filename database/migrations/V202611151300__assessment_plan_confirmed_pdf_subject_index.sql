-- A10 (2026-11-16, 사용자 작업 지시 PART 2): 다과목 PDF 평가계획서의 확정값 ↔ 분석 과목 연결을 확정 시점에 영속화한다.
-- 변경은 CHECK 제약 하나의 교체뿐이다. 데이터 삭제·변경·보정 없음(기존 PDF 확정값은 analysis_subject_index NULL 그대로 유효).
-- 이전 규칙: PDF 행은 analysis_subject_index IS NULL 이어야 했다(V202611111600 4).
-- 새 규칙: PDF 행은 analysis_subject_index를 비워 두거나(연결 정보 없음) 0~39 범위 값(별도 제약 ck_..._subject_index)을 가질 수 있다.
-- HWP·HWPX 분기는 이전과 완전히 같다.

ALTER TABLE assessment_plan_confirmed_value
    DROP CHECK ck_assessment_plan_confirmed_evidence_shape;

ALTER TABLE assessment_plan_confirmed_value
    ADD CONSTRAINT ck_assessment_plan_confirmed_evidence_shape
        CHECK ((evidence_format = 'PDF' AND evidence_locator_json IS NULL)
            OR (evidence_format IN ('HWP', 'HWPX')
                AND pdf_page_number IS NULL
                AND evidence_locator_json IS NOT NULL
                AND analysis_subject_index IS NOT NULL));
