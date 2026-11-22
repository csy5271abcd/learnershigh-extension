-- A27-UX 부록 O (2026-11-21, 사용자 승인: 부록 N-7 학생별 동명 학교 열람 선택 API·DB): 학생 개인 '공식 원본 열람 대상' 선택.
-- 추가(additive)만 한다. 기존 표·열·Migration 은 바꾸지 않는다. 학적·관리자 공통 매핑(assessment_schoolinfo_school_mapping)과 별개다.

-- 학생 한 명당 하나. 학적 학교(roster_school_id)에 같은 이름 학교가 여럿이고 관리자 매핑이 없을 때만 의미가 있다.
-- view_school_id = 원본이 저장된 학교 키(같은 학교알리미 학교를 이미 쓰는 학교 ID, 없으면 si_<학교알리미 ID>).
CREATE TABLE assessment_student_official_view (
    student_id           VARCHAR(64)  NOT NULL,
    roster_school_id     VARCHAR(64)  NOT NULL,
    schoolinfo_school_id VARCHAR(64)  NOT NULL,
    view_school_id       VARCHAR(64)  NOT NULL,
    school_name          VARCHAR(100) NOT NULL,
    sido                 VARCHAR(40)  NULL,
    sigungu              VARCHAR(40)  NULL,
    address              VARCHAR(300) NOT NULL,
    version              BIGINT       NOT NULL,
    selected_at          DATETIME(6)  NOT NULL,
    PRIMARY KEY (student_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 선택·변경·철회 감사 기록(지우지 않는다)
CREATE TABLE assessment_student_official_view_event (
    id                   VARCHAR(64)  NOT NULL,
    student_id           VARCHAR(64)  NOT NULL,
    action               VARCHAR(20)  NOT NULL,
    roster_school_id     VARCHAR(64)  NOT NULL,
    schoolinfo_school_id VARCHAR(64)  NULL,
    occurred_at          DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    KEY ix_assessment_student_official_view_event_student (student_id, occurred_at),
    CONSTRAINT ck_assessment_student_official_view_event_action CHECK (action IN ('SELECT', 'CHANGE', 'CLEAR'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
