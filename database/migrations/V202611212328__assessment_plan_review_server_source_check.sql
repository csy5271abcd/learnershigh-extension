-- A28-05 (2026-11-22 사용자 지시 '원클릭 최종 승인'): 학교알리미 공식 수집 원본의 서버 원본 검증 기록을 허용한다.
-- 기존 'LOCAL_FILE_EXTERNAL_VIEWER'(관리자가 고른 로컬 원본의 브라우저 SHA + 수동 대조 확인) 규칙은 그대로 두고,
-- 'SERVER_STORED_ORIGINAL'(서버가 보관 원본 바이트를 다시 읽어 계산한 SHA = Revision SHA = 학교알리미 원본 기록 SHA)을 더한다.
-- 서버 검증은 관리자의 수동 대조가 아니므로 manual_comparison_confirmed = FALSE 로만 남는다(수동 검토로 기록하지 않는다).
-- 데이터 변경·삭제 없음: CHECK 제약 2개만 같은 이름으로 바꾼다. 기존 행은 모두 LOCAL 규칙(TRUE) 또는 NULL 이라 새 제약을 만족한다.

ALTER TABLE assessment_plan_review DROP CHECK ck_assessment_plan_review_source_check;
ALTER TABLE assessment_plan_review DROP CHECK ck_assessment_plan_review_manual_check;

ALTER TABLE assessment_plan_review
    ADD CONSTRAINT ck_assessment_plan_review_source_check
        CHECK ((source_check_method IS NULL AND source_check_sha256 IS NULL)
            OR (source_check_method IS NOT NULL
                AND source_check_method IN ('LOCAL_FILE_EXTERNAL_VIEWER', 'SERVER_STORED_ORIGINAL')
                AND source_check_sha256 IS NOT NULL
                AND REGEXP_LIKE(source_check_sha256, '^[0-9a-f]{64}$', 'c'))),
    ADD CONSTRAINT ck_assessment_plan_review_manual_check
        CHECK ((source_check_method IS NULL AND manual_comparison_confirmed IS NULL)
            OR (source_check_method IS NOT NULL AND source_check_method = 'LOCAL_FILE_EXTERNAL_VIEWER'
                AND manual_comparison_confirmed IS NOT NULL AND manual_comparison_confirmed = TRUE)
            OR (source_check_method IS NOT NULL AND source_check_method = 'SERVER_STORED_ORIGINAL'
                AND manual_comparison_confirmed IS NOT NULL AND manual_comparison_confirmed = FALSE));
