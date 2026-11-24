-- A27-UX 부록 O (2026-11-21): 학교알리미 ZIP 첨부 안 파일의 첨부 번호("c1:3/<압축 안 파일 이름>")가 40자를 넘어
-- 저장 단계에서 Data too long(1406)으로 그 학년도 전체가 FAILED 되던 결함(실측: 김천고 2024~2026, 현일고 2026).
-- 열 길이만 넓힌다(비파괴: 기존 값·NULL 허용·인덱스 없음 그대로). 다른 표·열은 바꾸지 않는다.
ALTER TABLE assessment_schoolinfo_source_file MODIFY attachment_seq VARCHAR(300) NULL;
