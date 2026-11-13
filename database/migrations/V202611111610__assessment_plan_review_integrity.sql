-- Phase B 보완 (2026-11-11): 확정값 중복 방지, 원문 수동 대조 확인, 검토자 인증 방식 기록.
-- 적용 전 확인: 기존 Schema(lh_demo_manual_20261111·lh_demo_pdf·lh_demo_mf2)에 같은 review·과목·fieldPath 중복 0건.
-- 중복이 있으면 이 Migration은 UNIQUE 추가에서 실패한다(자동 삭제·병합하지 않는다).

-- 1) 한 검토 안에서 같은 과목의 같은 fieldPath는 하나만 확정한다(정규 색인 검사는 Service).
ALTER TABLE assessment_plan_confirmed_value
    ADD CONSTRAINT uk_assessment_plan_confirmed_field UNIQUE (review_id, subject_id, field_path);

-- 2) 관리자가 원문을 직접 대조했다고 명시적으로 확인했는지(SHA 일치와 별개). 원문 확인 기록이 있을 때만 1.
-- 3) 검토자 인증 방식: MOCK_HEADER = 개발용 Mock 관리자(운영 검토 실적 아님), VERIFIED = 실제 인증(미연결).
ALTER TABLE assessment_plan_review
    ADD COLUMN manual_comparison_confirmed BOOLEAN     NULL,
    ADD COLUMN reviewer_auth               VARCHAR(20) NULL;

-- 지금까지의 검토는 모두 Mock Header 관리자였다(실제 인증 연동 없음).
UPDATE assessment_plan_review SET reviewer_auth = 'MOCK_HEADER';

ALTER TABLE assessment_plan_review
    MODIFY COLUMN reviewer_auth VARCHAR(20) NOT NULL,
    ADD CONSTRAINT ck_assessment_plan_review_reviewer_auth CHECK (reviewer_auth IN ('MOCK_HEADER', 'VERIFIED')),
    ADD CONSTRAINT ck_assessment_plan_review_manual_check
        CHECK ((source_check_method IS NULL AND manual_comparison_confirmed IS NULL)
            OR (source_check_method IS NOT NULL AND manual_comparison_confirmed IS NOT NULL
                AND manual_comparison_confirmed = TRUE));
