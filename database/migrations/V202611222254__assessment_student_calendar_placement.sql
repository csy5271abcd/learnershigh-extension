-- A28-33 (2026-11-23, api-contract §30-b DRAFT): 학생 홈 달력의 개인 임시 배치.
-- 원문 날짜가 없는 운영계획(n월 m주 · n월)을 학생 본인 화면에서만 옮겨 둔 표시 날짜다. 공식 날짜·D-day·관리자 화면에 쓰지 않는다.
-- 추가형(새 표)만 한다. 학생 한 명·학년도·학기·운영계획 행 키(source_key)마다 한 행.
CREATE TABLE assessment_student_calendar_placement (
    id            VARCHAR(64)  NOT NULL,
    student_id    VARCHAR(64)  NOT NULL,
    academic_year INT          NOT NULL,
    semester      INT          NOT NULL,
    source_key    VARCHAR(200) NOT NULL,
    display_date  DATE         NOT NULL,
    range_from    DATE         NOT NULL,
    range_to      DATE         NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_assessment_student_calendar_placement UNIQUE (student_id, academic_year, semester, source_key),
    CONSTRAINT ck_assessment_student_calendar_placement_range CHECK (range_from <= display_date AND display_date <= range_to),
    CONSTRAINT ck_assessment_student_calendar_placement_semester CHECK (semester IN (1, 2))
);
